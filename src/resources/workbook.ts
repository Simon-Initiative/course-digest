import * as Histogram from 'src/utils/histogram';
import { guid, ItemReference } from 'src/utils/common';
import {
  Resource,
  TorusResource,
  Summary,
  Page,
  defaultCollabSpaceDefinition,
} from './resource';
import {
  standardContentManipulations,
  processCodeblock,
  wrapContentInGroup,
  flagStandardContentWarnigns,
  failIfPresent,
} from './common';
import * as DOM from 'src/utils/dom';
import * as XML from 'src/utils/xml';
import { convertImageCodingActivities } from './image';
import { createObjective, defaultParameters } from './objectives';
import { maybe } from 'tsmonad';
import { convertBibliographyEntries } from './bibentry';
import { ProjectSummary } from 'src/project';

const validPurposes = {
  none: true,
  checkpoint: true,
  didigetthis: true,
  labactivity: true,
  learnbydoing: true,
  learnmore: true,
  manystudentswonder: true,
  myresponse: true,
  quiz: true,
  simulation: true,
  walkthrough: true,
  example: true,
};

function liftTitle($: any) {
  $('workbook_page').attr('title', $('head title').text());
  $('head').children().remove('title');
}

export function performRestructure($: any) {
  failIfPresent($, ['multipanel', 'dependency']);
  standardContentManipulations($);

  liftTitle($);
  DOM.rename($, 'wb\\:inline', 'activity_placeholder');
  DOM.rename($, 'inline', 'activity_placeholder');
  DOM.rename($, 'activity_link', 'a');
}

export class WorkbookPage extends Resource {
  restructurePreservingWhitespace($: any): any {
    processCodeblock($);
  }

  restructure($: any): any {
    performRestructure($);
  }

  flagContentWarnigns($: any, page: Page) {
    flagStandardContentWarnigns($, page);
  }

  translate(
    $: any,
    projectSummary: ProjectSummary
  ): Promise<(TorusResource | string)[]> {
    const page: Page = {
      type: 'Page',
      id: '',
      legacyPath: this.file,
      legacyId: '',
      title: '',
      tags: [],
      unresolvedReferences: [],
      content: {},
      isGraded: false,
      isSurvey: false,
      objectives: [],
      warnings: [],
      collabSpace: defaultCollabSpaceDefinition(),
    };

    this.flagContentWarnigns($, page);
    this.restructure($);

    // Convert the three forms of Xrefs into regular links
    $('xref').each((i: any, elem: any) => {
      const pageValue = $(elem).attr('page');
      const idref = $(elem).attr('idref');

      const hasPage = pageValue !== null && pageValue !== undefined;
      const hasIdref = idref !== null && idref !== undefined;

      // Type 1: page attr points to another page
      if (hasPage && !hasIdref) {
        $(elem).attr('idref', pageValue);
        page.unresolvedReferences.push(pageValue);

        // Type 2: page attr points to another page, idref to an item within that page
      } else if (!hasPage && hasIdref) {
        $(elem).attr('idref', pageValue);
        page.unresolvedReferences.push(pageValue);

        // Type 3: idref points to content item on this page
      } else if (hasPage && hasIdref) {
        $(elem).attr('idref', $('workbook_page').attr('id'));
      }
    });

    $('activity_placeholder').each((i: any, elem: any) => {
      page.unresolvedReferences.push($(elem).attr('idref'));
    });

    $('activity').each((i: any, elem: any) => {
      const idref = $(elem).attr('idref');
      const purpose = $(elem).attr('purpose');
      if (
        purpose !== null &&
        purpose !== undefined &&
        (validPurposes as any)[purpose] === undefined
      ) {
        $(elem).attr('purpose', 'none');
      }
      page.unresolvedReferences.push(idref);
    });

    DOM.rename($, 'activity', 'page_link');

    $('objref').each((i: any, elem: any) => {
      page.objectives.push($(elem).attr('idref'));
    });
    $('objref').remove();

    $('a').each((i: any, elem: any) => {
      const idref = $(elem).attr('idref');
      if (idref !== undefined && idref !== null) {
        page.unresolvedReferences.push(idref);
      }
    });

    const imageCodingActivities: any = [];
    let xml: string = convertImageCodingActivities($, imageCodingActivities);

    const bibEntries: Map<string, any> = new Map<string, any>();
    xml = convertBibliographyEntries($, bibEntries);

    const bibrefs: number[] = [];
    $('cite').each((i: any, elem: any) => {
      const entry = $(elem).attr('entry');
      const bibRef = bibEntries.get(entry);
      if (bibRef) {
        bibrefs.push(bibRef.id);
        $(elem).replaceWith(
          `<cite id="${entry}" bibref="${
            bibEntries.get(entry).id
          }">[citation]</cite>`
        );
      } else {
        $(elem).remove();
      }
    });

    const objectives: TorusResource[] = [];
    $('objectives objective').each((i: any, elem: any) => {
      const title = $(elem).text();
      const id = $(elem).attr('id');
      objectives.push(
        createObjective(this.file, id, null, title, defaultParameters())
      );
    });
    DOM.remove($, 'objectives');
    xml = $.html();

    return new Promise((resolve, _reject) => {
      XML.toJSON(xml, projectSummary, {
        p: true,
        em: true,
        li: true,
        td: true,
        material: true,
        anchor: true,
        translation: true,
        dt: true,
        dd: true,
      }).then((r: any) => {
        const model = introduceStructuredContent(
          r.children[0].children[1].children
        );

        page.id = r.children[0].id;
        page.legacyId = page.id;

        if (page.objectives.length === 0) {
          page.objectives = r.children[0].children[0].children.map(
            (o: any) => o.idref
          );
        }
        page.content = { model, bibrefs };
        page.title = r.children[0].title;

        resolve([
          page,
          ...imageCodingActivities,
          ...bibEntries.values(),
          ...objectives,
        ]);
      });
    });
  }

  summarize(): Promise<string | Summary> {
    const foundIds: ItemReference[] = [];
    const summary: Summary = {
      type: 'Summary',
      subType: 'WorkbookPage',
      elementHistogram: Histogram.create(),
      id: '',
      found: () => foundIds,
    };

    return new Promise((resolve, reject) => {
      XML.visit(this.file, (tag: string, attrs: Record<string, unknown>) => {
        Histogram.update(summary.elementHistogram, tag, attrs);

        if (tag === 'workbook_page') {
          summary.id = (attrs as any)['id'];
        }
        if (tag === 'wb:inline') {
          foundIds.push({ id: (attrs as any)['idref'] });
        }
        if (tag === 'xref') {
          foundIds.push({ id: (attrs as any)['idref'] });
        }
        if (tag === 'activity_link' || tag === 'activity') {
          foundIds.push({ id: (attrs as any)['idref'] });
        }
      })
        .then((_result) => {
          resolve(summary);
        })
        .catch((err) => reject(err));
    });
  }
}

// Restructures the initial JSON blob of XML conversion to be formulated
// as a collection of structured content or activity references.
//
// This takes all activity_placeholder references from top-level content and
// isolates them as stand alone elements, grouping together the
// surrounding content elements as instances of structured content. Any
// "example" elements are also converted to structured content.
//
// For instance, for the following collection of elements:
//
// { type: p, ...}
// { type: image, ...}
// { type: example, ...}
// { type: activity_placeholder ...}
// { type: p, ...}
//
// This function returns a content element collection that is reformulated as:
//
// { type: content, children: [{ type: p, ...}, {type: image, ...}]}
// { type: content, children: [{ ... ]}
// { type: activity_placeholder ...}
// { type: content, children: [{ type: p, ...}]}
//

const DEFAULT_SELECTION = {
  selection: {
    anchor: { offset: 0, path: [0, 0] },
    focus: { offset: 0, path: [1, 0] },
  },
};

const asStructured = (attrs: Record<string, unknown>) =>
  Object.assign({}, { type: 'content', id: guid() }, DEFAULT_SELECTION, attrs);

type Element = {
  type: string;
};

function isResourceGroup({ type }: Element) {
  switch (type) {
    case 'group':
    case 'example':
    case 'alternatives':
    case 'alternative':
      return true;
    default:
      return false;
  }
}

function startNewContent(u: any) {
  return (
    u.length === 0 ||
    u[u.length - 1].type === 'activity_placeholder' ||
    isResourceGroup(u[u.length - 1])
  );
}

export function introduceStructuredContent(content: Element[]): Element[] {
  return content.reduce((u: any, e: any) => {
    if (e.type === 'activity_placeholder') {
      return [...u, e];
    }

    if (e.type === 'example') {
      return [
        ...u,
        wrapContentInGroup(
          [
            asStructured({
              children: maybe(
                e.children.find((c: any) => c.type === 'title')
              ).caseOf({
                just: (title: any) => [
                  {
                    children: title.children,
                    id: guid(),
                    type: 'h2',
                  },
                  ...e.children.filter((c: any) => c.type !== 'title'),
                ],
                nothing: () => e.children,
              }),
            }),
          ],
          'example'
        ),
      ];
    }

    if (isResourceGroup(e)) {
      const withStructuredContent = Object.assign({}, e, {
        children: introduceStructuredContent(e.children),
      });

      return [...u, withStructuredContent];
    }

    if (startNewContent(u)) {
      return [...u, asStructured({ children: [e] })];
    }

    u[u.length - 1].children.push(e);

    return u;
  }, []);
}

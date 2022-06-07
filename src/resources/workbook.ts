import * as Histogram from '../utils/histogram';
import { ItemReference, guid } from '../utils/common';
import { Resource, TorusResource, Summary, Page } from './resource';
import {
  standardContentManipulations,
  processCodeblock,
  wrapContentInGroup,
} from './common';
import * as DOM from '../utils/dom';
import * as XML from '../utils/xml';
import { convertImageCodingActivities } from './image';
import { maybe } from 'tsmonad';

function liftTitle($: any) {
  $('workbook_page').attr('title', $('head title').text());
  $('head').children().remove('title');
}

export class WorkbookPage extends Resource {
  restructurePreservingWhitespace($: any): any {
    processCodeblock($);
  }

  restructure($: any): any {
    standardContentManipulations($);

    DOM.flattenNestedSections($);
    liftTitle($);
    DOM.rename($, 'wb\\:inline', 'activity_placeholder');
    DOM.rename($, 'inline', 'activity_placeholder');
    DOM.rename($, 'activity_link', 'a');
  }

  translate(originalXml: string, $: any): Promise<(TorusResource | string)[]> {
    const page: Page = {
      type: 'Page',
      id: '',
      originalFile: '',
      title: '',
      tags: [],
      unresolvedReferences: [],
      content: {},
      isGraded: false,
      objectives: [],
    };

    $('activity_placeholder').each((i: any, elem: any) => {
      page.unresolvedReferences.push($(elem).attr('idref'));
    });

    $('activity').each((i: any, elem: any) => {
      const idref = $(elem).attr('idref');
      page.unresolvedReferences.push(idref);
      $(elem).replaceWith(`<p><a idref="${idref}">Click to begin</a></p>`);
    });

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
    const xml: string = convertImageCodingActivities($, imageCodingActivities);

    return new Promise((resolve, _reject) => {
      XML.toJSON(xml, { p: true, em: true, li: true, td: true }).then(
        (r: any) => {
          const model = introduceStructuredContent(
            r.children[0].children[1].children
          );

          page.id = r.children[0].id;

          if (page.objectives === []) {
            page.objectives = r.children[0].children[0].children.map(
              (o: any) => o.idref
            );
          }
          page.content = { model };
          page.title = r.children[0].title;

          resolve([page, ...imageCodingActivities]);
        }
      );
    });
  }

  summarize(file: string): Promise<string | Summary> {
    const foundIds: ItemReference[] = [];
    const summary: Summary = {
      type: 'Summary',
      subType: 'WorkbookPage',
      elementHistogram: Histogram.create(),
      id: '',
      found: () => foundIds,
    };

    return new Promise((resolve, reject) => {
      XML.visit(file, (tag: string, attrs: Record<string, unknown>) => {
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
// This function returns a content element collection that is reforumulated as:
//
// { type: content, children: [{ type: p, ...}, {type: image, ...}]}
// { type: content, children: [{ ... ]}
// { type: activity_placeholder ...}
// { type: content, children: [{ type: p, ...}]}
//
const selection = {
  selection: {
    anchor: { offset: 0, path: [0, 0] },
    focus: { offset: 0, path: [1, 0] },
  },
};

function introduceStructuredContent(content: any) {
  const asStructured = (attrs: Record<string, unknown>) =>
    Object.assign({}, { type: 'content', id: guid() }, selection, attrs);

  const startNewContent = (u: any) =>
    u.length === 0 || u[u.length - 1].type === 'activity_placeholder';

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
    if (startNewContent(u)) {
      return [...u, asStructured({ children: [e] })];
    }
    u[u.length - 1].children.push(e);
    return u;
  }, []);
}

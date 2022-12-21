import { visit } from 'src/utils/xml';
import * as Histogram from 'src/utils/histogram';
import { ItemReference } from 'src/utils/common';
import { Resource, TorusResource, Summary, Page, defaultCollabSpaceDefinition } from './resource';
import { flagStandardContentWarnigns } from './common';
import * as WorkbookPage from './workbook';
import * as DOM from 'src/utils/dom';
import * as XML from 'src/utils/xml';
import { ProjectSummary } from 'src/project';

export function convertToWorkbook($: any) {
  DOM.rename($, 'discussion', 'workbook_page');
  $('workbook_page title').wrap('<head></head>');
  DOM.rename($, 'workbook_page description', 'body');
}

function readBooleanParameter($: any, e: string, param: string, defaultValue: boolean) {
  $(e).each((i: any, elem: any) => {
    const v = $(elem).attr(param);
    
    if (v === null || v === undefined) {
    return defaultValue;
    }
    return v === 'true';
  });
  return defaultValue;
}

function readIntParameter($: any, e: string, param: string, defaultValue: number) {
    $(e).each((i: any, elem: any) => {
      const v = $(elem).attr(param);
      
      if (v === null || v === undefined) {
      return defaultValue;
      }
      return parseInt(v, 10);
    });
    return defaultValue;
  }

export class Discussion extends Resource {
  
  flagContentWarnigns($: any, page: Page) {
    flagStandardContentWarnigns($, page);
  }

  restructure($: any): any {
    // We simplify the handling of the differing Summative and Formative models
    // by converting the more restrictive Summative to the more flexible Formative
    // model.  This allows then one set of restructuring code to exist.
    convertToWorkbook($);
    WorkbookPage.performRestructure($);
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
      collabSpace: defaultCollabSpaceDefinition()
    };

    this.restructure($);
    

    $('a').each((i: any, elem: any) => {
      const idref = $(elem).attr('idref');
      if (idref !== undefined && idref !== null) {
        page.unresolvedReferences.push(idref);
      }
    });

    const xml = $.html();

    return new Promise((resolve, _reject) => {
      XML.toJSON(xml, projectSummary, {
        p: true,
        em: true,
        li: true,
        td: true,
        material: true,
        dt: true,
        dd: true,
      }).then((r: any) => {
        const model = WorkbookPage.introduceStructuredContent(
          r.children[0].children[1].children
        );

        page.id = r.children[0].id;
        page.legacyId = page.id;
        page.content = { model, bibrefs: [] };
        page.title = r.children[0].title;

        // Override the default collab space configuration
        page.collabSpace.status = 'active';
        page.collabSpace.auto_accept = readBooleanParameter($, 'options', 'auto_accept', true);
        page.collabSpace.threaded = readBooleanParameter($, 'options', 'threaded', true);
        page.collabSpace.participation_min_posts = readIntParameter($, 'requirements', 'posts', 0);
        page.collabSpace.participation_min_replies = readIntParameter($, 'requirements', 'replies', 0);

        resolve([page]);
      });
    });
  }

  summarize(): Promise<string | Summary> {
    const foundIds: ItemReference[] = [];
    const summary: Summary = {
      type: 'Summary',
      subType: 'Discussion',
      elementHistogram: Histogram.create(),
      id: '',
      found: () => foundIds,
    };

    return new Promise((resolve, reject) => {
      visit(this.file, (tag: string, attrs: Record<string, unknown>) => {
        Histogram.update(summary.elementHistogram, tag, attrs);

        if (tag === 'discussion') {
          summary.id = (attrs as any)['id'];
        }
        
      })
        .then((_result) => {
          resolve(summary);
        })
        .catch((err) => reject(err));
    });
  }
}

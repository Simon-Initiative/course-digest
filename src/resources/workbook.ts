import * as Histogram from '../utils/histogram';
import { ItemReference, guid } from '../utils/common';
import { Resource, TorusResource, Summary, Page } from './resource';
const cheerio = require('cheerio');
import * as DOM from '../utils/dom';
import * as XML from '../utils/xml';

function liftTitle($: any) {
  $('workbook_page').attr('title', $('head title').text());
  $('head').children().remove('title');
}


export class WorkbookPage extends Resource {

  restructure($: any) : any {
    DOM.flattenNestedSections($);
    liftTitle($);
    DOM.removeSelfClosing($);
    
    DOM.rename($, 'wb\\:inline', 'activity_placeholder');
    DOM.rename($, 'activity', 'activity_placeholder');
    DOM.rename($, 'activity_link', 'link');

  }

  translate(xml: string, $: any) : Promise<(TorusResource | string)[]> {

    const page : Page = {
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

    $('link').each((i: any, elem: any) => {
      const idref = $(elem).attr('idref');
      if (idref !== undefined && idref !== null) {
        page.unresolvedReferences.push(idref);
      }
    });


    return new Promise((resolve, reject) => {
      XML.toJSON(xml).then((r: any) => {

        const model = introduceStructuredContent(r.children[0].children[1].children)

        page.id = r.children[0].id;
        page.objectives = r.children[0].children[0].children.map((o: any) => o.idref);
        page.content = { model };
        page.title = r.children[0].title;

        resolve([page]);
      });
    });
  }

  summarize(file: string): Promise<string | Summary> {

    const foundIds: ItemReference[] = [];
    const summary : Summary = {
      type: 'Summary',
      subType: 'WorkbookPage',
      elementHistogram: Histogram.create(),
      id: '',
      found: () => foundIds,
    };

    return new Promise((resolve, reject) => {

      XML.visit(file, (tag: string, attrs: Object) => {

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
      .then((result) => {
        resolve(summary);
      })
      .catch(err => reject(err));
    });
  }

}


// Restructures the initial JSON blob of XML conversion to be formulated
// as a collection of structured content or activity references. 
//
// This takes all activity_placeholder references from top-level content and
// isolates them as stand alone elements, grouping together the
// surrounding content elements as instances of structured content.
// 
// For instance, for the following collection of elements:
//
// { type: p, ...}
// { type: image, ...}
// { type: activity_placeholder ...}
// { type: p, ...}
//
// This function mutates the content element collection to look like:
//
// { type: content, children: [{ type: p, ...}, {type: image, ...}]}
// { type: activity_placeholder ...}
// { type: content, children: [{ type: p, ...}]}
//
function introduceStructuredContent(content: any) {

  const asStructured = (o: any) => ({ type: 'content', id: guid(), children: [o] });
  
  return content.reduce(
    (u: any, e: any) => {

      if (e.type === 'activity_placeholder') {
        return [...u, e];
      } else {
        if (u.length === 0 || u[u.length - 1].type === 'activity_placeholder') {
          return [...u, asStructured(e)];
        } else {
          u[u.length - 1].children.push(e);
          return u;
        }
      }
    },
    [],
  );
}


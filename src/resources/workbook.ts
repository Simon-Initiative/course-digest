import * as Histogram from '../utils/histogram';
import { ItemReference } from '../utils/common';
import { Resource, TorusResource, Summary, Page } from './resource';
import * as DOM from '../utils/dom';
import * as XML from '../utils/xml';

function liftTitle($: any) {
  $('workbook_page').attr('title', $('head title').text());
  $('head').children().remove('title');
}

function removeInlines($: any) {
  $('wb\\:inline').remove();
}
function removeActivityLinks($: any) {
  $('activity_link').replaceWith('(removed activity link)');
}

export class WorkbookPage extends Resource {

  restructure($: any) : any {
    DOM.flattenNestedSections($);
    liftTitle($);
    DOM.removeSelfClosing($);
    removeInlines($);
    removeActivityLinks($);
  }

  translate(xml: string) : Promise<(TorusResource | string)[]> {

    const page : Page = {
      type: 'Page',
      id: '',
      originalFile: '',
      title: '',
      tags: [],
      unresolvedReferences: [],
      content: [],
      isGraded: false,
      objectives: [],
    };

    return new Promise((resolve, reject) => {
      XML.toJSON(xml).then((r: any) => {

        page.id = r.children[0].id;
        page.objectives = r.children[0].children[0].children.map((o: any) => o.idref);
        page.content = { model: r.children[0].children[1].children };
        page.title = r.children[0].title;

        resolve([page]);
      });
    });
  }

  summarize(file: string): Promise<string | Summary> {

    const foundIds: ItemReference[] = [];
    const summary : Summary = {
      type: 'Summary',
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


import { visit } from '../utils/xml';
import * as Histogram from '../utils/histogram';
import { ItemReference, guid } from '../utils/common';
import { Resource, TorusResource, Summary, Page } from './resource';
import { standardContentManipulations, processCodeblock } from './common';
import * as Formative from './formative';
import * as DOM from '../utils/dom';
import * as XML from '../utils/xml';


export function convertToFormative($: any) {

  $('multiple_choice').each((i: any, item: any) => {
    DOM.moveAttrToChildren($, item, "select", "input");
  });

  $('text').each((i: any, item: any) => {
    // have to move all "whitespace" and "case_sensitive" down to inputs
    DOM.moveAttrToChildren($, item, "whitespace", "input");
    DOM.moveAttrToChildren($, item, "case_sensitive", "input");
  });

  DOM.rename($, 'multiple_choice input', 'mc_temp');
  DOM.rename($, 'ordering input', 'o_temp');
  DOM.rename($, 'short_answer input', 'sa_temp');
  DOM.rename($, 'fill_in_the_blank input', 'f_temp');
  DOM.rename($, 'numeric input', 'n_temp');
  DOM.rename($, 'text input', 't_temp');
  DOM.rename($, 'essay input', 'e_temp');
  DOM.rename($, 'image_hotspot input', 'i_temp');

  DOM.rename($, 'multiple_choice', 'question');
  DOM.rename($, 'ordering', 'question');
  DOM.rename($, 'short_answer', 'question');
  DOM.rename($, 'fill_in_the_blank', 'question');
  DOM.rename($, 'numeric', 'question');
  DOM.rename($, 'text', 'question');
  DOM.rename($, 'essay', 'question');
  DOM.rename($, 'image_hotspot', 'question');
  
  DOM.rename($, 'mc_temp', 'multiple_choice');
  DOM.rename($, 'o_temp', 'ordering');
  DOM.rename($, 'sa_temp', 'short_answer');
  DOM.rename($, 'f_temp', 'fill_in_the_blank');
  DOM.rename($, 'n_temp', 'numeric');
  DOM.rename($, 't_temp', 'text');
  DOM.rename($, 'e_temp', 'short_answer');
  DOM.rename($, 'i_temp', 'image_hotspot');


}


export class Summative extends Resource {

  restructurePreservingWhitespace($: any): any {
    processCodeblock($);
  }

  restructure($: any): any {
    // We simplify the handling of the differing Summative and Formative models
    // by converting the more restrictive Summative to the more flexible Formative
    // model.  This alllows then one set of restructuring code to exist.
    convertToFormative($);
    Formative.performRestructure($);
  }

  translate(xml: string, $: any): Promise<(TorusResource | string)[]> {

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

    $('a').each((i: any, elem: any) => {
      const idref = $(elem).attr('idref');
      if (idref !== undefined && idref !== null) {
        page.unresolvedReferences.push(idref);
      }
    });

    return new Promise((resolve, reject) => {
      XML.toJSON(xml, { p: true, em: true, li: true, td: true }).then((r: any) => {
        const items: any = [];
        const legacyId = r.id;

        const handleNestableItems = (item: any, pageId: string | null) => {
          if (item.type === 'question') {
            const subType = Formative.determineSubType(item);
            const activity = Formative.toActivity(item, subType, legacyId);
            items.push(activity);

            const a = {
              type: "activity-reference",
              activity_id: activity.id,
              purpose: "none",
            } as any;

            if (pageId !== null) {
              a.page = pageId;
            }

            return a; 

          } else if (item.type === 'selection') {
            
            if (item.children.length > 0) {

              // track the reference for the tag that will power this selection in Torus
              let tagId: any = null;  

              const child = item.children[0];
              if (child.type === 'pool') {
                tagId = child.id;
                tagId = tagId === null || tagId === undefined ? guid() : tagId;
                
                child.children.forEach((c: any) => {
                  if (c.type !== 'title' && c.type !== 'content') {
                    const subType = Formative.determineSubType(c);
                    const pooledActivity = Formative.toActivity(c, subType, legacyId);
                    pooledActivity.tags = [tagId];
                    pooledActivity.scope = 'banked';
                    items.push(pooledActivity);
                  }

                });


              } else if (child.type === 'pool_ref') {
                tagId = child.idref;
                console.log('pool_ref' + tagId);
                page.unresolvedReferences.push(tagId);
              }

              const a = {
                type: "selection",
                logic: {
                  conditions: {
                    operator: 'all',
                    children: [{
                      fact: 'tags',
                      operator: 'equals',
                      value: [tagId],
                    }],
                  },            
                },
                count: item.count,
                purpose: "none",
              } as any;


              // If this activity reference is within a specific page, track that. 
              if (pageId !== null) {
                a.page = pageId;
              }

              return a;

            }

          } else if (item.type === 'introduction' || item.type === 'conclusion' || item.type === 'content') {

            const content : any = Object.assign({}, { type: 'content', purpose: 'none', id: guid() }, {children: item.children});
            if (pageId !== null) {
              content.page = pageId;
            }

            return content;

          }
        }

        const model = r.children[0].children
          .reduce((previous: any, item: any) => {
            if (item.type === 'title') {
              page.title = item.children[0].text;
            }
            else if (item.type === 'page') {
              let pageId: string | null = null;
              if (item.id !== undefined) {
                pageId = item.id;
              } else {
                pageId = guid();
              }

              return [...previous, ...item.children.filter((c: any) => c.type !== 'title')
                .map((c: any) => handleNestableItems(c, pageId))];

            } else {
              return [...previous, handleNestableItems(item, null)];
            }
            return previous;

          }, [])
          .filter((e: any) => e !== undefined);

        page.id = r.children[0].id;
        page.objectives = r.children[0].children[0].children.map((o: any) => o.idref);
        page.content = { model };
        page.isGraded = true;

        resolve([page, ...items]);
      });
    });

  }

  summarize(file: string): Promise<string | Summary> {

    const foundIds: ItemReference[] = [];
    const summary: Summary = {
      type: 'Summary',
      subType: 'Summative',
      elementHistogram: Histogram.create(),
      id: '',
      found: () => foundIds,
    };

    return new Promise((resolve, reject) => {

      visit(file, (tag: string, attrs: Object) => {
        Histogram.update(summary.elementHistogram, tag, attrs);

        if (tag === 'assessment') {
          summary.id = (attrs as any)['id'];
        }
        if (tag === 'poolref') {
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

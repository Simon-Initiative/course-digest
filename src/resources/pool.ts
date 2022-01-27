
import { visit } from '../utils/xml';
import * as Histogram from '../utils/histogram';
import { guid } from '../utils/common';
import { Resource, TorusResource, Summary } from './resource';
import * as Formative from './formative';
import * as Summative from './summative';
import * as DOM from '../utils/dom';
import * as XML from '../utils/xml';

export class Pool extends Resource {

  restructure($: any) : any {
    Summative.convertToFormative($);
    Formative.performRestructure($);
  }

  
  translate(xml: string, $: any): Promise<(TorusResource | string)[]> {

    return new Promise((resolve, reject) => {
      XML.toJSON(xml, { p: true, em: true, li: true, td: true }).then((r: any) => {
        const items: any = [];
       
        const legacyId = r.children[0].id;
        const model = r.children
          .map((item: any) => {

            if (item.type === 'pool') {
              console.log('HEREEEEEE')
              const tagId = item.id;
                  
              item.children.forEach((c: any) => {
                
                if (c.type !== 'title' && c.type !== 'content') {
                  const subType = Formative.determineSubType(c);
                  const pooledActivity = Formative.toActivity(c, subType, legacyId);
                  pooledActivity.tags = [tagId];
                  pooledActivity.scope = 'banked';
                  items.push(pooledActivity);
                }

              });
            }
          });

        resolve(items);
      });
    });

  }
  summarize(file: string): Promise<string | Summary> {

    const summary : Summary = {
      type: 'Summary',
      subType: 'SummativePool',
      elementHistogram: Histogram.create(),
      id: '',
      found: () => [],
    };

    return new Promise((resolve, reject) => {

      visit(file, (tag: string, attrs: Object) => {
        Histogram.update(summary.elementHistogram, tag, attrs);

        if (tag === 'pool') {
          summary.id = (attrs as any)['id'];
        }

      })
      .then((result) => {
        resolve(summary);
      })
      .catch(err => reject(err));
    });
  }
}

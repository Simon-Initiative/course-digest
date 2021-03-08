
import { visit } from '../utils/xml';
import * as Histogram from '../utils/histogram';
import { ItemReference } from '../utils/common';
import { Resource, TorusResource, Summary } from './resource';

export class Summative extends Resource {

  restructure($: any) : any {

  }

  translate(xml: string, $: any) : Promise<(TorusResource | string)[]> {
    return Promise.resolve(['']);
  }

  summarize(file: string): Promise<string | Summary> {

    const foundIds: ItemReference[] = [];
    const summary : Summary = {
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

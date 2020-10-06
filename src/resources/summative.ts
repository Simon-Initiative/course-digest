
import { visit } from '../utils/xml';
import * as Histogram from '../utils/histogram';
import { ItemReference } from '../utils/common';
import { Resource, TorusResource, Summary } from './resource';

export class Summative extends Resource {

  toTorus(file: string): Promise<string | TorusResource> {
    throw new Error('Method not implemented.');
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

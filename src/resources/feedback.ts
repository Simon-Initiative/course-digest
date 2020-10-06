
import { visit } from '../utils/xml';
import * as Histogram from '../utils/histogram';
import { Resource, TorusResource, Summary } from './resource';

export class Feedback extends Resource {

  toTorus(file: string): Promise<string | TorusResource> {
    throw new Error('Method not implemented.');
  }

  summarize(file: string): Promise<string | Summary> {

    const summary : Summary = {
      type: 'Summary',
      elementHistogram: Histogram.create(),
      id: '',
      found: () => [],
    };

    return new Promise((resolve, reject) => {

      visit(file, (tag: string, attrs: Object) => {
        Histogram.update(summary.elementHistogram, tag, attrs);
        if (tag === 'feedback') {
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


import { visit } from '../utils/xml';
import * as Histogram from '../utils/histogram';
import { HasHistogram } from './common';
import { Resource, TorusResource, Summary } from './resource';

export class Other extends Resource {

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
      })
      .then((result) => {
        resolve(summary);
      })
      .catch(err => reject(err));
    });
  }
}

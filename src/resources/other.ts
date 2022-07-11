import { visit } from '../utils/xml';
import * as Histogram from '../utils/histogram';
import { Resource, TorusResource, Summary } from './resource';

export class Other extends Resource {
  restructure(_$: any): any {
    return;
  }

  translate(_xml: string, _$: any): Promise<(TorusResource | string)[]> {
    return Promise.resolve([
      {
        type: 'Unknown',
        id: '',
        originalFile: '',
        title: '',
        tags: [],
        unresolvedReferences: [],
        content: {},
        objectives: [],
      },
    ]);
  }

  summarize(): Promise<string | Summary> {
    const summary: Summary = {
      type: 'Summary',
      subType: 'Other',
      elementHistogram: Histogram.create(),
      id: '',
      found: () => [],
    };

    return new Promise((resolve, reject) => {
      visit(this.file, (tag: string, attrs: Record<string, unknown>) => {
        Histogram.update(summary.elementHistogram, tag, attrs);
      })
        .then((_result) => {
          resolve(summary);
        })
        .catch((err) => reject(err));
    });
  }
}

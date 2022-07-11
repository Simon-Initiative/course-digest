import { visit } from 'src/utils/xml';
import * as Histogram from 'src/utils/histogram';
import { Resource, TorusResource, Summary } from './resource';

export class Feedback extends Resource {
  restructure(_$: any): any {
    return;
  }

  translate(_xml: string, _$: any): Promise<(TorusResource | string)[]> {
    return Promise.resolve(['']);
  }

  summarize(): Promise<string | Summary> {
    const summary: Summary = {
      type: 'Summary',
      subType: 'Feedback',
      elementHistogram: Histogram.create(),
      id: '',
      found: () => [],
    };

    return new Promise((resolve, reject) => {
      visit(this.file, (tag: string, attrs: Record<string, unknown>) => {
        Histogram.update(summary.elementHistogram, tag, attrs);
        if (tag === 'feedback') {
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

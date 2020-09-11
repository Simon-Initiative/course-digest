
import { visit } from '../utils/xml';
import * as Histogram from '../utils/histogram';
import { HasHistogram } from './common';

export interface PoolSummary extends HasHistogram {
  type: 'PoolSummary';
}

// Summarize an organization
export function summarize(file: string) : Promise<PoolSummary | string> {

  const summary : PoolSummary = {
    type: 'PoolSummary',
    elementHistogram: Histogram.create(),
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

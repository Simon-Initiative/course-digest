
import { visit } from '../utils/xml';
import * as Histogram from '../utils/histogram';
import { ItemReference } from '../utils/common';
import { HasHistogram } from './common';

export interface FormativeSummary extends HasHistogram {
  type: 'FormativeSummary';
}

// Summarize an organization
export function summarize(file: string) : Promise<FormativeSummary | string> {

  const foundIds: ItemReference[] = [];

  const summary : FormativeSummary = {
    type: 'FormativeSummary',
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

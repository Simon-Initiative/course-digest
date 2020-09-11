
import { visit } from '../utils/xml';
import * as Histogram from '../utils/histogram';
import { HasHistogram } from './common';

export interface FeedbackSummary extends HasHistogram {
  type: 'FeedbackSummary';
}

// Summarize an organization
export function summarize(file: string) : Promise<FeedbackSummary | string> {

  const summary : FeedbackSummary = {
    type: 'FeedbackSummary',
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

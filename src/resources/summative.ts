
import { visit } from '../utils/xml';
import * as Histogram from '../utils/histogram';
import { ItemReference } from '../utils/common';

import { HasReferences, HasHistogram } from './common';

export interface SummativeSummary extends HasReferences, HasHistogram {
  type: 'SummativeSummary';
}

// Summarize an organization
export function summarize(file: string) : Promise<SummativeSummary | string> {

  const foundIds: ItemReference[] = [];

  const summary : SummativeSummary = {
    type: 'SummativeSummary',
    found: () => foundIds,
    elementHistogram: Histogram.create(),
  };

  return new Promise((resolve, reject) => {

    visit(file, (tag: string, attrs: Object) => {
      Histogram.update(summary.elementHistogram, tag, attrs);

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

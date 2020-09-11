
import { visit } from '../utils/xml';
import * as Histogram from '../utils/histogram';
import { ItemReference } from '../utils/common';
import { HasReferences, HasHistogram } from './common';

export interface WorkbookPageSummary extends HasReferences, HasHistogram {
  type: 'WorkbookPageSummary';
}

// Summarize an organization
export function summarize(file: string) : Promise<WorkbookPageSummary | string> {

  const foundIds: ItemReference[] = [];

  const summary : WorkbookPageSummary = {
    type: 'WorkbookPageSummary',
    found: () => foundIds,
    elementHistogram: Histogram.create(),
  };

  return new Promise((resolve, reject) => {

    visit(file, (tag: string, attrs: Object) => {

      Histogram.update(summary.elementHistogram, tag, attrs);

      if (tag === 'wb:inline') {
        foundIds.push({ id: (attrs as any)['idref'] });
      }
      if (tag === 'xref') {
        foundIds.push({ id: (attrs as any)['idref'] });
      }
      if (tag === 'activity_link' || tag === 'activity') {
        foundIds.push({ id: (attrs as any)['idref'] });
      }
    })
    .then((result) => {
      resolve(summary);
    })
    .catch(err => reject(err));
  });
}

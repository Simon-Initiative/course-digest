
import { visit } from '../utils/xml';
import * as Histogram from '../utils/histogram';
import { ItemReference } from '../utils/common';

export type WorkbookPageSummary = {
  type: 'WorkbookPageSummary',
  inlines: ItemReference[],
  xrefs: ItemReference[],
  activities: ItemReference[],
  elementHistogram: Histogram.ElementHistogram,
};

// Summarize an organization
export function summarize(file: string) : Promise<WorkbookPageSummary | string> {

  const summary : WorkbookPageSummary = {
    type: 'WorkbookPageSummary',
    inlines: [],
    xrefs: [],
    activities: [],
    elementHistogram: Histogram.create(),
  };

  return new Promise((resolve, reject) => {

    visit(file, (tag: string, attrs: Object) => {

      Histogram.update(summary.elementHistogram, tag, attrs);

      if (tag === 'wb:inline') {
        summary.inlines.push({ id: (attrs as any)['idref'] });
      }
      if (tag === 'wb:xref') {
        summary.xrefs.push({ id: (attrs as any)['idref'] });
      }
      if (tag === 'activity_link' || tag === 'activity') {
        summary.activities.push({ id: (attrs as any)['idref'] });
      }
    })
    .then((result) => {
      resolve(summary);
    })
    .catch(err => reject(err));
  });
}

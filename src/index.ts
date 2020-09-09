import * as Resources from './resources/resource';
import * as Orgs from './resources/organization';
import * as Histogram from './utils/histogram';
import { executeSerially } from './utils/common';
import { WorkbookPageSummary } from 'resources/workbook';

const directory = process.argv[2];

type MissingResource = {
  type: 'MissingResource',
  id: string,
};

type SummaryResult = Resources.Summary | MissingResource;

Resources.mapResources(directory)
.then((resourceMap) => {

  Orgs.locate(directory)
  .then((orgs) => {
    return Orgs.summarize(orgs[0]);
  })
  .then((summary: Orgs.OrganizationSummary) => {

    const summarizers = summary.itemReferences.map((ref) => {
      const path = resourceMap[ref.id];

      if (path !== undefined) {
        return () => Resources.summarize(path);
      }
      return () => Promise.resolve({ type: 'MissingResource', id: ref.id });
    });

    executeSerially(summarizers)
    .then((summaries: SummaryResult[]) => {

      const wbHistogram = summaries
      .filter(s => s.type === 'WorkbookPageSummary')
      .map(summary => (summary as WorkbookPageSummary).elementHistogram)
      .reduce((h, c) => Histogram.merge(h, c), Histogram.create());

      console.log(wbHistogram);
    });

  });

});

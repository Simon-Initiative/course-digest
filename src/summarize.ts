import { Summary, ResourceType } from './resources/resource';
import { determineResourceType, create } from './resources/create';
import { MissingResource, executeSerially, ItemReference } from './utils/common';
import { ResourceMap, mapResources } from './utils/resource_mapping';
import * as Histogram from './utils/histogram';

export type SummaryResult = Summary | MissingResource;

export function summarize(file: string): Promise<Summary | string> {

  return new Promise((resolve, reject) => {
    determineResourceType(file)
    .then((t: ResourceType) => {
      resolve(create(t).summarize(file));
    });
  });
}

// Bucket and merge the histograms by resource type
export function bucketHistograms(
  summaries: SummaryResult[]) : Promise<Histogram.BucketedHistograms> {

  return summaries
  .filter(s => s.type !== 'MissingResource')
  .reduce(
    (h, c) => {

      if (h[c.type] === undefined) {
        h[c.type] = (c as any).elementHistogram;
      } else {
        h[c.type] = Histogram.merge(h[c.type], (c as any).elementHistogram);
      }
      return h;
    },
    {} as any);
}

export function outputSummary(
  outputDirectory: string,
  resourceSummaries: SummaryResult[],
  bucketedHistograms: Histogram.BucketedHistograms) {

  return executeSerially([() => Histogram.outputCSV(outputDirectory, bucketedHistograms)]);
}

import { Summary, ResourceType } from './resources/resource';
import { determineResourceType, create } from './resources/create';
import { MissingResource, executeSerially } from './utils/common';
import * as Histogram from './utils/histogram';

export type SummaryResult = Summary | MissingResource;

export function summarize(file: string): Promise<Summary | string> {
  return new Promise((resolve, _reject) => {
    determineResourceType(file).then((t: ResourceType) => {
      resolve(create(t, file, false).summarize());
    });
  });
}

// Bucket and merge the histograms by resource type
export function bucketHistograms(
  summaries: SummaryResult[]
): Promise<Histogram.BucketedHistograms> {
  return summaries
    .filter((s) => s.type !== 'MissingResource')
    .reduce((h, c) => {
      if (c.type !== 'MissingResource') {
        if (h[c.subType] === undefined) {
          h[c.subType] = (c as any).elementHistogram;
        } else {
          h[c.subType] = Histogram.merge(
            h[c.subType],
            (c as any).elementHistogram
          );
        }
      }

      return h;
    }, {} as any);
}

export function outputSummary(
  outputDirectory: string,
  resourceSummaries: SummaryResult[],
  bucketedHistograms: Histogram.BucketedHistograms
) {
  return executeSerially([
    () => Histogram.outputCSV(outputDirectory, bucketedHistograms),
  ]);
}

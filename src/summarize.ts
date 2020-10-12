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

// Recursive helper to read a collection of resources and produce summaries.
// Resources can reference other resources in a chain (e.g. Workbook page ->
// Assessment -> Pool) so this function operates on resource summarization
// asynchronously, in batches, and then recursively follows
// references that it finds in each batch of summaries.  We need to be careful
// to avoid circular references and processing duplicates so we track the references
// that we have seen along the way.
function innerProduceSummaries(
  resolve: any, reject: any,
  itemReferences: ItemReference[],
  resourceMap: ResourceMap,
  seenReferences: { [index: string] : boolean },
  allSummaries: SummaryResult[]) {

  const doSummary = (ref: ItemReference) => {
    const path = resourceMap[ref.id];
    seenReferences[ref.id] = true;
    if (path !== undefined) {
      return () => summarize(path);
    }
    return () => Promise.resolve({ type: 'MissingResource', id: ref.id });
  };

  const summarizers = itemReferences.map((ref: ItemReference) => doSummary(ref));

  executeSerially(summarizers)
  .then((results: SummaryResult[]) => {

    // From this round of results, collect any new references that
    // we need to follow
    const toFollow: ItemReference[] = [];
    results.forEach((r: SummaryResult) => {
      allSummaries.push(r);

      if ((r as any).found !== undefined) {
        (r as any).found().forEach((ref: ItemReference) => {
          const id = ref.id;
          if (seenReferences[id] === undefined) {
            toFollow.push(ref);
            seenReferences[id] = true;
          }
        });
      }
    });

    // See if we are done or if there is another round of references
    // to follow and summarize
    if (toFollow.length === 0) {
      resolve(allSummaries);
    } else {
      innerProduceSummaries(resolve, reject, toFollow, resourceMap, seenReferences, allSummaries);
    }

  });
}

export function produceResourceSummaries(
  itemReferences: ItemReference[], resourceMap: ResourceMap) : Promise<SummaryResult[]> {

  return new Promise((resolve, reject) => {
    innerProduceSummaries(resolve, reject, itemReferences, resourceMap, {}, []);
  });

}
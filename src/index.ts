import * as Resources from './resources/resource';
import * as Orgs from './resources/organization';
import * as Histogram from './utils/histogram';
import { executeSerially, ItemReference } from './utils/common';

type MissingResource = {
  type: 'MissingResource',
  id: string,
};

type SummaryResult = Resources.Summary | MissingResource;

// Bucket and merge the histograms by resource type
function bucketHistograms(summaries: SummaryResult[]) : Promise<Histogram.BucketedHistograms> {

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

function outputDigest(
  outputDirectory: string,
  resourceSummaries: SummaryResult[],
  bucketedHistograms: Histogram.BucketedHistograms) {

  return executeSerially([() => Histogram.outputCSV(outputDirectory, bucketedHistograms)]);
}

function produceResourceSummaries(
  itemReferences: ItemReference[], resourceMap: Resources.ResourceMap) : Promise<SummaryResult[]> {

  const summarizers = itemReferences.map((ref) => {
    const path = resourceMap[ref.id];

    if (path !== undefined) {
      return () => Resources.summarize(path);
    }
    return () => Promise.resolve({ type: 'MissingResource', id: ref.id });
  });

  return executeSerially(summarizers);
}

function collectOrgItemReferences(packageDirectory: string, id: string = '') {

  return new Promise((resolve, reject) => {
    Orgs.locate(packageDirectory)
    .then((orgs) => {

      executeSerially(orgs.map(o => () => Orgs.summarize(o)))
      .then((results: (string | Orgs.OrganizationSummary)[]) => {

        const seenReferences = {} as any;
        const references: ItemReference[] = [];

        results.forEach((r) => {
          if (typeof(r) !== 'string' && (id === '' || id === r.id)) {
            r.itemReferences.forEach((i) => {

              if (seenReferences[i.id] === undefined) {
                seenReferences[i.id] = true;
                references.push(i);
              }

            });
          }
        });

        resolve(references);
      });
    });
  });

}

// Helper to execute a function that returns a promise, and resolve it
// as an element in an array that includes any number of other times. This
// allows an easy way to 'pass along' some number of values through a
// promise change to keep them in scope.
function alongWith(promiseFunc: any, ...along: any) {
  return new Promise((resolve, reject) => {
    promiseFunc().then((result: any) => resolve([...along, result])).catch((e: any) => reject(e));
  });
}

function main() {

  const packageDirectory = process.argv[2];
  const outputDirectory = process.argv[3];
  const specificOrg = process.argv.length === 5 ? process.argv[4] : '';

  executeSerially([
    () => Resources.mapResources(packageDirectory),
    () => collectOrgItemReferences(packageDirectory, specificOrg)])
  .then((results: any) => produceResourceSummaries(results.slice(1), results[0]))
  .then((summaries: SummaryResult[]) => alongWith(
    () => Promise.resolve(bucketHistograms(summaries)), summaries))
  .then((results: any[]) => outputDigest(outputDirectory, results[0], results[1]))
  .then((results: any) => console.log('Done!'))
  .catch((err: any) => console.log(err));

}

main();

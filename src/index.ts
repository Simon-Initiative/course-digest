import * as Resources from './resources/resource';
import * as Orgs from './resources/organization';
import * as Histogram from './utils/histogram';
import { executeSerially, ItemReference } from './utils/common';
import { ResourceMap, mapResources } from './utils/resource_mapping';
import { summarize } from './summarize';

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

function produceResourceSummaries(
  itemReferences: ItemReference[], resourceMap: ResourceMap) : Promise<SummaryResult[]> {

  return new Promise((resolve, reject) => {
    innerProduceSummaries(resolve, reject, itemReferences, resourceMap, {}, []);
  });

}

function collectOrgItemReferences(packageDirectory: string, id: string = '') {

  return new Promise((resolve, reject) => {
    Orgs.locate(packageDirectory)
    .then((orgs) => {

      executeSerially(orgs.map(file => () => {
        const o = new Orgs.Organization();
        return o.summarize(file);
      }))
      .then((results: (string | Resources.Summary)[]) => {

        const seenReferences = {} as any;
        const references: ItemReference[] = [];

        results.forEach((r) => {
          if (typeof(r) !== 'string' && (id === '' || id === r.id)) {
            r.found().forEach((i) => {

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

function summaryAction() {

  const packageDirectory = process.argv[3];
  const outputDirectory = process.argv[4];
  const specificOrg = process.argv.length === 6 ? process.argv[5] : '';

  executeSerially([
    () => mapResources(packageDirectory),
    () => collectOrgItemReferences(packageDirectory, specificOrg)])
  .then((results: any) => produceResourceSummaries(results.slice(1), results[0]))
  .then((summaries: SummaryResult[]) => alongWith(
    () => Promise.resolve(bucketHistograms(summaries)), summaries))
  .then((results: any[]) => outputDigest(outputDirectory, results[0], results[1]))
  .then((results: any) => console.log('Done!'))
  .catch((err: any) => console.log(err));
}

function convertAction() {

}

function helpAction() {
  console.log('OLI Legacy Course Package Digest Tool');
  console.log('-------------------------------------\n');
  console.log('Supported actions:\n');
  console.log('Summarizing a course package current OLI DTD element usage:');
  console.log('npm run start summarize <course package dir> <outdir dir> [<organization id>]\n');
  console.log('Convert an OLI course package to the Torus digest format:');
  console.log('npm run start convert <course package dir> <outdir dir> [<organization id>]\n');
}

function main() {

  const action = process.argv[2];

  if (action === 'summarize') {
    summaryAction();
  } else if (action === 'convert') {
    convertAction();
  } else {
    helpAction();
  }
}

main();

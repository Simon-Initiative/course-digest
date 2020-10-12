import * as Resources from './resources/resource';
import * as Orgs from './resources/organization';

import { executeSerially, ItemReference, MissingResource } from './utils/common';
import { mapResources } from './utils/resource_mapping';
import * as Summarize from './summarize';

type ConversionResult = Resources.TorusResource | MissingResource;

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
  .then((results: any) => Summarize.produceResourceSummaries(results.slice(1), results[0]))
  .then((summaries: Summarize.SummaryResult[]) => alongWith(
    () => Promise.resolve(Summarize.bucketHistograms(summaries)), summaries))
  .then((results: any[]) => Summarize.outputSummary(outputDirectory, results[0], results[1]))
  .then((results: any) => console.log('Done!'))
  .catch((err: any) => console.log(err));
}

function convertAction() {

  const packageDirectory = process.argv[3];
  const outputDirectory = process.argv[4];
  const specificOrg = process.argv.length === 6 ? process.argv[5] : '';

  executeSerially([
    () => mapResources(packageDirectory),
    () => collectOrgItemReferences(packageDirectory, specificOrg)])
  .then((results: any) => convertResources(results.slice(1), results[0]))
  .then((converted: ConversionResult[]) => alongWith(
    () => Promise.resolve(aggregateMedia(converted)), converted))
  .then((results: any[]) => outputConversion(outputDirectory, results[0], results[1]))
  .then((results: any) => console.log('Done!'))
  .catch((err: any) => console.log(err));
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

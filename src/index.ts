import * as Resources from './resources/resource';
import * as Orgs from './resources/organization';
import { executeSerially } from './utils/common';
import { mapResources } from './utils/resource_mapping';
import * as Summarize from './summarize';
import * as Convert from './convert';
import * as Media from './media';
import { processResources } from './process';

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
        const references: string[] = [];

        results.forEach((r) => {

          if (typeof(r) !== 'string' && (id === '' || id === r.id)) {
            r.found().forEach((i) => {

              if (seenReferences[i.id] === undefined) {
                seenReferences[i.id] = true;
                references.push(i.id);
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
  .then((results: any) => processResources(Summarize.summarize, results.slice(1), results[0]))
  .then((summaries: Summarize.SummaryResult[]) => alongWith(
    () => Promise.resolve(Summarize.bucketHistograms(summaries)), summaries))
  .then((results: any[]) => Summarize.outputSummary(outputDirectory, results[0], results[1]))
  .then((results: any) => console.log('Done!'))
  .catch((err: any) => console.log(err));
}

function getLearningObjectiveIds(packageDirectory: string) {

  return mapResources(packageDirectory + '/content/x-oli-learning_objectives')
  .then(map => Object.keys(map));
}

function convertAction() {

  const packageDirectory = process.argv[3];
  const outputDirectory = process.argv[4];
  const specificOrg = process.argv[5];
  const specificOrgId = process.argv[6];

  executeSerially([
    () => mapResources(packageDirectory),
    () => collectOrgItemReferences(packageDirectory, specificOrgId),
    () => getLearningObjectiveIds(packageDirectory)])
  .then((results: any) => {

    const map = results[0];
    const references = [...results.slice(1), ...results.slice(2)];

    const mediaSummary : Media.MediaSummary = {
      mediaItems: {},
      missing: []
    }

    Convert.convert(mediaSummary, specificOrg)
    .then((results) => {
      const hierarchy = results[0] as Resources.TorusResource;

      processResources(Convert.convert.bind(undefined, mediaSummary), references, map)
      .then((converted: Resources.TorusResource[]) => {

        const updated = Convert.updateDerivativeReferences(converted);
        const mediaItems = Object.keys(mediaSummary.mediaItems).map((k: string) => mediaSummary.mediaItems[k]);

        Convert.output(
          packageDirectory, outputDirectory, hierarchy, updated, mediaItems);
      });

    });

  });

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

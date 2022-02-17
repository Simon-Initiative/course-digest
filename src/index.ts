import * as Resources from './resources/resource';
import * as Orgs from './resources/organization';
import { executeSerially } from './utils/common';
import { mapResources } from './utils/resource_mapping';
import * as Summarize from './summarize';
import * as Convert from './convert';
import * as Media from './media';
import { processResources } from './process';
import { upload } from './utils/upload';
import { addWebContentToMediaSummary } from './resources/webcontent';

const fs = require('fs');
const glob = require('glob');

const optionDefinitions = [
  { name: 'operation', type: String, defaultOption: true },
  { name: 'mediaManifest', type: String },
  { name: 'outputDir', type: String },
  { name: 'inputDir', type: String },
  { name: 'specificOrg', type: String },
  { name: 'specificOrgId', type: String },
  { name: 'slug', type: String },
  { name: 'mediaUrlPrefix', type: String },
];

const commandLineArgs = require('command-line-args');
const options: any = commandLineArgs(optionDefinitions);

function validateArgs() {

  if (options.operation === 'convert') {

    if (options.mediaUrlPrefix && options.slug && options.inputDir
      && options.outputDir && options.specificOrg && options.specificOrgId) {

      return [options.inputDir, options.outputDir, options.specificOrg].every(fs.existsSync);
    }
  } else if (options.operation === 'summarize') {

    if (options.inputDir && options.outputDir) {
      return [options.inputDir, options.outputDir].every(fs.existsSync);
    }
  } else if (options.operation === 'upload') {

    return options.slug && options.mediaManifest && fs.existsSync(options.mediaManifest);
  }

  return false;
}

function collectOrgItemReferences(packageDirectory: string, id: string = '') {

  return new Promise((resolve, reject) => {
    Orgs.locate(packageDirectory)
      .then((orgs) => {

        executeSerially(orgs.map(file => () => {
          const o = new Orgs.Organization(file, false);
          return o.summarize(file);
        }))
          .then((results: (string | Resources.Summary)[]) => {

            const seenReferences = {} as any;
            const references: string[] = [];
            const referencesOthers: string[] = [];

            results.forEach((r) => {
              if (typeof (r) !== 'string') {
                r.found().forEach((i) => {
                  if (seenReferences[i.id] === undefined) {
                    if (id === '' || id === r.id) {
                      seenReferences[i.id] = true;
                      references.push(i.id);
                    } else {
                      // Add references from all other organization files that are
                      // not part of the main org
                      // Ensure referenced file exists
                      const files = glob.sync(`${packageDirectory}/**/${i.id}.xml`, {});
                      if (files && files.length > 0) {
                        seenReferences[i.id] = true;
                        references.push(i.id);
                        referencesOthers.push(i.id);
                      }
                    }
                  }
                });
              }
            });

            const orgReferences = {} as any;
            orgReferences['orgReferences'] = references;
            orgReferences['orgReferencesOthers'] = referencesOthers;
            resolve(orgReferences);
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

  const packageDirectory = options.inputDir;
  const outputDirectory = options.outputDir;
  const specificOrg = options.specificOrg ? options.specificOrg : '';

  executeSerially([
    () => mapResources(packageDirectory),
    () => collectOrgItemReferences(packageDirectory, specificOrg)])
    .then((results: any) => processResources(Summarize.summarize, results[1].orgReferences,
                                             results[1].orgReferences, results[0]))
    .then((summaries: Summarize.SummaryResult[]) => alongWith(
      () => Promise.resolve(Summarize.bucketHistograms(summaries)), summaries))
    .then((results: any[]) => Summarize.outputSummary(outputDirectory, results[0], results[1]))
    .then((results: any) => console.log('Done!'))
    .catch((err: any) => console.log(err));
}

function getLearningObjectiveIds(packageDirectory: string) {

  return mapResources(`${packageDirectory}/content/x-oli-learning_objectives`)
    .then(map => Object.keys(map));
}

function getSkillIds(packageDirectory: string) {
  return mapResources(`${packageDirectory}/content/x-oli-skills_model`)
    .then(map => Object.keys(map));
}

function uploadAction() {

  const mediaManifest = options.mediaManifest;
  const slug = options.slug;

  const raw = fs.readFileSync(mediaManifest);
  const manifest = JSON.parse(raw);

  const uploaders = manifest.mediaItems.map((m: any) => {
    return () => {
      console.log(`Uploading ${m.file}`);
      return upload(m.file, m.name, m.mimeType, slug);
    };
  });

  return executeSerially(uploaders);

}

function convertAction() {

  const packageDirectory = options.inputDir;
  const outputDirectory = options.outputDir;
  const specificOrg = options.specificOrg;
  const specificOrgId = options.specificOrgId;
  const projectSlug = options.slug;

  executeSerially([
    () => mapResources(packageDirectory),
    () => collectOrgItemReferences(packageDirectory, specificOrgId),
    () => getLearningObjectiveIds(packageDirectory),
    () => getSkillIds(packageDirectory)])
    .then((results: any) => {

      const map = results[0];
      const orgReferences = [...results[1].orgReferences];
      const orgReferencesOthers = [...results[1].orgReferencesOthers];
      const references = [...orgReferences, ...results.slice(2), ...results.slice(3)];

      const mediaSummary: Media.MediaSummary = {
        projectSlug,
        mediaItems: {},
        missing: [],
        urlPrefix: options.mediaUrlPrefix,
        flattenedNames: {},
      };

      Convert.convert(mediaSummary, orgReferencesOthers, specificOrg, false)
        .then((results) => {
          const hierarchy = results[0] as Resources.TorusResource;

          processResources(Convert.convert.bind(undefined, mediaSummary, null), references,
                           orgReferences, map)
            .then((converted: Resources.TorusResource[]) => {

              const updated = Convert.updateDerivativeReferences(converted);
              const withTagsInsteadOfPools = Convert.generatePoolTags(updated);
              const withoutTemporary = withTagsInsteadOfPools.filter(u => u.type !== 'TemporaryContent');
              addWebContentToMediaSummary(packageDirectory, mediaSummary).then((results) => {
                const mediaItems =
                  Object.keys(mediaSummary.mediaItems).map((k: string) => results.mediaItems[k]);

                Convert.output(
                  projectSlug, packageDirectory, outputDirectory, hierarchy, withoutTemporary,
                  mediaItems);
              });
            });

        });

    });

}

function helpAction() {
  console.log('OLI Legacy Course Package Digest Tool');
  console.log('-------------------------------------\n');
  console.log('Usage:\n');
  console.log('Summarizing a course package current OLI DTD element usage:');
  console.log('npm run start --operation [summarize | convert | upload] --inputDir <course package dir> --outputDir <outdir dir> [--specificOrgId <organization id> --specificOrg <org path>]\n');
  console.log('\nNote: All files and directories must exist ahead of usage');
}

function main() {

  require('dotenv').config();

  if (validateArgs()) {

    if (options.operation === 'summarize') {
      summaryAction();
    } else if (options.operation === 'convert') {
      convertAction();
    } else if (options.operation === 'upload') {
      uploadAction().then((r: any) => console.log('Done!'));
    } else {
      helpAction();
    }

  } else {
    helpAction();
  }

}

main();

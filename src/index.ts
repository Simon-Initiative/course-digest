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
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as glob from 'glob';
import * as readline from 'readline';
import * as path from 'path';
import * as commandLineArgs from 'command-line-args';
import { Maybe } from 'tsmonad';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const defaultOrgPath = (inputDir: string) =>
  path.join(inputDir, 'organizations/default/organization.xml');

const optionDefinitions = [
  { name: 'operation', type: String, defaultOption: true },
  { name: 'mediaManifest', type: String },
  { name: 'outputDir', type: String },
  { name: 'inputDir', type: String },
  { name: 'specificOrg', type: String },
  { name: 'specificOrgId', type: String },
  { name: 'mediaUrlPrefix', type: String },
];

interface CmdOptions extends commandLineArgs.CommandLineOptions {
  operation: string;
  mediaManifest: string;
  outputDir: string;
  inputDir: string;
  specificOrg: string;
  specificOrgId: string;
  mediaUrlPrefix: string;
}

const options = commandLineArgs(optionDefinitions) as CmdOptions;

function validateArgs() {
  if (options.operation === 'convert') {
    if (options.mediaUrlPrefix && options.inputDir && options.outputDir) {
      return [options.inputDir, options.outputDir].every(fs.existsSync);
    }
  } else if (options.operation === 'summarize') {
    if (options.inputDir && options.outputDir) {
      return [options.inputDir, options.outputDir].every(fs.existsSync);
    }
  } else if (options.operation === 'upload') {
    return options.mediaManifest && fs.existsSync(options.mediaManifest);
  }

  return false;
}

function collectOrgItemReferences(packageDirectory: string, id = '') {
  return Orgs.locate(packageDirectory).then((orgs) =>
    executeSerially(
      orgs.map((file) => () => {
        const o = new Orgs.Organization(file, false);
        return o.summarize(file);
      })
    ).then((results: (string | Resources.Summary)[]) => {
      const seenReferences = {} as any;
      const references: string[] = [];
      const referencesOthers: string[] = [];

      results.forEach((r) => {
        if (typeof r !== 'string') {
          r.found().forEach((i) => {
            if (seenReferences[i.id] === undefined) {
              if (id === '' || id === r.id) {
                seenReferences[i.id] = true;
                references.push(i.id);
              } else {
                // Add references from all other organization files that are
                // not part of the main org
                // Ensure referenced file exists
                const files = glob.sync(
                  `${packageDirectory}/**/${i.id}.xml`,
                  {}
                );
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

      return orgReferences;
    })
  );
}

// Helper to execute a function that returns a promise, and resolve it
// as an element in an array that includes any number of other times. This
// allows an easy way to 'pass along' some number of values through a
// promise change to keep them in scope.
function alongWith(promiseFunc: any, ...along: any) {
  return promiseFunc().then((result: any) => [...along, result]);
}

function summaryAction() {
  const packageDirectory = options.inputDir;
  const outputDirectory = options.outputDir;
  const specificOrg = options.specificOrg || defaultOrgPath(packageDirectory);

  return executeSerially([
    () => mapResources(packageDirectory),
    () => collectOrgItemReferences(packageDirectory, specificOrg),
  ])
    .then((results: any) =>
      processResources(
        Summarize.summarize,
        results[1].orgReferences,
        results[1].orgReferences,
        results[0]
      )
    )
    .then((summaries: Summarize.SummaryResult[]) =>
      alongWith(
        () => Promise.resolve(Summarize.bucketHistograms(summaries)),
        summaries
      )
    )
    .then((results: any[]) =>
      Summarize.outputSummary(outputDirectory, results[0], results[1])
    )
    .then((_results: any) => console.log('Done!'))
    .catch((err: any) => console.log(err));
}

function getLearningObjectiveIds(packageDirectory: string) {
  return mapResources(
    `${packageDirectory}/content/x-oli-learning_objectives`
  ).then((map) => Object.keys(map));
}

function getSkillIds(packageDirectory: string) {
  return mapResources(`${packageDirectory}/content/x-oli-skills_model`).then(
    (map) => Object.keys(map)
  );
}

function uploadAction() {
  const mediaManifest =
    options.mediaManifest ||
    path.join(options.outputDir, '_media-manifest.json');

  const raw = fs.readFileSync(mediaManifest);
  const manifest = JSON.parse(raw.toString());
  const bucketName = Maybe.maybe(process.env.MEDIA_BUCKET_NAME).valueOrThrow(
    Error('MEDIA_BUCKET_NAME not set in config')
  );

  const uploaders = manifest.mediaItems.map((m: Media.MediaItem) => {
    return () => {
      console.log(`Uploading ${m.file}...`);
      return upload(m.file, m.name, m.mimeType, m.md5, bucketName).then(
        (location) => console.log(`${location} complete`)
      );
    };
  });

  return executeSerially(uploaders);
}

function convertAction() {
  const packageDirectory = options.inputDir;
  const outputDirectory = options.outputDir;
  const specificOrg = options.specificOrg || defaultOrgPath(packageDirectory);
  const specificOrgId = options.specificOrgId;

  return executeSerially([
    () => mapResources(packageDirectory),
    () => collectOrgItemReferences(packageDirectory, specificOrgId),
    () => getLearningObjectiveIds(packageDirectory),
    () => getSkillIds(packageDirectory),
  ]).then((results: any) => {
    const map = results[0];
    const orgReferences = [...results[1].orgReferences];
    const orgReferencesOthers = [...results[1].orgReferencesOthers];
    const references = [
      ...orgReferences,
      ...results.slice(2),
      ...results.slice(3),
    ];

    const mediaSummary: Media.MediaSummary = {
      mediaItems: {},
      missing: [],
      urlPrefix: options.mediaUrlPrefix,
      flattenedNames: {},
    };

    return Convert.convert(
      mediaSummary,
      orgReferencesOthers,
      specificOrg,
      false
    ).then((results) => {
      const hierarchy = results[0] as Resources.TorusResource;

      return processResources(
        (file: string) => Convert.convert(mediaSummary, null, file, false),
        references,
        orgReferences,
        map
      ).then((converted: Resources.TorusResource[]) => {
        const updated = Convert.updateDerivativeReferences(converted);
        const withTagsInsteadOfPools = Convert.generatePoolTags(updated);
        const withoutTemporary = withTagsInsteadOfPools.filter(
          (u) => u.type !== 'TemporaryContent'
        );

        return addWebContentToMediaSummary(packageDirectory, mediaSummary).then(
          (results) => {
            const mediaItems = Object.keys(mediaSummary.mediaItems).map(
              (k: string) => results.mediaItems[k]
            );

            Convert.output(
              packageDirectory,
              outputDirectory,
              hierarchy,
              withoutTemporary,
              mediaItems
            );
          }
        );
      });
    });
  });
}

const anyOf = (ans: string, ...opts: any[]) => {
  ans = ans.toLowerCase();
  return opts.some((opt) => opt === ans);
};

function suggestUploadAction() {
  return new Promise<string>((res) =>
    rl.question('Do you want to upload media assets? [y/N] ', res)
  ).then((answer: string) => {
    rl.close();

    if (anyOf(answer, 'y', 'yes')) {
      return uploadAction().then((_r: any) => console.log('Done!'));
    }
    console.log('Skipping media upload.');
  });
}

function helpAction() {
  console.log('OLI Legacy Course Package Digest Tool');
  console.log('-------------------------------------\n');
  console.log('Usage:\n');
  console.log('Summarizing a course package current OLI DTD element usage:');
  console.log(
    'npm run start --operation [summarize | convert | upload] --inputDir <course package dir> --outputDir <outdir dir> --mediaUrlPrefix <public S3 media url prefix> [--specificOrgId <organization id> --specificOrg <org path>]\n'
  );
  console.log('\nNote: All files and directories must exist ahead of usage');
}

function main() {
  dotenv.config();

  if (validateArgs()) {
    if (options.operation === 'summarize') {
      summaryAction();
    } else if (options.operation === 'convert') {
      convertAction().then(() => suggestUploadAction());
    } else if (options.operation === 'upload') {
      uploadAction().then((_r: any) => console.log('Done!'));
    } else {
      helpAction();
      process.exit();
    }
  } else {
    helpAction();
    process.exit();
  }
}

main();

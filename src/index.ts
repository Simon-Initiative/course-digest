import * as Resources from './resources/resource';
import { executeSerially } from './utils/common';
import {
  collectOrgItemReferences,
  mapResources,
  getLearningObjectiveIds,
  getSkillIds,
} from './utils/resources';
import * as Summarize from './summarize';
import * as Convert from './convert';
import * as Media from './media';
import { processResources } from './process';
import { upload } from './utils/upload';
import { addWebContentToMediaSummary } from './resources/webcontent';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as readline from 'readline';
import * as path from 'path';
import * as commandLineArgs from 'command-line-args';
import * as archiver from 'archiver';
import { Maybe } from 'tsmonad';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const optionDefinitions = [
  { name: 'operation', type: String, defaultOption: true },
  { name: 'mediaManifest', type: String },
  { name: 'outputDir', type: String },
  { name: 'inputDir', type: String },
  { name: 'specificOrg', type: String },
  { name: 'specificOrgId', type: String },
  { name: 'mediaUrlPrefix', type: String },
  { name: 'spreadsheetPath', type: String },
  { name: 'svnRoot', type: String },
];

interface CmdOptions extends commandLineArgs.CommandLineOptions {
  operation: 'summarize' | 'convert' | 'upload';
  mediaManifest: string;
  outputDir: string;
  inputDir: string;
  svnRoot: string;
  specificOrg: string;
  specificOrgId: string;
  mediaUrlPrefix: string;
}

interface ConvertedResults {
  packageDirectory: string;
  outputDirectory: string;
  svnRoot: string;
  hierarchy: Resources.TorusResource;
  finalResources: Resources.TorusResource[];
  mediaItems: Media.MediaItem[];
}

function validateArgs(options: CmdOptions) {
  if (options.operation === 'convert') {
    if (
      options.mediaUrlPrefix &&
      options.inputDir &&
      options.outputDir &&
      options.specificOrg &&
      options.specificOrgId
    ) {
      return [options.inputDir, options.specificOrg].every(fs.existsSync);
    }
  } else if (options.operation === 'summarize') {
    if (options.inputDir && options.outputDir) {
      return [options.inputDir].every(fs.existsSync);
    }
  } else if (options.operation === 'upload') {
    return options.mediaManifest && fs.existsSync(options.mediaManifest);
  }

  return false;
}

// Helper to execute a function that returns a promise, and resolve it
// as an element in an array that includes any number of other times. This
// allows an easy way to 'pass along' some number of values through a
// promise change to keep them in scope.
function alongWith(promiseFunc: any, ...along: any) {
  return promiseFunc().then((result: any) => [...along, result]);
}

function summaryAction(options: CmdOptions) {
  const packageDirectory = options.inputDir;
  const outputDirectory = options.outputDir;
  const specificOrgId = options.specificOrgId;

  return executeSerially([
    () => mapResources(packageDirectory),
    () => collectOrgItemReferences(packageDirectory, specificOrgId),
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

function uploadAction(options: CmdOptions) {
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

export function convertAction(options: CmdOptions): Promise<ConvertedResults> {
  const packageDirectory = options.inputDir;
  const outputDirectory = options.outputDir;
  const svnRoot = options.svnRoot;
  const specificOrgId = options.specificOrgId;
  const specificOrg = options.specificOrg;
  const spreadsheetPath = options.spreadsheetPath;

  return executeSerially([
    () => mapResources(packageDirectory),
    () => collectOrgItemReferences(packageDirectory, specificOrgId),
    () => getLearningObjectiveIds(packageDirectory),
    () => getSkillIds(packageDirectory),
  ]).then((results: any) => {
    const resourceMap = results[0];
    const orgReferences = [...results[1].orgReferences];
    const orgReferencesOthers = [...results[1].orgReferencesOthers];
    const orgPaths = [...results[1].organizationPaths];

    const references = [
      ...orgReferences,
      ...orgReferencesOthers,
      ...results.slice(2),
      ...results.slice(3),
    ];

    const mediaSummary: Media.MediaSummary = {
      mediaItems: {},
      missing: [],
      urlPrefix: options.mediaUrlPrefix,
      flattenedNames: {},
    };

    return Convert.convert(mediaSummary, specificOrg, false).then((results) => {
      const hierarchy = results[0] as Resources.TorusResource;

      return processResources(
        (file: string) => Convert.convert(mediaSummary, file, false),
        references,
        orgReferences,
        resourceMap
      ).then((converted: Resources.TorusResource[]) => {
        const filterOutTemporaryContent = (updated: any) =>
          updated.filter((u: any) => u.type !== 'TemporaryContent');

        let updated = converted;

        updated = Convert.updateDerivativeReferences(updated);
        updated = Convert.generatePoolTags(updated);
        updated = filterOutTemporaryContent(updated);
        updated = Convert.updateNonDirectImageReferences(updated, mediaSummary);
        updated = Convert.globalizeObjectiveReferences(updated);
        updated = Convert.setGroupPaginationModes(updated);
        updated = Convert.relativizeLegacyPaths(updated, svnRoot);

        if (spreadsheetPath !== undefined && spreadsheetPath !== null) {
          updated = Convert.applyMagicSpreadsheet(updated, spreadsheetPath);
        }

        return Convert.createProducts(updated, orgPaths, specificOrg).then(
          (updated) => {
            return addWebContentToMediaSummary(
              packageDirectory,
              mediaSummary
            ).then((results) => {
              const mediaItems = Object.keys(mediaSummary.mediaItems).map(
                (k: string) => results.mediaItems[k]
              );

              return Promise.resolve({
                packageDirectory,
                outputDirectory,
                svnRoot,
                hierarchy,
                finalResources: updated,
                mediaItems,
              });
            });
          }
        );
      });
    });
  });
}

function writeConvertedResults({
  packageDirectory,
  outputDirectory,
  svnRoot,
  hierarchy,
  finalResources,
  mediaItems,
}: ConvertedResults) {
  return Convert.output(
    packageDirectory,
    outputDirectory,
    svnRoot,
    hierarchy,
    finalResources,
    mediaItems
  );
}

const anyOf = (ans: string, ...opts: any[]) => {
  ans = ans.toLowerCase();
  return opts.some((opt) => opt === ans);
};

function suggestUploadAction(options: CmdOptions) {
  return new Promise<string>((res) =>
    rl.question('Do you want to upload media assets? [y/N] ', res)
  ).then((answer: string) => {
    if (anyOf(answer || 'n', 'y', 'yes')) {
      return uploadAction(options).then((_r: any) => console.log('Done!'));
    }

    console.log('Skipping media upload.');
    return;
  });
}

function zipAction(options: CmdOptions) {
  const archive = archiver('zip', { zlib: { level: 9 } });
  const stream = fs.createWriteStream('out.zip');

  return new Promise<void>((resolve, reject) => {
    archive
      .directory(options.outputDir, false)
      .on('error', (err) => reject(err))
      .pipe(stream);

    stream.on('close', () => resolve());
    archive.finalize();
  });
}

function suggestZipAction(options: CmdOptions) {
  return new Promise<string>((res) =>
    rl.question('Do you want to create a zip archive? [Y/n] ', res)
  ).then((answer: string) => {
    if (anyOf(answer || 'y', 'y', 'yes')) {
      return zipAction(options).then((_r: any) => console.log('Done!'));
    }

    console.log('Skipping zip archive.');
    return;
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
}

function exit() {
  rl.close();
  return process.exit();
}

function main() {
  dotenv.config();

  const options = commandLineArgs(optionDefinitions) as CmdOptions;

  if (validateArgs(options)) {
    if (options.operation === 'summarize') {
      summaryAction(options);
    } else if (options.operation === 'convert') {
      convertAction(options)
        .then(writeConvertedResults)
        .then(() => suggestZipAction(options))
        .then(() => suggestUploadAction(options))
        .then(exit);
    } else if (options.operation === 'upload') {
      uploadAction(options).then((_r: any) => console.log('Done!'));
    } else {
      helpAction();
      exit();
    }
  } else {
    helpAction();
    exit();
  }
}

if (require.main === module) {
  main();
}

import * as path from 'path';
import * as fs from 'fs';
import * as mime from 'mime-types';
import * as md5File from 'md5-file';
import * as tmp from 'tmp';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const fetch = require('sync-fetch');
import { Activity, NonDirectImageReference } from './resources/resource';
import { replaceImageReferences } from './resources/questions/custom-dnd';

export interface MediaSummary {
  mediaItems: { [k: string]: MediaItem };
  missing: MediaItemReference[];
  urlPrefix: string;
  downloadRemote: boolean;
  flattenedNames: { [k: string]: string };
}

export interface FlattenResult {
  mediaItems: MediaItem[];
  missing: MediaItemReference[];
}

export interface MediaItemReference {
  filePath: string;
  assetReference: string;
  isLayoutRef?: boolean;
}

export interface MediaItem {
  file: string;
  name: string;
  flattenedName: string;
  url: string;
  mimeType: string;
  fileSize: number;
  md5: string;
  references: MediaItemReference[];
}

export type UploadResult = UploadSuccess | UploadFailure;

export interface UploadSuccess {
  type: 'UploadSuccess';
  mediaItem: MediaItem;
}

export interface UploadFailure {
  type: 'UploadFailure';
  mediaItem: MediaItem;
  error: string;
}

// From a DOM object, find all media item references;
export function transformToFlatDirectory(
  filePath: string,
  $: any,
  summary: MediaSummary
) {
  const paths = findFromDOM($, filePath);

  Object.keys(paths).forEach((assetReference: any) => {
    // Flatten this file reference into our single, virtual directory

    const ref = { filePath, assetReference };
    const url = flatten(ref, summary);

    // Update the URL in the XML DOM
    if (url !== null) {
      paths[assetReference].forEach((elem) => {
        if (
          $(elem)[0].name === 'source' &&
          $(elem).parent()[0].name !== 'video'
        ) {
          $(elem).replaceWith(
            `<source>${url.slice(url.lastIndexOf('media/') + 6)}</source>`
          );
        } else if ($(elem)[0].name === 'asset') {
          const name = $(elem).attr('name');
          if (name) {
            $(elem).replaceWith(
              `<asset name="${name}">${url.slice(
                url.lastIndexOf('media/') + 6
              )}</asset>`
            );
          } else {
            $(elem).replaceWith(
              `<asset>${url.slice(url.lastIndexOf('media/') + 6)}</asset>`
            );
          }
        } else if ($(elem)[0].name === 'interface') {
          $(elem).replaceWith(
            `<interface>${url.slice(url.lastIndexOf('media/') + 6)}</interface>`
          );
        } else if ($(elem)[0].name === 'dataset') {
          const pkg = $(elem).attr('package');

          $(elem).replaceWith(
            `<dataset package="${pkg}">${url.slice(
              url.lastIndexOf('media/') + 6
            )}</dataset>`
          );
        } else {
          $(elem).attr('src', url);
        }
      });
    }
  });
}

export function downloadRemote(
  filePath: string,
  $: any,
  summary: MediaSummary
) {
  const paths = findFromDOM($, filePath, true);
  Object.keys(paths).forEach((assetReference: any) => {
    // Download the file into a temporary file
    const buffer = fetch(assetReference, {}).buffer();
    const tmpobj = tmp.fileSync();
    fs.writeFileSync(tmpobj.name, buffer);

    // Create a directory for this file based on md5

    const md5 = md5File.sync(tmpobj.name);
    const root = filePath.substring(0, filePath.lastIndexOf('/'));
    if (!fs.existsSync(root + '/' + md5)) {
      fs.mkdirSync(root + '/' + md5);
    }

    // Copy the file into that directory
    let name = assetReference.substring(assetReference.lastIndexOf('/') + 1);
    if (name.endsWith('#fixme')) {
      name = name.substring(0, name.length - 6);
    }
    const newLocalPath = root + '/' + md5 + '/' + name;
    if (!fs.existsSync(newLocalPath)) {
      fs.copyFileSync(tmpobj.name, newLocalPath);
    }

    const subPath = md5.substring(0, 2);
    // Store the new media item
    const url =
      summary.urlPrefix +
      '/' +
      subPath +
      '/' +
      md5 +
      '/' +
      encodeURIComponent(name);

    if (summary.mediaItems[newLocalPath] === undefined) {
      // See if we need to rename this file to avoid conflicts with an already
      // flattened file
      const flattenedName = name;

      summary.mediaItems[newLocalPath] = {
        file: newLocalPath,
        fileSize: getFilesizeInBytes(newLocalPath),
        name,
        flattenedName,
        md5,
        mimeType: mime.lookup(newLocalPath) || 'application/octet-stream',
        references: [],
        url,
      };
    }

    // Update the URL in the XML DOM
    if (url !== null) {
      paths[assetReference].forEach((elem) => {
        if (
          $(elem)[0].name === 'source' &&
          $(elem).parent()[0].name !== 'video'
        ) {
          $(elem).replaceWith(
            `<source>${url.slice(url.lastIndexOf('media/') + 6)}</source>`
          );
        } else if ($(elem)[0].name === 'asset') {
          const name = $(elem).attr('name');
          if (name) {
            $(elem).replaceWith(
              `<asset name="${name}">${url.slice(
                url.lastIndexOf('media/') + 6
              )}</asset>`
            );
          } else {
            $(elem).replaceWith(
              `<asset>${url.slice(url.lastIndexOf('media/') + 6)}</asset>`
            );
          }
        } else if ($(elem)[0].name === 'interface') {
          $(elem).replaceWith(
            `<interface>${url.slice(url.lastIndexOf('media/') + 6)}</interface>`
          );
        } else if ($(elem)[0].name === 'dataset') {
          const pkg = $(elem).attr('package');
          $(elem).replaceWith(
            `<dataset package="${pkg}">${url.slice(
              url.lastIndexOf('media/') + 6
            )}</dataset>`
          );
        } else {
          $(elem).attr('src', url);
        }
      });
    }
  });
}

export function transformToFlatDirectoryURLReferences(
  assetReferences: NonDirectImageReference[],
  activity: Activity,
  summary: MediaSummary
) {
  let layout = activity.content.layoutStyles as string;
  assetReferences.forEach((item: any) => {
    // Flatten this file reference into our single, virtual directory
    const { assetReference, originalReference } = item;
    const ref = { filePath: activity.legacyPath, assetReference };
    const url = flatten(ref, summary);

    // Update the URL in the XML DOM
    if (url !== null) {
      layout = replaceImageReferences(layout, originalReference, url);
    }
  });
  activity.content.layoutStyles = layout;
}

// Take a collection of media item references and flatten them into a single
// virtual directory, being careful to account for the same name
// (but different file) in different directories.
export function flatten(
  ref: MediaItemReference,
  summary: MediaSummary
): string | null {
  const absolutePath = resolve(ref);
  const decodedPath = decodeURIComponent(absolutePath);

  if (fs.existsSync(decodedPath)) {
    const md5 = md5File.sync(decodedPath);

    const getName = (file: string) => file.substr(file.lastIndexOf('/') + 1);
    const subdir = md5.substring(0, 2);
    const toURL = (name: string) =>
      summary.urlPrefix +
      '/' +
      subdir +
      '/' +
      md5 +
      '/' +
      encodeURIComponent(name);

    const name = getName(decodedPath);

    // Is this the first time we have encountered this specific physical file
    if (summary.mediaItems[absolutePath] === undefined) {
      // See if we need to rename this file to avoid conflicts with an already
      // flattened file
      const flattenedName = summary.flattenedNames[name]
        ? generateNewName(name, summary.flattenedNames)
        : name;

      summary.mediaItems[absolutePath] = {
        file: decodedPath,
        fileSize: getFilesizeInBytes(decodedPath),
        name,
        flattenedName,
        md5,
        mimeType: mime.lookup(absolutePath) || 'application/octet-stream',
        references: [ref],
        url: toURL(flattenedName),
      };
    }
    summary.mediaItems[absolutePath].references.push(ref);
    return summary.mediaItems[absolutePath].url;
  }

  summary.missing.push(ref);
  return null;
}

function getFilesizeInBytes(filename: string) {
  const stats = fs.statSync(filename);
  const fileSizeInBytes = stats.size;
  return fileSizeInBytes;
}

function generateNewName(
  name: string,
  flattenedNames: { [k: string]: string }
) {
  const buildCandidateName =
    name.indexOf('.') >= 0
      ? (n: string, i: number): string => {
          const parts = n.split('.');
          return parts[0] + '_' + i + '.' + parts[1];
        }
      : (n: string, i: number): string => name + '_' + i;

  let i = 1;
  while (true) {
    const candidateName = buildCandidateName(name, i);
    if (flattenedNames[candidateName] === undefined) {
      return candidateName;
    }
    i++;
  }
}

// Turns a media asset reference that is relative to a particular course
// XML document, into a reference that is relative to the root directory
// of the project
export function resolve(reference: MediaItemReference): string {
  let dir = path.dirname(reference.filePath);

  if (reference.assetReference.startsWith('webcontent')) {
    dir =
      reference.filePath.slice(0, reference.filePath.lastIndexOf('content')) +
      'content/';
  }

  const assetRef = removeQueryParams(reference.assetReference);

  return findInPackage(dir, assetRef, path.resolve(dir, assetRef));
}

export function removeQueryParams(ref: string): string {
  return ref.split('?')[0];
}

export function findInPackage(
  dir: string,
  reference: string,
  absolutePath: string
): string {
  const decodedPath = decodeURIComponent(absolutePath);

  if (!fs.existsSync(decodedPath)) {
    if (dir.endsWith('content/')) return absolutePath;
    const dirArray: string[] = dir.split('/');
    dirArray.pop();
    dirArray.pop();
    dir = dirArray.join('/') + '/';
    return findInPackage(dir, reference, path.resolve(dir, reference));
  }

  return absolutePath;
}

// Uploads a collection of media items to an S3 bucket, staging them for
// a Torus project ingestion
export function stage(
  mediaItems: MediaItem[],
  _remotePath: string,
  _progressCallback: (mediaItem: MediaItem) => void
): Promise<UploadResult[]> {
  return Promise.resolve(
    mediaItems.map((mediaItem) => ({ type: 'UploadSuccess', mediaItem }))
  );
}

function findFromDOM(
  $: any,
  filePath: string,
  remote = false
): Record<string, Array<string>> {
  const paths: any = {};

  $('pronunciation').each((i: any, elem: any) => {
    if ($(elem).attr('src') !== undefined) {
      paths[$(elem).attr('src')] = [elem, ...$(paths[$(elem).attr('src')])];
    }
  });

  $('conjugate').each((i: any, elem: any) => {
    if ($(elem).attr('src') !== undefined) {
      paths[$(elem).attr('src')] = [elem, ...$(paths[$(elem).attr('src')])];
    }
  });

  $('image').each((i: any, elem: any) => {
    paths[$(elem).attr('src')] = [elem, ...$(paths[$(elem).attr('src')])];
  });

  $('audio').each((i: any, elem: any) => {
    paths[$(elem).attr('src')] = [elem, ...$(paths[$(elem).attr('src')])];
  });

  $('audio source').each((i: any, elem: any) => {
    paths[$(elem).attr('src')] = [elem, ...$(paths[$(elem).attr('src')])];
  });

  $('audio track').each((i: any, elem: any) => {
    paths[$(elem).attr('src')] = [elem, ...$(paths[$(elem).attr('src')])];
  });

  $('video').each((i: any, elem: any) => {
    if ($(elem).attr('src') !== undefined) {
      paths[$(elem).attr('src')] = [elem, ...$(paths[$(elem).attr('src')])];
    }
  });

  $('video source').each((i: any, elem: any) => {
    paths[$(elem).attr('src')] = [elem, ...$(paths[$(elem).attr('src')])];
  });

  $('embed_activity source').each((i: any, elem: any) => {
    paths[$(elem).text()] = [elem, ...$(paths[$(elem).text()])];
  });

  $('asset').each((i: any, elem: any) => {
    if ($(elem).text().includes('webcontent')) {
      paths[$(elem).text()] = [elem, ...$(paths[$(elem).text()])];
    }
  });

  $('interface').each((i: any, elem: any) => {
    if ($(elem).text().includes('webcontent')) {
      paths[$(elem).text()] = [elem, ...$(paths[$(elem).text()])];
    }
  });

  $('dataset').each((i: any, elem: any) => {
    if ($(elem).text().includes('webcontent')) {
      paths[$(elem).text()] = [elem, ...$(paths[$(elem).text()])];
    }
  });

  Object.keys(paths)
    .filter((src: string) =>
      remote
        ? isLocalReference(src, filePath)
        : !isLocalReference(src, filePath)
    )
    .forEach((src: string) => delete paths[src]);

  return paths;
}

function isLocalReference(src: string, filePath: string): boolean {
  return (
    src.startsWith('.') ||
    src.startsWith('webcontent') ||
    (isSuperactivity(filePath) && src.includes('webcontent'))
  );
}

function isSuperactivity(filePath: string): boolean {
  return (
    filePath.includes('x-oli-bio-simulator') ||
    filePath.includes('x-oli-chat') ||
    filePath.includes('x-oli-embed') ||
    filePath.includes('x-oli-linked-activity') ||
    filePath.includes('x-oli-lti') ||
    filePath.includes('x-oli-print-certificate') ||
    filePath.includes('x-oli-repl') ||
    filePath.includes('x-oli-supertutor') ||
    filePath.includes('x-cmu-') ||
    filePath.includes('x-pitt-')
  );
}

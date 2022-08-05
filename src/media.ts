import * as path from 'path';
import * as fs from 'fs';
import * as mime from 'mime-types';
import * as md5File from 'md5-file';
import { Activity, NonDirectImageReference } from './resources/resource';
import { replaceImageReferences } from './resources/questions/custom-dnd';

export interface MediaSummary {
  mediaItems: { [k: string]: MediaItem };
  missing: MediaItemReference[];
  urlPrefix: string;
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
  const paths = findFromDOM($);
  Object.keys(paths).forEach((assetReference: any) => {
    // Flatten this file reference into our single, virtual directory
    const ref = { filePath, assetReference };
    const url = flatten(ref, summary);
    console.log(`${url} vs ${JSON.stringify(ref)}`)

    // Update the URL in the XML DOM
    if (url !== null) {
      paths[assetReference].forEach((elem) => {
        if($(elem)[0].name === 'source'){
          $(elem).replaceWith(`<source>${url.slice(url.lastIndexOf('media/') + 6)}</source>`);
        } else if($(elem)[0].name === 'asset'){
          const name = $(elem).attr('name');
          $(elem).replaceWith(`<asset name="${name}">${url.slice(url.lastIndexOf('media/') + 6)}</asset>`);
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
    const ref = { filePath: activity.originalFile, assetReference };
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
  const md5 = md5File.sync(absolutePath);

  const getName = (file: string) => file.substr(file.lastIndexOf('/') + 1);
  const toURL = (name: string) => summary.urlPrefix + '/' + md5 + '/' + name;

  const name = getName(absolutePath);

  if (fs.existsSync(absolutePath)) {
    // Is this the first time we have encountered this specific physical file
    if (summary.mediaItems[absolutePath] === undefined) {
      // See if we need to rename this file to avoid conflicts with an already
      // flattened file
      const flattenedName = summary.flattenedNames[name]
        ? generateNewName(name, summary.flattenedNames)
        : name;

      summary.mediaItems[absolutePath] = {
        file: absolutePath,
        fileSize: getFilesizeInBytes(absolutePath),
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
  if(reference.assetReference.startsWith('webcontent')){
    dir = reference.filePath.slice(0, reference.filePath.lastIndexOf('content')) + 'content/'
  }
  return path.resolve(
    dir,
    reference.assetReference
  );
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

function findFromDOM($: any): Record<string, Array<string>> {
  const paths: any = {};

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

  $('source').each((i: any, elem: any) => {
    paths[$(elem).text()] = [elem, ...$(paths[$(elem).text()])];
  });

  $('asset').each((i: any, elem: any) => {
    if($(elem).text().includes('webcontent')) {
      paths[$(elem).text()] = [elem, ...$(paths[$(elem).text()])];
    }
  });

  Object.keys(paths)
    .filter((src: string) => !isLocalReference(src))
    .forEach((src: string) => delete paths[src]);

  return paths;
}

function isLocalReference(src: string): boolean {
  return src.startsWith('.') || src.startsWith('webcontent');
}

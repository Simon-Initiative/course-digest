const path = require('path');
const fs = require('fs');
const mime = require('mime-types');
const md5File = require('md5-file');

export interface MediaSummary {
  mediaItems: {[k: string] : MediaItem };
  missing: MediaItemReference[];
  projectSlug: string;
  urlPrefix: string;
  flattenedNames : {[k: string] : string };
}

export interface FlattenResult {
  mediaItems: MediaItem[];
  missing: MediaItemReference[];
}

export interface MediaItemReference {
  filePath: string;
  assetReference: string;
}

export interface MediaItem {
  file: string;
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
export function transformToFlatDirectory(filePath: string, $: any, summary: MediaSummary) {
  
  const paths = findFromDOM($);
  Object.keys(paths).forEach((assetReference: any) => {

    // Flatten this file reference into our single, virtual directory
    const ref = { filePath, assetReference };
    const url = flatten(ref, summary);

    // Update the URL in the XML DOM
    if (url !== null) {
      const elem = paths[assetReference];
      $(elem).attr('src', url);
    }
    
    
  });
  
}



// Take a collection of media item references and flatten them into a single
// virtual directory, being careful to account for the same name 
// (but different file) in different directories.  
export function flatten(ref: MediaItemReference, summary: MediaSummary) : string | null {

  const getName = (file: string) => file.substr(file.lastIndexOf('/') + 1);
  const toURL = (name: string) => summary.urlPrefix + '/' + summary.projectSlug + '/' + name;
  
  const absolutePath = resolve(ref);
  const name = getName(absolutePath);
  
  if (fs.existsSync(absolutePath)) {
    
    // Is this the first time we have encountered this specific physical file
    if (summary.mediaItems[absolutePath] === undefined) {

      // See if we need to rename this file to avoid conflicts with an already
      // flattened file
      const flattenedName = (summary.flattenedNames[name])
        ? generateNewName(name, summary.flattenedNames)
        : name;

      summary.mediaItems[absolutePath] = {
        file: absolutePath,
        fileSize: getFilesizeInBytes(absolutePath),
        flattenedName,
        md5: md5File.sync(absolutePath),
        mimeType: mime.lookup(absolutePath) || 'application/octet-stream',
        references: [ref],
        url: toURL(flattenedName),
      };

      return flattenedName;

    } else {
      summary.mediaItems[absolutePath].references.push(ref);
      return summary.mediaItems[absolutePath].url;
    }
  } else {
    summary.missing.push(ref);
    return null;
  }
  
}

function getFilesizeInBytes(filename: string) {
  var stats = fs.statSync(filename);
  var fileSizeInBytes = stats.size;
  return fileSizeInBytes;
}

function generateNewName(name: string, flattenedNames: {[k: string] : string }) {

  const buildCandidateName = (name.indexOf('.') >= 0)
    ? (n: string, i: number) : string => {
      const parts = n.split('.');
      return parts[0] + '_' + i + '.' + parts[1];
    }
    : (n: string, i: number) : string => name + '_' + i;

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
export function resolve(reference: MediaItemReference) : string {
  return path.resolve(path.dirname(reference.filePath), reference.assetReference);
}

// Uploads a collection of media items to an S3 bucket, staging them for
// a Torus project ingestion
export function stage(
  mediaItems: MediaItem[], 
  remotePath: string, 
  progressCallback: (mediaItem: MediaItem) => void) : Promise<UploadResult[]> {

  return Promise.resolve(mediaItems.map(mediaItem => ({ type: 'UploadSuccess', mediaItem })))
}

function findFromDOM($: any) : string[] {

  const paths : any = {};

  $('image').each((i: any, elem: any) => {
    paths[$(elem).attr('src')] = elem;
  });

  $('audio').each((i: any, elem: any) => {
    paths[$(elem).attr('src')] = elem;
  });

  $('audio source').each((i: any, elem: any) => {
    paths[$(elem).attr('src')] = elem;
  });

  $('audio track').each((i: any, elem: any) => {
    paths[$(elem).attr('src')] = elem;
  });

  Object
    .keys(paths)
    .filter((src: string) => !isLocalReference(src))
    .forEach((src: string) => delete paths[src]);

  return paths;
}

function isLocalReference(src: string) : boolean {
  return src.startsWith('.');
}


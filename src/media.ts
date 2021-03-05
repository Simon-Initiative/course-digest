const path = require('path');
const fs = require('fs');

export interface MediaSummary {
  mediaItems: {[k: string] : MediaItem };
  missing: MediaItemReference[];
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
export function find(filePath: string, $: any) : MediaItemReference[] {
  return findFromDOM($).map(assetReference => ({ filePath, assetReference }));
}



// Take a collection of media item references and flatten them into a single
// virtual directory, being careful to account for the same name 
// (but different file) in different directories.  
export function flatten(mediaItemReferences: MediaItemReference[], summary: MediaSummary) : void {

  const getName = (file: string) => file.substr(file.lastIndexOf('/') + 1);
  const flattenedNames : {[k: string] : string } = {};
  
  mediaItemReferences.forEach(ref => {

    const absolutePath = resolve(ref);
    const name = getName(absolutePath);
    
    if (fs.existsSync(absolutePath)) {
      
      if (summary.mediaItems[absolutePath] === undefined) {

        // See if we need to rename this file to avoid conflicts with an already
        // flattened file
        const flattenedName = (flattenedNames[name])
          ? generateNewName(name, flattenedNames)
          : name;

        summary.mediaItems[absolutePath] = {
          file: absolutePath,
          flattenedName,
          references: [ref],
        }
      } else {
        summary.mediaItems[absolutePath].references.push(ref);
      }
    } else {
      summary.missing.push(ref);
    }
    

  });

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
    paths[$(elem).attr('src')] = true;
  });

  $('audio').each((i: any, elem: any) => {
    paths[$(elem).attr('src')] = true;
  });

  $('audio source').each((i: any, elem: any) => {
    paths[$(elem).attr('src')] = true;
  });

  $('audio track').each((i: any, elem: any) => {
    paths[$(elem).attr('src')] = true;
  });

  return Object
    .keys(paths)
    .filter((src: string) => isLocalReference(src));
}

function isLocalReference(src: string) : boolean {
  return src.startsWith('.');
}


import { MediaSummary } from 'media';

const glob = require('glob');
const fs = require('fs');
const path = require('path');
const mime = require('mime-types');
const md5File = require('md5-file');

export function addWebContentToMediaSummary(directory: string, summary: MediaSummary)
  : Promise<MediaSummary> {
  const getName = (file: string) => file.substr(file.lastIndexOf('webcontent'));
  const toURL = (name: string) => `${summary.urlPrefix}/${summary.projectSlug}/${name}`;

  return new Promise((resolve, reject) => {
    glob(`${directory}/**/webcontent/**/*.*`, {}, (err: any, files: any) => {

      files.forEach((file: string) => {

        const absolutePath = path.resolve(file);
        const name = getName(absolutePath);
        if (summary.mediaItems[absolutePath] === undefined) {
          console.log(absolutePath);
          const flattenedName = (summary.flattenedNames[name])
            ? generateNewName(name, summary.flattenedNames)
            : name;

          summary.mediaItems[absolutePath] = {
            file: absolutePath,
            fileSize: getFilesizeInBytes(absolutePath),
            flattenedName,
            md5: md5File.sync(absolutePath),
            mimeType: mime.lookup(absolutePath) || 'application/octet-stream',
            references: [],
            url: toURL(name),
          };
        }
      });
      resolve(summary);
    });
  });
}

function getFilesizeInBytes(filename: string) {
  const stats = fs.statSync(filename);
  const fileSizeInBytes = stats.size;
  return fileSizeInBytes;
}

function generateNewName(name: string, flattenedNames: { [k: string]: string }) {

  const buildCandidateName = (name.indexOf('.') >= 0)
    ? (n: string, i: number): string => {
      const parts = n.split('.');
      return `${parts[0]}_${i}.${parts[1]}`;
    }
    : (n: string, i: number): string => `${name}_${i}`;

  let i = 1;
  while (true) {
    const candidateName = buildCandidateName(name, i);
    if (flattenedNames[candidateName] === undefined) {
      return candidateName;
    }
    i++;
  }

}

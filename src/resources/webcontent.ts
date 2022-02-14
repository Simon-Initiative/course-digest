import { MediaSummary } from 'media';
import { guid } from '../utils/common';

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

      // Sort file paths by depth to ensure that shallower paths are processed first when a
      // filename conflict, in the now relatively flatted webcontent file structure, is detected
      files.sort((a: string, b: string) => {
        return (a.split('/')).length - (b.split('/')).length;
      });

      files.forEach((file: string) => {
        const absolutePath = path.resolve(file);
        const name = getName(absolutePath);
        if (summary.mediaItems[absolutePath] === undefined) {
          const flattenedName = (summary.flattenedNames[name])
            ? generateNewName(name)
            : name;

          summary.flattenedNames[flattenedName] = flattenedName;
          summary.mediaItems[absolutePath] = {
            file: absolutePath,
            fileSize: getFilesizeInBytes(absolutePath),
            flattenedName,
            md5: md5File.sync(absolutePath),
            mimeType: mime.lookup(absolutePath) || 'application/octet-stream',
            references: [],
            url: toURL(flattenedName),
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

function generateNewName(name: string) {
  const final = name.replace('webcontent/', `webcontent/${guid()}/`);
  return final;
}

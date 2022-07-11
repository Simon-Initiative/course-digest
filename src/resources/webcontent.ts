import { MediaSummary } from 'src/media';
import { guid } from '../utils/common';
import * as glob from 'glob';
import * as fs from 'fs';
import * as path from 'path';
import * as mime from 'mime-types';
import * as md5File from 'md5-file';

export function addWebContentToMediaSummary(
  directory: string,
  summary: MediaSummary
): Promise<MediaSummary> {
  const getName = (file: string) => file.substr(file.lastIndexOf('webcontent'));

  return new Promise((resolve, _reject) => {
    glob(
      `${directory}/**/webcontent/**/*`,
      { nodir: true },
      (err: any, files: any) => {
        // Sort file paths by depth to ensure that shallower paths are processed first when a
        // filename conflict, in the now relatively flatted webcontent file structure, is detected
        files.sort((a: string, b: string) => {
          return a.split('/').length - b.split('/').length;
        });

        files.forEach((file: string) => {
          const absolutePath = path.resolve(file);
          const name = getName(absolutePath);
          const md5 = md5File.sync(absolutePath);
          const toURL = (name: string) => `${summary.urlPrefix}/${md5}/${name}`;

          if (summary.mediaItems[absolutePath] === undefined) {
            const flattenedName = summary.flattenedNames[name]
              ? generateNewName(name)
              : name;

            summary.flattenedNames[flattenedName] = flattenedName;
            summary.mediaItems[absolutePath] = {
              file: absolutePath,
              fileSize: getFilesizeInBytes(absolutePath),
              name,
              flattenedName,
              md5,
              mimeType: mime.lookup(absolutePath) || 'application/octet-stream',
              references: [],
              url: toURL(flattenedName),
            };
          }
        });
        resolve(summary);
      }
    );
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

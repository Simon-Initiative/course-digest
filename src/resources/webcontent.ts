import { MediaSummary, ProcessedMediaItem } from 'src/media';
import { guid } from 'src/utils/common';
import * as glob from 'glob';
import * as fs from 'fs';
import * as path from 'path';
import * as mime from 'mime-types';
import * as md5File from 'md5-file';
import { ProjectSummary } from 'src/project';

export function addWebContentToMediaSummary(
  directory: string,
  projectSummary: ProjectSummary,
  summary: MediaSummary,
  webContentBundle?: string
): Promise<MediaSummary> {
  return new Promise((resolve, _reject) => {
    glob(
      `${directory}/**/webcontent/**/*`,
      { nodir: true },
      (err: any, files: string[]) => {
        // Sort file paths by depth to ensure that shallower paths are processed first when a
        // filename conflict, in the now relatively flatted webcontent file structure, is detected
        const sortedFiles = [...files].sort((a: string, b: string) => {
          return a.split('/').length - b.split('/').length;
        });

        sortedFiles.forEach((file: string) => {
          const absolutePath = path.resolve(file);
          const name = path.basename(absolutePath);
          const md5 = md5File.sync(absolutePath);
          const subdir = md5.substring(0, 2);

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
              url: `${summary.urlPrefix}/${subdir}/${md5}/${flattenedName}`,
            };
          }
        });

        if (webContentBundle) {
          // Create a webcontent bundle of the directory hierarchy if webContentBundle is specified
          const items = files.map((file: string) => {
            const absolutePath = path.resolve(file);
            const name = path.basename(absolutePath);
            const relativePath = getPathRelativeToPackage(
              projectSummary.packageDirectory,
              absolutePath
            );
            const md5 = md5File.sync(absolutePath);

            return {
              file: absolutePath,
              fileSize: getFilesizeInBytes(absolutePath),
              name,
              md5,
              mimeType: mime.lookup(absolutePath) || 'application/octet-stream',
              url: `${summary.urlPrefix}/webcontent/${webContentBundle}/${relativePath}`,
            };
          });

          const totalSize = items.reduce(
            (acc: number, item: ProcessedMediaItem) => acc + item.fileSize,
            0
          );

          summary.webContentBundle = {
            name: webContentBundle,
            url: `${summary.urlPrefix}/webcontent/${webContentBundle}`,
            items,
            totalSize,
          };
        }

        resolve(summary);
      }
    );
  });
}

const getPathRelativeToPackage = (
  packageDirectory: string,
  absolutePath: string
) => path.relative(packageDirectory, absolutePath);

function getFilesizeInBytes(filename: string) {
  const stats = fs.statSync(filename);
  const fileSizeInBytes = stats.size;
  return fileSizeInBytes;
}

function generateNewName(name: string) {
  const final = name.replace('webcontent/', `webcontent/${guid()}/`);
  return final;
}

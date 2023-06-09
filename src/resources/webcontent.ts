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
  createMediaBundle?: string
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
          const name = getName(absolutePath);
          const md5 = md5File.sync(absolutePath);
          const subdir = md5.substring(0, 2);
          const toURL = (name: string) =>
            `${summary.urlPrefix}/${subdir}/${md5}/${name}`;

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

        if (createMediaBundle) {
          // Create a media bundle of the webcontent hierarchy if createMediaBundle is specified
          const items = files.map((file: string) =>
            processFileAsMediaItem(
              file,
              summary.urlPrefix,
              projectSummary.packageDirectory,
              createMediaBundle
            )
          );

          const bundleSize = items.reduce(
            (acc: number, item: ProcessedMediaItem) => acc + item.fileSize,
            0
          );

          summary.mediaBundle = {
            name: createMediaBundle,
            url: `${summary.urlPrefix}/bundles/${createMediaBundle}`,
            items,
            bundleSize,
          };
        }

        resolve(summary);
      }
    );
  });
}

const getName = (file: string) => file.substr(file.lastIndexOf('webcontent'));
const getPathRelativeToPackage = (
  packageDirectory: string,
  absolutePath: string
) => path.relative(packageDirectory, absolutePath);

function processFileAsMediaItem(
  file: string,
  urlPrefix: string,
  packageDirectory: string,
  mediaBundleId: string
): ProcessedMediaItem {
  const absolutePath = path.resolve(file);
  const name = path.basename(absolutePath);
  const relativePath = getPathRelativeToPackage(packageDirectory, absolutePath);
  const md5 = md5File.sync(absolutePath);

  return {
    file: absolutePath,
    fileSize: getFilesizeInBytes(absolutePath),
    name,
    md5,
    mimeType: mime.lookup(absolutePath) || 'application/octet-stream',
    url: `${urlPrefix}/bundles/${mediaBundleId}/${relativePath}`,
  };
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

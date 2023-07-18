import { MediaSummary, ProcessedMediaItem } from 'src/media';
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
    // no-op if not webcontent bundle not requested on command line
    if (!webContentBundle) {
      resolve(summary);
      return;
    }

    glob(
      `${directory}/**/webcontent/**/*`,
      { nodir: true },
      (err: any, files: string[]) => {
        console.log('webcontent file count: ' + files.length);
        // Sort file paths by depth to ensure that shallower paths are processed first when a
        // filename conflict, in the now relatively flatted webcontent file structure, is detected
        // (This no longer necessary, but gives reasonable order)
        const sortedFiles = [...files].sort((a: string, b: string) => {
          return a.split('/').length - b.split('/').length;
        });

        const items = sortedFiles.map((file: string) => {
          const absolutePath = path.resolve(file);
          const name = path.basename(absolutePath);
          const relativePath = getPathRelativeToContentRoot(
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
            url: `${summary.urlPrefix}/bundles/${webContentBundle}/${relativePath}`,
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

        resolve(summary);
      }
    );
  });
}

const getPathRelativeToContentRoot = (
  packageDirectory: string,
  absolutePath: string
) => path.relative(packageDirectory + '/content', absolutePath);

function getFilesizeInBytes(filename: string) {
  const stats = fs.statSync(filename);
  const fileSizeInBytes = stats.size;
  return fileSizeInBytes;
}

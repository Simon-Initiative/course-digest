import { TorusResource, ResourceType } from './resources/resource';
import { determineResourceType, create } from './resources/create';
import { executeSerially, ItemReference } from './utils/common';
import * as DOM from './utils/dom';

const fs = require('fs');

interface MediaItem {
  file: string;
}

export function convert(file: string) : Promise<(TorusResource | string)[]> {
  return determineResourceType(file)
    .then((t: ResourceType) => {

      const item = create(t);

      const $ = DOM.read(file);
      item.restructure($);

      const xml = $.html();
      return item.translate(xml);
    });
}

export function output(
  courseDirectory: string,
  outputDirectory: string,
  hierarchy: TorusResource,
  converted: TorusResource[]) {

  const mediaItems: MediaItem[] = [];

  return executeSerially([
    () => outputManifest(courseDirectory, outputDirectory),
    () => outputHierarchy(outputDirectory, hierarchy),
    () => outputMediaManifest(outputDirectory, mediaItems),
    ...converted.map(r => () => outputResource(outputDirectory, r)),
  ]);
}

function outputFile(path: string, o: Object) : Promise<boolean> {
  const content = JSON.stringify(o, undefined, 2);

  return new Promise((resolve, reject) => {
    fs.writeFile(path, content, (err: any) => {
      // throws an error, you could also catch it here
      if (err) {
        reject(err);
      } else {
        resolve(true);
      }
    });
  });
}

function outputManifest(courseDir: string, outputDirectory: string) {

  const $ = DOM.read(`${courseDir}/content/package.xml`);
  const title = $('package title').text();
  const description = $('package description').text();

  const manifest = {
    title,
    description,
    type: 'Manifest',
  };

  return outputFile(`${outputDirectory}/manifest.json`, manifest);
}

function outputHierarchy(outputDirectory: string, h: TorusResource) {
  return outputFile(`${outputDirectory}/hierarchy.json`, h);
}

function outputMediaManifest(outputDirectory: string, mediaItems: MediaItem[]) {

  const manifest = {
    mediaItems,
    type: 'MediaManifest',
  };

  return outputFile(`${outputDirectory}/media-manifest.json`, manifest);
}

function outputResource(outputDirectory: string, resource: TorusResource) {
  return outputFile(`${outputDirectory}/${resource.id}.json`, resource);
}

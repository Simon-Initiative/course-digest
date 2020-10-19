import { TorusResource, ResourceType } from './resources/resource';
import { determineResourceType, create } from './resources/create';
import { executeSerially, ItemReference } from './utils/common';
import * as DOM from './utils/dom';
import { ResourceMap } from './utils/resource_mapping';

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
  outputDirectory: string,
  converted: TorusResource[]) {

  const mediaItems: MediaItem[] = [];
  const hierarchy: TorusResource = converted[0];

  return executeSerially([
    () => outputManifest(outputDirectory, hierarchy, mediaItems),
    ...converted.map(r => () => outputResource(outputDirectory, r)),
  ]);
}

function outputManifest(outputDirectory: string, h: TorusResource, mediaItems: MediaItem[]) {

}

function outputResource(outputDirectory: string, resources: TorusResource) {

}

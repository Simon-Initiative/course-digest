import { TorusResource, ResourceType, Page, Activity } from './resources/resource';
import { determineResourceType, create } from './resources/create';
import { executeSerially, ItemReference } from './utils/common';
import * as Media from './media';
import * as DOM from './utils/dom';
import * as XML from './utils/xml';

type DerivedResourceMap =  {[key: string]: TorusResource[]};

const fs = require('fs');
const tmp = require('tmp');

export function convert(mediaSummary: Media.MediaSummary, file: string)
    : Promise<(TorusResource | string)[]> {
  return determineResourceType(file)
    .then((t: ResourceType) => {

      const item = create(t, file);
      console.log(file);

      let $ = DOM.read(file, { normalizeWhitespace: false });
      item.restructurePreservingWhitespace($);

      const tmpobj = tmp.fileSync();
      fs.writeFileSync(tmpobj.name, $.html());

      $ = DOM.read(tmpobj.name);

      Media.transformToFlatDirectory(file, $, mediaSummary);

      item.restructure($);

      const xml = $.html();
      return item.translate(xml, $);
    });
}

// For a collection of TorusResources, find all derivative resources
// and go update their parent document to include their actual references.
//
// 'Derivative resources' are a collection of Torus resources that were
// derived from a single OLI resource.  Cases where we encounter derivations:
// 1. Individual activity resources derived from a singular OLI assessment
//    resource (either summative or formative)
// 2. Individual activity resources derived from a singular question pool
//    resource
export function updateDerivativeReferences(resources: TorusResource[]) : TorusResource[] {

  // Bucket the resources by legacy_id.  These are the items whose now individual references
  // must updated in their parent resource
  const byLegacyId : DerivedResourceMap = bucketByLegacyId(resources);
  
  // Visit every resource, replacing legacy references with corresponding collection
  // of derivative references
  return resources.map((parent: TorusResource) => updateParentReference(parent, byLegacyId));

}

function bucketByLegacyId(resources: TorusResource[]) : DerivedResourceMap {

  return resources.reduce(
    (m: any, r: TorusResource) => {
      if (r.type === 'Activity') {
        const activity = r as Activity;
        if (activity.legacyId !== undefined && activity.legacyId !== null) {
          if (m[activity.legacyId] === undefined) {
            m[activity.legacyId] = [r];
          } else {
            m[activity.legacyId].push(r);
          }
        }
      }
      return m;
    },
    {},
  );

}

function getPurpose(purpose: string) {

  if (purpose === undefined || purpose === null) {
    return 'none';
  } else if (purpose === 'checkpoint' || purpose === 'didigetthis' || purpose === 'learnbydoing'
  || purpose === 'manystudentswonder' || purpose === 'learnmore') {
    return purpose;
  } 

  return 'none';

}

function updateParentReference(resource: TorusResource, byLegacyId: DerivedResourceMap) : TorusResource {
  
  if (resource.type === 'Page') {

    const page = resource as Page;
    (page.content as any).model = (page.content as any).model.reduce(
      (entries: any, m: any) => {
     
      if (m.type === 'activity_placeholder') {

        const derived = byLegacyId[m.idref];
        if (derived !== undefined) {
          return [...entries, ...derived.map(d => ({ type: 'activity-reference', activity_id: d.id, purpose: getPurpose(m.purpose) }))];
        }

        console.log('Warning: Could not find derived resources for ' + m.idref + ' within page ' + page.id);
        return entries;
      }
      return [...entries, m];
    },
    []
    );

    return page;
  }

  return resource;
}


export function output(
  projectSlug: string,
  courseDirectory: string,
  outputDirectory: string,
  hierarchy: TorusResource,
  converted: TorusResource[],
  mediaItems: Media.MediaItem[]) {

  return executeSerially([
    () => outputManifest(projectSlug, courseDirectory, outputDirectory),
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

function outputManifest(slug: string, courseDir: string, outputDirectory: string) {

  const $ = DOM.read(`${courseDir}/content/package.xml`);
  const title = $('package title').text();
  const description = $('package description').text();

  const manifest = {
    slug,
    title,
    description,
    type: 'Manifest',
  };

  return outputFile(`${outputDirectory}/_project.json`, manifest);
}

function outputHierarchy(outputDirectory: string, h: TorusResource) {
  return outputFile(`${outputDirectory}/_hierarchy.json`, h);
}

function outputMediaManifest(outputDirectory: string, mediaItems: Media.MediaItem[]) {

  const manifest = {
    mediaItems: mediaItems.map((m: Media.MediaItem) => ({ name: m.flattenedName, file: m.file, url: m.url, fileSize: m.fileSize, mimeType: m.mimeType, md5: m.md5 })),
    type: 'MediaManifest',
  };

  return outputFile(`${outputDirectory}/_media-manifest.json`, manifest);
}

function outputResource(outputDirectory: string, resource: TorusResource) {
  return outputFile(`${outputDirectory}/${resource.id}.json`, resource);
}

import { TorusResource, TemporaryContent, ResourceType, Page, Activity } from './resources/resource';
import { determineResourceType, create } from './resources/create';
import { executeSerially, guid, ItemReference } from './utils/common';
import * as Media from './media';
import * as DOM from './utils/dom';

type DerivedResourceMap =  {[key: string]: TorusResource[]};

const fs = require('fs');
const tmp = require('tmp');

export function convert(mediaSummary: Media.MediaSummary, file: string, navigable: boolean)
    : Promise<(TorusResource | string)[]> {
  return determineResourceType(file)
    .then((t: ResourceType) => {

      const item = create(t, file, navigable);
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

  const resourceActivityRefs = createResourceActivityRefs(resources);

  return resources.map((parent: TorusResource) => updateParentReference(parent, byLegacyId, resourceActivityRefs));

}

function createResourceActivityRefs(resources: TorusResource[]) : Object {
  return resources.reduce(
    (m: any, r: TorusResource) => {
      if (r.type === 'Page') {
        const page = r as Page;
        m[page.id] = page;
        return m;
      }
      return m;
    },
    {},
  );

}

function bucketByLegacyId(resources: TorusResource[]) : DerivedResourceMap {

  return resources.reduce(
    (m: any, r: TorusResource) => {
      if (r.type === 'Activity' || r.type === 'TemporaryContent') {
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

const selection = { selection: { anchor: { offset: 0, path: [0, 0] }, focus: { offset: 0, path: [1, 0] } } };

function createContentWithLink(title: string, idref: string, purpose: string) {
  return {
    type: 'content',
    purpose,
    id: guid(),
    selection,
    children: [
      {
        type: 'p',
        children: [
          {
            type: 'a',
            children: [
              {text: title}
            ],
            idref,
          }
        ]
      }
    ]
  };
}

function updateParentReference(resource: TorusResource, byLegacyId: DerivedResourceMap, pageMap: any) : TorusResource {
  
  if (resource.type === 'Page') {

    const page = resource as Page;
    (page.content as any).model = (page.content as any).model.reduce(
      (entries: any, m: any) => {
     
      if (m.type === 'activity_placeholder') {

        const derived = byLegacyId[m.idref];
        if (derived !== undefined) {
          return [...entries, ...derived.map(d => {
            if (d.type === 'Activity') {
              return { type: 'activity-reference', activity_id: d.id, purpose: getPurpose(m.purpose) };
            } else if (d.type === 'TemporaryContent') {
              return (d as TemporaryContent).content;
            }
          })];
        } else if (pageMap[m.idref] !== undefined) {
          const page = pageMap[m.idref];
          return [...entries, createContentWithLink(page.title, m.idref, m.purpose)];
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


export function generatePoolTags(resources: TorusResource[]) : TorusResource[] {
  const tags : any = {};

  const items = resources.filter(r => {

    if (r.type === 'Activity') {
      r.tags.forEach(t => {
        if (tags[t] === undefined) {
          tags[t] = {
            type: 'Tag',
            originalFile: null,
            id: t,
            title: 'Legacy Pool: ' + t,
            tags: [],
            unresolvedReferences: [],
            content: {}
          }
        }
      });
    }
    return r.type !== 'Unknown';
  })

  return [...items, ...Object.keys(tags).map(k => tags[k])];
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

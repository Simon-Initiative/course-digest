import {
  TorusResource,
  Objective,
  TemporaryContent,
  ResourceType,
  Page,
  Activity,
  NonDirectImageReference,
} from './resources/resource';
import { determineResourceType, create } from './resources/create';
import { executeSerially, guid, valueOr } from './utils/common';
import { wrapContentInSurveyOrGroup } from './resources/common';
import * as Media from './media';
import * as DOM from './utils/dom';
import * as fs from 'fs';
import * as tmp from 'tmp';
import { Organization } from './resources/organization';
import * as Magic from './utils/spreadsheet';

type DerivedResourceMap = { [key: string]: TorusResource[] };

export function convert(
  mediaSummary: Media.MediaSummary,
  file: string,
  navigable: boolean
): Promise<(TorusResource | string)[]> {
  return determineResourceType(file).then((t: ResourceType) => {
    const item = create(t, file, navigable);

    // print out current filename for progress/diagnostics
    console.log('Converting: ', file);

    let $ = DOM.read(file, { normalizeWhitespace: false });
    item.restructurePreservingWhitespace($);

    const tmpobj = tmp.fileSync();
    fs.writeFileSync(tmpobj.name, $.html());

    $ = DOM.read(tmpobj.name);

    Media.transformToFlatDirectory(file, $, mediaSummary);

    return item.translate($);
  });
}

export function applyMagicSpreadsheet(
  resources: TorusResource[],
  spreadsheetPath: string
): TorusResource[] {
  const magic = Magic.process(spreadsheetPath);

  if (magic !== null) {
    return applyMagic(resources, magic);
  }
  console.log(
    'Magic spreadsheet could not be found or is invalid. Check the names of the tabs within the sheet'
  );
  process.exit(1);
}

function applyMagic(resources: TorusResource[], m: Magic.MagicSpreadsheet) {
  // A helper function to create a mapping of original id to resource
  const createMap = (originalType: string, resources: TorusResource[]) =>
    resources.reduce((m: any, o) => {
      if (
        o.type === 'Objective' &&
        (o as Objective).originalType === originalType
      ) {
        m[(o as Objective).originalId] = o;
      }
      return m;
    }, {});

  let byObjectiveId = createMap('objective', resources);
  let bySkillId = createMap('skill', resources);

  // Helper function to either update or create TorusResources based off of spreadsheet
  // equivalents.
  const createOrUpdate = (
    byId: any,
    originalType: string,
    collection: Magic.SpreadsheetObjective[] | Magic.SpreadsheetSkill[]
  ): TorusResource[] => {
    // Create new or update existing from the skills found in the spreadsheet
    return (collection as any).reduce((m: any, s: any) => {
      if (byId[s.id] === undefined) {
        const newObjective = {
          type: 'Objective',
          id: s.id,
          legacyPath: '',
          legacyId: s.id,
          originalId: s.id,
          originalType,
          parameters: s.parameters,
          title: s.title,
          tags: [],
          unresolvedReferences: [],
          content: {},
          objectives: [],
          warnings: [],
        } as TorusResource;

        return [...m, newObjective];
      } else {
        const existing = byId[s.id];
        existing.parameters = s.parameters;

        return m;
      }
    }, []);
  };

  // Now lets update and create skills and objectives from the sheets, combining the new resources with
  // the existing resources into a new array that we will use as the return value
  const updatedResources = [
    ...resources,
    ...createOrUpdate(bySkillId, 'skill', m.skills),
    ...createOrUpdate(byObjectiveId, 'objective', m.objectives),
  ];

  // But first, we need to update activity attachments:
  byObjectiveId = createMap('objective', updatedResources);
  bySkillId = createMap('skill', updatedResources);

  const byActivityId = resources.reduce((m: any, o) => {
    if (o.type === 'Activity') {
      m[o.id] = o;
    }
    return m;
  }, {});
  m.attachments.forEach((a: Magic.SpreadsheetAttachment) => {
    const activity = byActivityId[a.resourceId + '-' + a.questionId];
    if (activity !== undefined) {
      const objectives = activity.objectives;

      const mappedSkillIds = a.skillIds.map((id) => {
        return bySkillId[id].id;
      });

      // If no partId specified, apply the skills to all parts present in the activity
      if (a.partId === null) {
        activity.objectives = Object.keys(objectives).reduce(
          (m: any, k: string) => {
            m[k] = mappedSkillIds;
            return m;
          },
          {}
        );
      } else {
        objectives[a.partId] = mappedSkillIds;
      }
    } else {
      console.log(
        `warning: could not locate activity referenced from spreadsheet, resourceId: ${a.resourceId} questionId: ${a.questionId}`
      );
    }
  });

  // Finally, update the objective-skill parent-child relationships
  m.objectives.forEach((a: Magic.SpreadsheetObjective) => {
    const objective = byObjectiveId[a.id];
    if (objective !== undefined) {
      const mappedSkillIds = a.skillIds.map((id) => {
        return bySkillId[id].id;
      });

      objective.objectives = [...objective.objectives, ...mappedSkillIds];
    }
  });

  return updatedResources;
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
export function updateDerivativeReferences(
  resources: TorusResource[]
): TorusResource[] {
  // Bucket the resources by legacy_id.  These are the items whose now individual references
  // must updated in their parent resource
  const byLegacyId: DerivedResourceMap = bucketByLegacyId(resources);

  // Visit every resource, replacing legacy references with corresponding collection
  // of derivative references

  const resourceActivityRefs = createResourceActivityRefs(resources);

  const legacyMyResponseFeedbackIds =
    findLegacyMyResponseFeedbackIds(resources);

  return resources.map((parent: TorusResource) =>
    updateParentReference(
      parent,
      byLegacyId,
      resourceActivityRefs,
      legacyMyResponseFeedbackIds
    )
  );
}

export function createProducts(
  resources: TorusResource[],
  orgPaths: string[],
  baseOrgPath: string
): Promise<TorusResource[]> {
  const exceptPrimaryOrg = orgPaths
    .filter((p) => p !== baseOrgPath && !p.endsWith(baseOrgPath))
    .map((path) => {
      const o = new Organization(path, false);
      const $ = DOM.read(path, { normalizeWhitespace: true });
      return () => o.translateProduct($);
    });

  return new Promise((resolve, _reject) => {
    executeSerially(exceptPrimaryOrg).then((results: TorusResource[]) => {
      const products = results.map((r: any) => {
        r.type = 'Product';
        r.id = guid();
        return r;
      });
      resolve([...resources, ...products]);
    });
  });
}

function createResourceActivityRefs(
  resources: TorusResource[]
): Record<string, unknown> {
  return resources.reduce((m: any, r: TorusResource) => {
    if (r.type === 'Page') {
      const page = r as Page;
      m[page.id] = page;
      return m;
    }
    return m;
  }, {});
}

// Pages will have an "objectives" attribute that is an array of
// objective ids (the objectives that are attached this the page). These ids
// are the ids of only the <objective> element within the <objectives> resource,
// and are not truly global.  The Objective TorusResource actually has ids that
// have, at this point, been made global.  We need to update all of the objectives
// attributes within Pages to replace the local id with the global one.
export function globalizeObjectiveReferences(
  resources: TorusResource[]
): TorusResource[] {
  // Make a map of the local to global.  The global id is of the form:
  // local|suffix, where local is the id of the objective, and suffix is the
  // id of the parent <objectives> element
  const localToGlobal = resources.reduce((m: any, r: TorusResource) => {
    if (r.type === 'Objective') {
      m[r.id] = `${r.id}-${r.parentId}`;
      (r as Objective).originalId = r.id;
      r.id = `${r.id}-${r.parentId}`;

      return m;
    }
    return m;
  }, {});

  const mapArray = (arr: string[]) => arr.map((id) => localToGlobal[id]);

  return resources.map((r: TorusResource) => {
    if (r.type === 'Page' || r.type === 'Objective') {
      (r as Page).objectives = mapArray((r as Page).objectives);
      return r;
    }
    if (r.type === 'Activity') {
      if (typeof (r as any).objectives === 'object') {
        const objectives = Object.keys((r as Activity).objectives).reduce(
          (m: any, k: any) => {
            m[k] = mapArray((r as Activity).objectives[k]);
            return m;
          },
          {}
        );

        (r as Activity).objectives = objectives;
      }

      return r;
    }
    return r;
  });
}

function bucketByLegacyId(resources: TorusResource[]): DerivedResourceMap {
  return resources.reduce((m: any, r: TorusResource) => {
    if (
      r.type === 'Activity' ||
      r.type === 'TemporaryContent' ||
      r.type === 'Break'
    ) {
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
  }, {});
}

function findLegacyMyResponseFeedbackIds(resources: TorusResource[]) {
  return resources.reduce((m: any, r: TorusResource) => {
    if (r.type === 'Page' && (r as Page).isSurvey === true) {
      m[r.id] = true;
    }

    return m;
  }, {});
}

const selection = {
  selection: {
    anchor: { offset: 0, path: [0, 0] },
    focus: { offset: 0, path: [1, 0] },
  },
};

function createContentWithLink(title: string, idref: string) {
  const content = {
    type: 'content',
    id: guid(),
    selection,
    children: [
      {
        type: 'p',
        children: [
          {
            type: 'a',
            children: [{ text: title }],
            idref,
          },
        ],
      },
    ],
  };

  return content;
}

function handleOnePlaceholder(
  entries: any,
  m: any,
  byLegacyId: DerivedResourceMap,
  pageMap: any,
  page: Page,
  legacyMyResponseFeedbackIds: Record<string, boolean>
) {
  const derived = byLegacyId[m.idref];

  if (derived !== undefined) {
    return [
      ...entries,
      wrapContentInSurveyOrGroup(
        derived.map((d) => {
          if (d.type === 'Activity') {
            return {
              type: 'activity-reference',
              activity_id: d.id,
              id: guid(),
            };
          }
          if (d.type === 'TemporaryContent') {
            return (d as TemporaryContent).content;
          }
          if (d.type === 'Break') {
            return {
              type: 'break',
              id: d.id,
            };
          }
        }),
        m,
        legacyMyResponseFeedbackIds
      ),
    ];
  }
  if (pageMap[m.idref] !== undefined) {
    const page = pageMap[m.idref];
    return [
      ...entries,
      wrapContentInSurveyOrGroup(
        [createContentWithLink(page.title, m.idref)],
        m,
        legacyMyResponseFeedbackIds
      ),
    ];
  }

  console.log(
    `Warning: Could not find derived resources for ${m.idref} within page ${page.id}`
  );

  return entries;
}

function updateParentReference(
  parent: TorusResource,
  byLegacyId: DerivedResourceMap,
  pageMap: any,
  legacyMyResponseFeedbackIds: Record<string, boolean>
): TorusResource {
  if (parent.type === 'Page') {
    const page = parent as Page;
    (page.content as any).model = (page.content as any).model.reduce(
      (entries: any, m: any) => {
        if (m.type === 'activity_placeholder') {
          return handleOnePlaceholder(
            entries,
            m,
            byLegacyId,
            pageMap,
            page,
            legacyMyResponseFeedbackIds
          );
        } else if (m.type === 'group') {
          const group = Object.assign({}, m, {
            purpose: valueOr(m.purpose, 'none'),
            children: m.children.map((c: any) => {
              if (c.type === 'activity_placeholder') {
                return handleOnePlaceholder(
                  [],
                  c,
                  byLegacyId,
                  pageMap,
                  page,
                  legacyMyResponseFeedbackIds
                )[0];
              } else {
                return c;
              }
            }),
          });
          return [...entries, group];
        }

        return [...entries, m];
      },
      []
    );

    return page;
  }

  return parent;
}

export function updateNonDirectImageReferences(
  resources: TorusResource[],
  summary: Media.MediaSummary
): TorusResource[] {
  return resources.map((r: TorusResource) => {
    if (
      r.type === 'Activity' &&
      (r as Activity).subType === 'oli_custom_dnd' &&
      (r as Activity).imageReferences !== undefined &&
      ((r as Activity).imageReferences as any).length > 0
    ) {
      Media.transformToFlatDirectoryURLReferences(
        (r as Activity).imageReferences as NonDirectImageReference[],
        r as Activity,
        summary
      );
    }
    return r;
  });
}

export function relativizeLegacyPaths(
  resources: TorusResource[],
  svnRoot: string
): TorusResource[] {
  const lastSvnDir = svnRoot.substring(svnRoot.lastIndexOf('/') + 1);
  return resources.map((r: TorusResource) => {
    const { legacyPath } = r;
    if (legacyPath !== null && legacyPath !== undefined && legacyPath !== '') {
      r.legacyPath = r.legacyPath.substring(
        r.legacyPath.indexOf(lastSvnDir) + lastSvnDir.length
      );
    }
    return r;
  });
}

export function generatePoolTags(resources: TorusResource[]): TorusResource[] {
  const tags: any = {};

  const items = resources.filter((r) => {
    if (r.type === 'Activity') {
      r.tags.forEach((t) => {
        if (tags[t] === undefined) {
          tags[t] = {
            type: 'Tag',
            legacyPath: null,
            legacyId: t,
            id: t,
            title: `Legacy Pool: ${t}`,
            tags: [],
            unresolvedReferences: [],
            content: {},
          };
        }
      });
    }
    return r.type !== 'Unknown';
  });

  return [...items, ...Object.keys(tags).map((k) => tags[k])];
}

// For every group that contained a branching assessment, set the paginationMode attr
// to 'automatedReveal'
export function setGroupPaginationModes(
  resources: TorusResource[]
): TorusResource[] {
  const items = resources
    .filter((r) => {
      if (r.type === 'Activity') {
        return (r as any).content.authoring.parts.some((part: any) => {
          return part.responses.some((r: any) => r.showPage !== undefined);
        });
      }
      return false;
    })
    .reduce((m: any, a) => {
      m[a.id] = a;
      return m;
    }, {});

  let activitiesRemaining = Object.keys(items).length;
  // Written in an imperative style, as it is far easier to optimze the performance. If
  // there are no branching activites, we do nothing, otherwise we only traverse the
  // content of pages until we find all the activities.
  for (let i = 0; i < resources.length && activitiesRemaining > 0; i++) {
    const resource = resources[i];
    if (resource.type === 'Page' && resource.unresolvedReferences.length > 0) {
      activitiesRemaining -= setGroupPaginationModesForPage(
        resource as Page,
        items
      );
    }
  }

  return resources;
}

// Traverse the content of the given page, looking at all activity-references within a
// group to see if any of these activities match those referenced by 'items'.  If so,
// mark that group pagination mode as 'automatedReveal', and return all items that matched.
function setGroupPaginationModesForPage(page: Page, items: any) {
  let count = 0;
  for (let i = 0; i < (page.content as any).model.length; i++) {
    const child = (page.content as any).model[i];
    count = count + setGroupPaginationModesForPageHelper(child, items);
  }
  return count;
}

function setGroupPaginationModesForPageHelper(item: any, items: any) {
  if (item.type === 'group') {
    let count = 0;
    for (let i = 0; i < item.children.length; i++) {
      const child = item.children[i];
      if (
        child.type === 'activity-reference' &&
        items[child.activity_id] !== undefined
      ) {
        count++;
        item.paginationMode = 'automatedReveal';
      } else if (child.type === 'group') {
        count = count + setGroupPaginationModesForPageHelper(child, items);
      }
    }
    return count;
  }
  return 0;
}

export function output(
  courseDirectory: string,
  outputDirectory: string,
  svnRoot: string,
  hierarchy: TorusResource,
  converted: TorusResource[],
  mediaItems: Media.MediaItem[]
) {
  return executeSerially([
    () => wipeAndCreateOutput(outputDirectory),
    () => outputManifest(courseDirectory, outputDirectory, svnRoot),
    () => outputHierarchy(outputDirectory, hierarchy),
    () => outputMediaManifest(outputDirectory, mediaItems),
    ...converted.map((r) => () => outputResource(outputDirectory, r)),
  ]);
}

function outputFile(path: string, o: any): Promise<boolean> {
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

async function wipeAndCreateOutput(outputDir: string) {
  // delete non-empty directory and recreate
  return new Promise<void>((resolve, reject) =>
    fs.existsSync(outputDir)
      ? fs.rm(outputDir, { recursive: true }, (err) =>
          err ? reject(err) : resolve()
        )
      : resolve()
  ).then(
    () =>
      new Promise<void>((resolve, reject) =>
        fs.mkdir(outputDir, (err) => (err ? reject(err) : resolve()))
      )
  );
}

function outputManifest(
  courseDir: string,
  outputDirectory: string,
  svnRoot: string
) {
  const $ = DOM.read(`${courseDir}/content/package.xml`);
  const title = $('package title').text();
  const description = $('package description').text();

  const manifest = {
    title,
    description,
    svnRoot,
    type: 'Manifest',
  };

  return outputFile(`${outputDirectory}/_project.json`, manifest);
}

function outputHierarchy(outputDirectory: string, h: TorusResource) {
  return outputFile(`${outputDirectory}/_hierarchy.json`, h);
}

function outputMediaManifest(
  outputDirectory: string,
  mediaItems: Media.MediaItem[]
) {
  const manifest = {
    mediaItems: mediaItems.map((m: Media.MediaItem) => ({
      name: m.flattenedName,
      file: m.file,
      url: m.url,
      fileSize: m.fileSize,
      mimeType: m.mimeType,
      md5: m.md5,
    })),
    type: 'MediaManifest',
  };

  return outputFile(`${outputDirectory}/_media-manifest.json`, manifest);
}

function outputResource(outputDirectory: string, resource: TorusResource) {
  return outputFile(`${outputDirectory}/${resource.id}.json`, resource);
}

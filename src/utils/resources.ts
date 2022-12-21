import * as glob from 'glob';

import { executeSerially } from 'src/utils/common';
import * as Resources from 'src/resources/resource';
import * as Orgs from 'src/resources/organization';
import * as DOM from 'src/utils/dom';

// Build a map of resource ids to the full path of the resource for all resources
// found in the OLI legacy course project directory

export type ResourceMap = { [index: string]: string };
export function mapResources(directory: string): Promise<ResourceMap> {
  return new Promise((resolve, _reject) => {
    glob(`${directory}/**/*.xml`, {}, (_err: any, files: any) => {
      const result = files.reduce((p: any, c: string) => {
        const filename = c.substr(c.lastIndexOf('/') + 1);
        const id = filename.substr(0, filename.lastIndexOf('.xml'));
        p[id] = c;
        return p;
      }, {});

      resolve(result);
    });
  });
}

export function mapResourcesInNamedDirectory(
  root: string,
  directory: string
): Promise<ResourceMap> {
  return new Promise((resolve, _reject) => {
    glob(`${root}/**/${directory}/*.xml`, {}, (_err: any, files: any) => {
      const result = files.reduce((p: any, c: string) => {
        const filename = c.substr(c.lastIndexOf('/') + 1);
        const id = filename.substr(0, filename.lastIndexOf('.xml'));
        p[id] = c;
        return p;
      }, {});

      resolve(result);
    });
  });
}

function determineDefaultOrgId(packageDirectory: string) {
  const $ = DOM.read(
    `${packageDirectory}/organizations/default/organization.xml`
  );
  return $('organization').first().attr('id');
}

export function collectOrgItemReferences(packageDirectory: string) {
  const files = glob.sync(`${packageDirectory}/**/*.xml`, {});
  const id = determineDefaultOrgId(packageDirectory);

  const filesById = files.reduce((m: any, f) => {
    const lastPart = f.substring(f.lastIndexOf('/') + 1);

    // parse out the resource id from the file name "test.1.xml" => "test"
    const lastPeriod = lastPart.lastIndexOf('.');
    const resourceId = lastPart.substring(0, lastPeriod);
    m[resourceId] = f;
    return m;
  }, {});

  return Orgs.locate(packageDirectory).then((orgs) =>
    executeSerially(
      orgs.map((file) => () => {
        const o = new Orgs.Organization(file, false);
        return o.summarize();
      })
    ).then((results: (string | Resources.Summary)[]) => {
      const seenReferences = {} as any;
      const references: string[] = [];
      const referencesOthers: string[] = [];

      results.forEach((r) => {
        if (typeof r !== 'string') {
          r.found().forEach((i) => {

            // If this is the first time we have encountered this resource
            if (seenReferences[i.id] === undefined) {

              if (id === '' || id === r.id) {
                seenReferences[i.id] = true;
                references.push(i.id);
              } else {
                // Add references from all other organization files that are
                // not part of the main org

                if (filesById[i.id] !== undefined) {
                  seenReferences[i.id] = true;
                  references.push(i.id);
                  referencesOthers.push(i.id);
                }
              }
            }
          });
        }
      });

      const orgReferences = {} as any;
      orgReferences['orgReferences'] = references;
      orgReferences['orgReferencesOthers'] = referencesOthers;
      orgReferences['organizationPaths'] = orgs;

      return orgReferences;
    })
  );
}

export function getLearningObjectiveIds(packageDirectory: string) {
  return mapResourcesInNamedDirectory(
    `${packageDirectory}/content`,
    'x-oli-learning_objectives'
  ).then((map) => Object.keys(map));
}

export function getSkillIds(packageDirectory: string) {
  return mapResourcesInNamedDirectory(
    `${packageDirectory}/content`,
    'x-oli-skills_model'
  ).then((map) => Object.keys(map));
}

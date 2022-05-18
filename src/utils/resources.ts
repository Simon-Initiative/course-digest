import * as glob from 'glob';
import { executeSerially } from '../utils/common';
import * as Resources from '../resources/resource';
import * as Orgs from '../resources/organization';

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

export function collectOrgItemReferences(packageDirectory: string, id = '') {
  return Orgs.locate(packageDirectory).then((orgs) =>
    executeSerially(
      orgs.map((file) => () => {
        const o = new Orgs.Organization(file, false);
        return o.summarize(file);
      })
    ).then((results: (string | Resources.Summary)[]) => {
      const seenReferences = {} as any;
      const references: string[] = [];
      const referencesOthers: string[] = [];

      results.forEach((r) => {
        if (typeof r !== 'string') {
          r.found().forEach((i) => {
            if (seenReferences[i.id] === undefined) {
              if (id === '' || id === r.id) {
                seenReferences[i.id] = true;
                references.push(i.id);
              } else {
                // Add references from all other organization files that are
                // not part of the main org
                // Ensure referenced file exists
                const files = glob.sync(
                  `${packageDirectory}/**/${i.id}.xml`,
                  {}
                );
                if (files && files.length > 0) {
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

      return orgReferences;
    })
  );
}

export function getLearningObjectiveIds(packageDirectory: string) {
  return mapResources(
    `${packageDirectory}/content/x-oli-learning_objectives`
  ).then((map) => Object.keys(map));
}

export function getSkillIds(packageDirectory: string) {
  return mapResources(`${packageDirectory}/content/x-oli-skills_model`).then(
    (map) => Object.keys(map)
  );
}

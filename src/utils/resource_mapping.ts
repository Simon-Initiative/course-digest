import glob from 'glob';

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

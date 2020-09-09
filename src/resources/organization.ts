
const glob = require('glob');
import { visit, TagVisitor } from '../utils/xml';
import { ItemReference } from '../utils/common';

// Locate all organizations and return an array of the file paths to the
// organization.xml file for each
export function locate(directory: string) : Promise<string[]> {
  return new Promise((resolve, reject) => {
    glob(`${directory}/organizations/*/organization.xml`, {}, (err: any, files: any) => {
      resolve(files);
    });
  });
}

export type OrganizationSummary = {
  type: 'OrganizationSummary',
  itemReferences: ItemReference[],
  id: string,
  version: string,
};

// Summarize an organization
export function summarize(file: string) : Promise<OrganizationSummary | string> {

  const summary : OrganizationSummary = {
    type: 'OrganizationSummary',
    itemReferences: [],
    id: '',
    version: '',
  };

  return new Promise((resolve, reject) => {

    visit(file, (tag: string, attrs: Object) => {

      if (tag === 'resourceref') {
        summary.itemReferences.push({ id: (attrs as any)['idref'] });
      }
      if (tag === 'organization') {
        summary.id = (attrs as any)['id'];
        summary.version = (attrs as any)['version'];
      }
    })
    .then((result) => {
      resolve(summary);
    })
    .catch(err => reject(err));
  });
}

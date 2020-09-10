const glob = require('glob');
import { rootTag } from '../utils/xml';
import * as Histogram from '../utils/histogram';

// Build a map of resource ids to the full path of the resource for all resources
// found in the project directory

import * as WB from './workbook';
import * as Org from './organization';
import * as Other from './other';

export type Summary = WB.WorkbookPageSummary | Org.OrganizationSummary | Other.OtherSummary;

export type ResourceType = 'WorkbookPage' | 'Organization' | 'Other';

export type ResourceMap = { [index:string] : string };
export function mapResources(directory: string) : Promise<ResourceMap> {
  return new Promise((resolve, reject) => {
    glob(`${directory}/**/*.xml`, {}, (err: any, files: any) => {

      const result = files.reduce(
        (p: any, c: string) => {

          const filename = c.substr(c.lastIndexOf('/') + 1);
          const id = filename.substr(0, filename.lastIndexOf('.xml'));
          p[id] = c;
          return p;
        },
        {});

      resolve(result);
    });
  });
}

function determineResourceType(file: string) : Promise<ResourceType> {
  return rootTag(file)
  .then((tag: string) => {

    if (tag === 'organization') {
      return 'Organization';
    }
    if (tag.indexOf('oli_workbook_page_3_8') !== -1) {
      return 'WorkbookPage';
    }
    return 'Other';
  });
}

export function summarize(file: string): Promise<Summary | string> {

  return new Promise((resolve, reject) => {
    determineResourceType(file)
    .then((t: ResourceType) => {
      if (t === 'WorkbookPage') {
        resolve(WB.summarize(file));
      } else if (t === 'Organization') {
        resolve(WB.summarize(file));
      } else {
        resolve(Other.summarize(file));
      }
    });
  });
}

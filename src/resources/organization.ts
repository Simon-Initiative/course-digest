
const glob = require('glob');
import { visit } from '../utils/xml';
import { ItemReference } from '../utils/common';
import * as Histogram from '../utils/histogram';

import { Resource, TorusResource, Summary } from './resource';

export class Organization extends Resource {

  restructure($: any) : any {

  }

  translate(xml: string) : Promise<TorusResource> {

  }

  summarize(file: string): Promise<string | Summary> {

    const foundIds: ItemReference[] = [];
    const summary : Summary = {
      type: 'Summary',
      id: '',
      elementHistogram: Histogram.create(),
      found: () => foundIds,
    };

    return new Promise((resolve, reject) => {

      visit(file, (tag: string, attrs: Object) => {

        Histogram.update(summary.elementHistogram, tag, attrs);

        if (tag === 'resourceref') {
          foundIds.push({ id: ((attrs as any)['idref']).trim() });
        }
        if (tag === 'organization') {
          summary.id = (attrs as any)['id'];
        }
      })
      .then((result) => {
        resolve(summary);
      })
      .catch(err => reject(err));
    });
  }
}

// Locate all organizations and return an array of the file paths to the
// organization.xml file for each
export function locate(directory: string) : Promise<string[]> {
  return new Promise((resolve, reject) => {
    glob(`${directory}/organizations/*/organization.xml`, {}, (err: any, files: any) => {
      resolve(files);
    });
  });
}

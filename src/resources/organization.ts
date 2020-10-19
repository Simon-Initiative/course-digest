
const glob = require('glob');
import { ItemReference } from '../utils/common';
import * as Histogram from '../utils/histogram';
import * as DOM from '../utils/dom';
import * as XML from '../utils/xml';

import { Resource, TorusResource, Hierarchy, Container, PageReference, Summary } from './resource';

export class Organization extends Resource {

  restructure($: any) : any {
    DOM.flattenResourceRefs($);
    DOM.mergeTitles($);
    DOM.rename($, 'sequence', 'container');
    DOM.rename($, 'unit', 'container');
    DOM.rename($, 'module', 'container');
    DOM.rename($, 'section', 'container');
  }

  translate(xml: string) : Promise<(TorusResource | string)[]> {

    const foundIds: ItemReference[] = [];
    const h : Hierarchy = {
      type: 'Hierarchy',
      id: '',
      originalFile: '',
      title: '',
      tags: [],
      unresolvedReferences: [],
      children: [],
    };


    return new Promise((resolve, reject) => {
      XML.toJSON2(xml).then((r: any) => {
        h.children = [r];
        resolve([h]);
      });
    });
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

      XML.visit(file, (tag: string, attrs: Object) => {

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

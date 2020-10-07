import * as Histogram from '../utils/histogram';
import { ItemReference } from '../utils/common';

export interface Summary {
  type: 'Summary';
  id: string;
  elementHistogram: Histogram.ElementHistogram;
  found: () => ItemReference[];
}

export type ResourceType = 'WorkbookPage' | 'Organization'
| 'Formative' | 'Summative' | 'Feedback' | 'Other';

export type TorusResourceType = Container | Page | Activity | Objective;

export interface TorusResource {
  originalFile: string;
  id: string;
  title: string;
  tags: string[];
  itemReferences: string[];
  found: () => string[];
}

export interface Container extends TorusResource {
  type: 'Container';
  children: TorusResource[];
}

export interface Page extends TorusResource {
  type: 'Page';
  content: Object;
  isGraded: boolean;
  objectives: Object;
}

export interface Activity extends TorusResource {
  type: 'Activity';
  content: Object;
  objectives: Object;
}

export interface Objective extends TorusResource {
  type: 'Objective';
  children: TorusResource[];
}

const elementNameMap : { [index:string] : string } = {
  img: 'image',
};

const attributeNameMap : { [index:string] : Object } = {
  img: {
    href: 'src',
  },
};

const attributeValueMap : { [index:string] : Object } = {
  img: {
    target: {
      self: null,
      new: '_blank',
    },
  },
};

export abstract class Resource {

  abstract summarize(file: string): Promise<Summary | string>;

  abstract toTorus(file: string): Promise<TorusResource | string>;

  mapElementName(element: string) : string {
    return elementNameMap[element] === undefined ? element : elementNameMap[element];
  }

  mapAttributeName(element: string, attribute: string) : string {
    if (attributeNameMap[element] !== undefined) {
      if ((attributeNameMap[element] as any)[attribute] !== undefined) {
        return (attributeNameMap[element] as any)[attribute];
      }
    }
    return attribute;
  }

  mapAttributeValue(element: string, attribute: string, value: string) : string {
    if (attributeValueMap[element] !== undefined) {
      if ((attributeValueMap[element] as any)[attribute] !== undefined) {
        if ((((attributeValueMap[element] as any)[attribute]) as any)[value] !== undefined) {
          return ((((attributeValueMap[element] as any)[attribute]) as any)[value]);
        }
      }
    }
    return value;
  }

}

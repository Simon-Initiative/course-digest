import * as Histogram from '../utils/histogram';
import { ItemReference } from '../utils/common';
import * as DOM from '../utils/dom';

export interface Summary {
  type: 'Summary';
  subType: string;
  id: string;
  elementHistogram: Histogram.ElementHistogram;
  found: () => ItemReference[];
}

export type ResourceType = 'WorkbookPage' | 'Organization' | 'Objectives'
| 'Formative' | 'Summative' | 'Feedback' | 'Superactivity' | 'Other';

export type TorusResourceType = Hierarchy | Page | Activity | Objective | Unknown;

export interface TorusResource {
  type: string;
  originalFile: string;
  id: string;
  title: string;
  tags: string[];
  unresolvedReferences: string[];
}

export interface Container {
  id: string;
  title: string;
  tags: string[];
  children: (Container | PageReference)[];
}

export interface PageReference {
  id: string;
}

export interface Objective {
  id: string;
  title: string;
  children: Objective[];
}

export interface Hierarchy extends TorusResource {
  type: 'Hierarchy';
  children: TorusResource[];
}

export interface Unknown extends TorusResource {
  type: 'Unknown';
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
  legacyId: string;
  subType: string;
}

export interface Objective extends TorusResource {
  type: 'Objective';
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

  file: string;

  constructor(file: string) {
    this.file = file;
  }

  abstract summarize(file: string): Promise<Summary | string>;

  restructurePreservingWhitespace($: any): any {}

  restructure($: any): any {}

  abstract translate(xml: string, $: any): Promise<(TorusResource | string)[]>;

  convert(file: string): Promise<(TorusResource | string)[]> {
    const $ = DOM.read(file);
    this.restructure($);
    return this.translate($.root().html(), $);
  }

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

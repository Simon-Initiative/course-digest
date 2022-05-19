import * as Histogram from '../utils/histogram';
import { ItemReference } from '../utils/common';
import * as DOM from '../utils/dom';
import { Maybe } from 'tsmonad';

export interface Summary {
  type: 'Summary';
  subType: string;
  id: string;
  elementHistogram: Histogram.ElementHistogram;
  found: () => ItemReference[];
}

export type ResourceType =
  | 'WorkbookPage'
  | 'Organization'
  | 'Objectives'
  | 'Pool'
  | 'Formative'
  | 'Summative'
  | 'Feedback'
  | 'Superactivity'
  | 'Skills'
  | 'Other'
  | 'TemporaryContent';

export type TorusResourceType =
  | Hierarchy
  | Page
  | Activity
  | Objective
  | Unknown;

export interface TorusResource {
  type: string;
  originalFile: string;
  id: string;
  parentId?: string;
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

export interface TemporaryContent extends TorusResource {
  type: 'TemporaryContent';
  content: Record<string, unknown>;
}

export interface Unknown extends TorusResource {
  type: 'Unknown';
}

export interface Page extends TorusResource {
  type: 'Page';
  content: Record<string, unknown>;
  isGraded: boolean;
  objectives: any[];
}

export interface Activity extends TorusResource {
  type: 'Activity';
  content: Record<string, unknown>;
  objectives: any[];
  legacyId: string;
  subType: string;
  scope?: string;
}

export interface Objective extends TorusResource {
  type: 'Objective';
}

const elementNameMap: { [index: string]: string } = {
  img: 'image',
};

const attributeNameMap: { [index: string]: Record<string, unknown> } = {
  img: {
    href: 'src',
  },
};

const attributeValueMap: { [index: string]: Record<string, unknown> } = {
  img: {
    target: {
      self: null,
      new: '_blank',
    },
  },
};

export abstract class Resource {
  file: string;
  navigable: boolean;

  constructor(file: string, navigable: boolean) {
    this.file = file;
    this.navigable = navigable;
  }

  abstract summarize(file: string): Promise<Summary | string>;

  restructurePreservingWhitespace(_$: any): any {
    return;
  }

  restructure(_$: any): any {
    return;
  }

  abstract translate(xml: string, $: any): Promise<(TorusResource | string)[]>;

  convert(file: string): Promise<(TorusResource | string)[]> {
    const $ = DOM.read(file);
    this.restructure($);
    return Maybe.maybe($?.root()?.html()).caseOf({
      just: (xml) => this.translate(xml, $),
      nothing: () => {
        throw Error('Failed to convert: html element not found');
      },
    });
  }

  mapElementName(element: string): string {
    return elementNameMap[element] === undefined
      ? element
      : elementNameMap[element];
  }

  mapAttributeName(element: string, attribute: string): string {
    if (attributeNameMap[element] !== undefined) {
      if ((attributeNameMap[element] as any)[attribute] !== undefined) {
        return (attributeNameMap[element] as any)[attribute];
      }
    }
    return attribute;
  }

  mapAttributeValue(element: string, attribute: string, value: string): string {
    if (attributeValueMap[element] !== undefined) {
      if ((attributeValueMap[element] as any)[attribute] !== undefined) {
        if (
          ((attributeValueMap[element] as any)[attribute] as any)[value] !==
          undefined
        ) {
          return ((attributeValueMap[element] as any)[attribute] as any)[value];
        }
      }
    }
    return value;
  }
}

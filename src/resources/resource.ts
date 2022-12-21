import * as Histogram from 'src/utils/histogram';
import { ItemReference } from 'src/utils/common';
import * as DOM from 'src/utils/dom';
import * as tmp from 'tmp';
import * as fs from 'fs';
import { Maybe } from 'tsmonad';
import { ProjectSummary } from 'src/project';

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
  | 'Discussion'
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
  legacyPath: string;
  legacyId: string;
  id: string;
  parentId?: string;
  title: string;
  tags: string[];
  unresolvedReferences: string[];
  warnings: ContentWarning[];
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
  originalId: string;
  originalType: 'objective' | 'skill';
  parameters: Record<string, any>;
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

export interface ContentWarning {
  idref: string | null;
  description: string;
}

export interface Unknown extends TorusResource {
  type: 'Unknown';
}

export interface CollabSpaceDefinition {
  status: string;
  threaded: boolean;
  auto_accept: boolean;
  show_full_history: boolean;
  participation_min_replies: number;
  participation_min_posts: number;
}

export function defaultCollabSpaceDefinition() : CollabSpaceDefinition{
  return {
    status: 'disabled',
    threaded: true,
    auto_accept: true,
    show_full_history: true,
    participation_min_posts: 0,
    participation_min_replies: 0
  };
}

export interface Page extends TorusResource {
  type: 'Page';
  content: Record<string, unknown>;
  isGraded: boolean;
  isSurvey: boolean;
  collabSpace: CollabSpaceDefinition;
  objectives: any[];
}

export type NonDirectImageReference = {
  originalReference: string;
  assetReference: string;
};

export interface Activity extends TorusResource {
  type: 'Activity';
  content: Record<string, unknown>;
  objectives: any[];
  legacyId: string;
  subType: string;
  scope?: string;
  imageReferences?: NonDirectImageReference[];
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

  abstract summarize(): Promise<Summary | string>;

  restructurePreservingWhitespace(_$: any): any {
    return;
  }

  convert(projectSummary: ProjectSummary): Promise<(TorusResource | string)[]> {
    let $ = DOM.read(this.file, { normalizeWhitespace: false });
    this.restructurePreservingWhitespace($);

    const tmpobj = tmp.fileSync();
    fs.writeFileSync(tmpobj.name, $.html());

    $ = DOM.read(tmpobj.name);

    return Maybe.maybe($?.root()?.html()).caseOf({
      just: (_xml) => this.translate($, projectSummary),
      nothing: () => {
        throw Error('Failed to convert: html element not found');
      },
    });
  }

  abstract translate(
    $: any,
    projectSummary: ProjectSummary
  ): Promise<(TorusResource | string)[]>;

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

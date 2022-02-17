import { rootTag } from '../utils/xml';
import { Resource, ResourceType } from './resource';

import * as WB from './workbook';
import * as Org from './organization';
import * as Other from './other';
import * as Feedback from './feedback';
import * as Formative from './formative';
import * as Summative from './summative';
import * as Objectives from './objectives';
import * as Pool from './pool';
import * as Skills from './skills';
import * as Superactivity from './superactivity';

const minVersions: Record<string, string> = {
  oli_workbook_page: '3_5',
  oli_workbook_page_mathml: '3_5',
  oli_assessment: '2_3',
  oli_assessment_mathml: '2_3',
  oli_inline_assessment: '1_3',
  oli_inline_assessment_mathml: '1_3',
};

export function determineResourceType(file: string): Promise<ResourceType> {
  return rootTag(file).then((tag: string) => {
    // split dtd filename to get version suffix
    const [, dtdBase, dtdVersion] = /\/dtd\/([^\d]+)_(\d.*)\.dtd/.exec(tag) || [];

    // lexicographic string comparison on version suffix suffices
    const minVersion = minVersions[dtdBase] || '';
    if (dtdVersion < minVersion) {
      console.error(`unsupported DTD version: ${dtdBase} ${dtdVersion}`);
      return 'Other';
    }

    if (tag.indexOf('oli_skills_model') !== -1) {
      return 'Skills';
    }
    if (tag.indexOf('DTD Assessment Pool') !== -1) {
      return 'Pool';
    }
    if (tag.indexOf('organization') !== -1) {
      return 'Organization';
    }
    if (tag.indexOf('oli_workbook_page') !== -1) {
      return 'WorkbookPage';
    }
    if (tag.indexOf('oli_inline_assessment') !== -1) {
      return 'Formative';
    }
    if (tag.indexOf('oli_assessment') !== -1) {
      return 'Summative';
    }
    if (tag.indexOf('oli_feedback') !== -1) {
      return 'Feedback';
    }
    if (tag.indexOf('oli_learning_objectives') !== -1) {
      return 'Objectives';
    }
    if (tag.indexOf('oli-embed-activity') !== -1 ||
        tag.indexOf('oli-linked-activity') !== -1 ||
      tag.indexOf('cmu-ctat-tutor') !== -1) {
      return 'Superactivity';
    }

    return 'Other';
  });
}

export function create(t: ResourceType, file: string, navigable: boolean): Resource {
  if (t === 'WorkbookPage') {
    return new WB.WorkbookPage(file, navigable);
  }
  if (t === 'Organization') {
    return new Org.Organization(file, navigable);
  }
  if (t === 'Formative') {
    return new Formative.Formative(file, navigable);
  }
  if (t === 'Summative') {
    return new Summative.Summative(file, navigable);
  }
  if (t === 'Feedback') {
    return new Feedback.Feedback(file, navigable);
  }
  if (t === 'Objectives') {
    return new Objectives.Objectives(file, navigable);
  }
  if (t === 'Superactivity') {
    return new Superactivity.Superactivity(file, navigable);
  }
  if (t === 'Pool') {
    return new Pool.Pool(file, navigable);
  }
  if (t === 'Skills') {
    return new Skills.Skills(file, navigable);
  }
  return new Other.Other(file, navigable);
}

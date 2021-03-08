
import { rootTag } from '../utils/xml';
import { Resource, ResourceType } from './resource';

import * as WB from './workbook';
import * as Org from './organization';
import * as Other from './other';
import * as Feedback from './feedback';
import * as Formative from './formative';
import * as Summative from './summative';
import * as Objectives from './objectives';

export function determineResourceType(file: string) : Promise<ResourceType> {
  return rootTag(file)
  .then((tag: string) => {

    if (tag.indexOf('organization') !== -1) {
      return 'Organization';
    }
    if (tag.indexOf('oli_workbook_page_3_8') !== -1
      || tag.indexOf('oli_workbook_page_mathml_3_8') !== -1) {
      return 'WorkbookPage';
    }
    if (tag.indexOf('oli_inline_assessment_1_4') !== -1
      || tag.indexOf('oli_inline_assessment_mathml_1_4') !== -1) {
      return 'Formative';
    }
    if (tag.indexOf('oli_assessment_2_4') !== -1
      || tag.indexOf('oli_assessment_mathml_2_4') !== -1) {
      return 'Summative';
    }
    if (tag.indexOf('oli_feedback_1_2') !== -1) {
      return 'Feedback';
    }
    if (tag.indexOf('oli_learning_objectives_2_0') !== -1) {
      return 'Objectives';
    }

    return 'Other';
  });
}

export function create(t: ResourceType) : Resource {
  if (t === 'WorkbookPage') {
    return new WB.WorkbookPage();
  }
  if (t === 'Organization') {
    return new Org.Organization();
  }
  if (t === 'Formative') {
    return new Formative.Formative();
  }
  if (t === 'Summative') {
    return new Summative.Summative();
  }
  if (t === 'Feedback') {
    return new Feedback.Feedback();
  }
  if (t === 'Objectives') {
    return new Objectives.Objectives();
  }
  return new Other.Other();
}

import { rootTag } from '../utils/xml';
import { Resource, ResourceType } from './resource';

import * as WB from './workbook';
import * as Org from './organization';
import * as Other from './other';
import * as Feedback from './feedback';
import * as Formative from './formative';
import * as Summative from './summative';
import * as Objectives from './objectives';
import * as Superactivity from './superactivity';

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
    if (tag.indexOf('oli_feedback_1_2') !== -1 || tag.indexOf('oli_feedback_1_0') !== -1) {
      return 'Feedback';
    }
    if (tag.indexOf('oli_learning_objectives_2_0') !== -1) {
      return 'Objectives';
    }
    if (tag.indexOf('oli-embed-activity_1.0') !== -1) {
      return 'Superactivity';
    }

    return 'Other';
  });
}

export function create(t: ResourceType, file: string) : Resource {
  if (t === 'WorkbookPage') {
    return new WB.WorkbookPage(file);
  }
  if (t === 'Organization') {
    return new Org.Organization(file);
  }
  if (t === 'Formative') {
    return new Formative.Formative(file);
  }
  if (t === 'Summative') {
    return new Summative.Summative(file);
  }
  if (t === 'Feedback') {
    return new Feedback.Feedback(file);
  }
  if (t === 'Objectives') {
    return new Objectives.Objectives(file);
  }
  if (t === 'Superactivity') {
    return new Superactivity.Superactivity(file);
  }
  return new Other.Other(file);
}

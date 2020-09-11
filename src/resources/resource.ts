const glob = require('glob');
import { rootTag } from '../utils/xml';
import * as Histogram from '../utils/histogram';

// Build a map of resource ids to the full path of the resource for all resources
// found in the project directory

import * as WB from './workbook';
import * as Org from './organization';
import * as Other from './other';
import * as Feedback from './feedback';
import * as Formative from './formative';
import * as Summative from './summative';

export type Summary = WB.WorkbookPageSummary | Org.OrganizationSummary 
  | Feedback.FeedbackSummary | Formative.FormativeSummary | Summative.SummativeSummary 
  | Other.OtherSummary;

export type ResourceType = 'WorkbookPage' | 'Organization'
| 'Formative' | 'Summative' | 'Feedback' | 'Other';

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
        resolve(Org.summarize(file));
      } else if (t === 'Formative') {
        resolve(Formative.summarize(file));
      } else if (t === 'Summative') {
        resolve(Summative.summarize(file));
      } else if (t === 'Feedback') {
        resolve(Feedback.summarize(file));
      } else {
        resolve(Other.summarize(file));
      }
    });
  });
}

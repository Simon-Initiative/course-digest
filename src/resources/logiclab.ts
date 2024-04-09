import * as Histogram from 'src/utils/histogram';
import { ItemReference, guid } from 'src/utils/common';
import {
  Resource,
  TorusResource,
  Summary,
  Page,
  defaultCollabSpaceDefinition,
  Activity,
} from './resource';
import * as XML from 'src/utils/xml';
import { ProjectSummary } from 'src/project';
import { visit } from 'src/utils/xml';
import {
  getChild,
  getChildren,
  getDescendants,
  hint,
  makeFeedback,
} from './questions/common';

//
// LogicLab superactivity descriptor
//
// expected to contain one problem set definition containing one or more problem references as follows:
/*
    <logiclab id="ps_lab_intro_statements" width="950" height="600">
      <title>Lab: Statements and Arguments</title>
      <source>webcontent/logiclab/activity.js</source>
      <content>
        <problem_set id="ps_lab_intro_statements" title="Lab: Statements and Arguments" score="all">
          <problem id="ps_lab_intro_statements_problem_1" title="Problem 1">
            <item id="standard_form_1" lab="argumentlab" />
          </problem>
          <problem id="ps_lab_intro_statements_problem_2" title="Problem 2">
            <item id="standard_form_2" lab="argumentlab" />
          </problem>
        </problem_set>
      </content>
    </logiclab>
*/
//
// We effectively treat this like a summative assessment page, converting the
// the whole problem set to a torus graded page containing references to the
// problem activities, each of which is converted to a logiclab activity resource
//
export class LogicLab extends Resource {
  translate(
    $: any,
    projectSummary: ProjectSummary
  ): Promise<(TorusResource | string)[]> {
    // no restructuring, just go straight to JSON parse
    return new Promise((resolve, _reject) => {
      XML.toJSON($.html(), projectSummary, {
        description: true,
        em: true,
      }).then((r: any) => {
        // find the problem_set object, should be just one
        const ps = getDescendants(r.children, 'problem_set')[0];

        // converts one logiclab problem object to logiclab activity, a thin
        // wrapper around the lab's internal problem id, specified in item element.
        const problemToActivity = (problem: any): Activity => {
          const model = {
            activity: getChild(problem, 'item').id,
            authoring: {
              parts: [
                {
                  id: '1',
                  outOf: problem.worth ? problem.worth : null,
                  responses: [],
                  scoringStrategy: 'best',
                  targets: [],
                  gradingApproach: 'automatic',
                  hints: [hint()],
                },
              ],
              previewText: '',
              transformations: [],
              version: 1,
            },
            feedback: [makeFeedback('incomplete'), makeFeedback('complete')],
          };

          return {
            type: 'Activity',
            subType: 'oli_logic_lab',
            id: guid(),
            legacyId: problem.id,
            legacyPath: this.file,
            // Friendly title combines problem set and problem number
            title: ps.title + ' - ' + problem.title,
            tags: [],
            unresolvedReferences: [],
            content: model,
            objectives: [],
            warnings: [],
          };
        };

        // convert the problems to torus activities
        const activities = getChildren(ps, 'problem').map(problemToActivity);

        // build content model for page, including problem references
        // model is list of content blocks and activity references
        const model: any[] = [];

        // add paragraph with description text
        const description = getChild(ps, 'description');
        if (description) {
          const text = description.children[0].text;
          const paragraph = { type: 'p', children: [{ text }] };
          model.push({ type: 'content', children: [paragraph] });
        }

        // include each problem with title and activity ref
        activities.forEach((activity: Activity) => {
          const legacyTitle = activity.title.split(' - ')[1];
          const title = { type: 'h6', children: [{ text: legacyTitle }] };
          model.push({ type: 'content', children: [title] });

          model.push({
            type: 'activity_placeholder',
            children: [],
            idref: activity.legacyId,
          });
        });

        // create the wrapper workbook page
        const page: Page = {
          type: 'Page',
          id: ps.id,
          legacyPath: this.file,
          legacyId: ps.id,
          title: ps.title,
          tags: [],
          unresolvedReferences: [],
          content: { model },
          isGraded: true,
          isSurvey: false,
          objectives: [],
          warnings: [],
          collabSpace: defaultCollabSpaceDefinition(),
        };

        resolve([page, ...activities]);
      });
    });
  }

  summarize(): Promise<string | Summary> {
    const foundIds: ItemReference[] = [];
    const summary: Summary = {
      type: 'Summary',
      subType: 'LogicLab',
      elementHistogram: Histogram.create(),
      id: '',
      found: () => foundIds,
    };

    return new Promise((resolve, reject) => {
      visit(this.file, (tag: string, attrs: Record<string, unknown>) => {
        Histogram.update(summary.elementHistogram, tag, attrs);
      })
        .then((_result) => {
          resolve(summary);
        })
        .catch((err) => reject(err));
    });
  }
}

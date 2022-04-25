import { visit } from '../utils/xml';
import * as Histogram from '../utils/histogram';
import { guid, ItemReference, replaceAll } from '../utils/common';
import {
  Resource,
  TorusResource,
  Summary,
  Activity,
  TemporaryContent,
} from './resource';
import { standardContentManipulations, processCodeblock } from './common';
import { cata } from './questions/cata';
import { buildMulti } from './questions/multi';
import * as DOM from '../utils/dom';
import * as XML from '../utils/xml';
import * as Common from './questions/common';

function usesSimpleModel(responses: any[]) {
  return hasCatchAll(responses) && responses.length <= 2;
}

function shouldUseSimpleModel(responses: any[]) {
  return !hasCatchAll(responses) && responses.length === 2;
}

function hasCatchAll(responses: any[]) {
  return responses.some((r) => r.match === 'input like {.*}');
}

function buildMCQPart(question: any) {
  const responses = Common.getChild(question.children, 'part').children.filter(
    (p: any) => p.type === 'response'
  );
  const hints = Common.getChild(question.children, 'part').children.filter(
    (p: any) => p.type === 'hint'
  );
  const skillrefs = Common.getChild(question.children, 'part').children.filter(
    (p: any) => p.type === 'skillref'
  );

  const r = responses.map((r: any) => ({
    id: guid(),
    score: r.score === undefined ? 0 : parseFloat(r.score),
    rule: `input like {${replaceAll(r.match, '\\*', '.*')}}`,
    legacyMatch: replaceAll(r.match, '\\*', '.*'),
    feedback: {
      id: guid(),
      content: { model: Common.ensureParagraphs(r.children[0].children) },
    },
  }));

  const model = {
    id: '1',
    version: 2,
    responses: r,
    hints: Common.ensureThree(
      hints.map((r: any) => ({
        id: guid(),
        content: { model: Common.ensureParagraphs(r.children) },
      }))
    ),
    scoringStrategy: 'average',
    targeted: [],
    objectives: skillrefs.map((s: any) => s.idref),
  };

  // Handle the specific case where there are exactly two choices
  // and no catch-all response
  if (shouldUseSimpleModel(r)) {
    const incorrect = r.filter((r: any) => r.score === 0)[0];
    const other = r.filter((r: any) => r.score !== 0)[0];
    incorrect.rule = 'input like {.*}';

    // Ensure the catch-all is last
    model.responses = [other, incorrect];
    return model;
  }

  if (usesSimpleModel(r)) {
    return model;
  }

  const targeted: any = [];

  r.forEach((r: any) => {
    if (r.legacyMatch !== '.*') {
      targeted.push([[r.legacyMatch], r.id]);
    }
  });

  model.targeted = targeted;

  if (!hasCatchAll(r)) {
    model.responses.push({
      id: guid(),
      score: 0,
      rule: 'input like {.*}',
      feedback: {
        id: guid(),
        content: { model: [{ type: 'p', children: [{ text: 'Incorrect.' }] }] },
      },
    });
  }

  return model;
}

function buildOrderingPart(question: any) {
  const responses = Common.getChild(question.children, 'part').children.filter(
    (p: any) => p.type === 'response'
  );
  const hints = Common.getChild(question.children, 'part').children.filter(
    (p: any) => p.type === 'hint'
  );
  const skillrefs = Common.getChild(question.children, 'part').children.filter(
    (p: any) => p.type === 'skillref'
  );

  return {
    id: '1',
    responses: responses.map((r: any) => {
      const id = guid();
      return {
        id,
        score: r.score === undefined ? 0 : parseInt(r.score),
        rule: `input like {${replaceAll(r.match, '\\*', '.*')}}`,
        legacyRule: replaceAll(r.match, '\\*', '.*'),
        feedback: {
          id: guid(),
          content: { model: Common.ensureParagraphs(r.children[0].children) },
        },
      };
    }),
    hints: Common.ensureThree(
      hints.map((r: any) => ({
        id: guid(),
        content: { model: Common.ensureParagraphs(r.children) },
      }))
    ),
    scoringStrategy: 'average',
    objectives: skillrefs.map((s: any) => s.idref),
  };
}

function mcq(question: any) {
  const part = buildMCQPart(question);
  const shuffle = Common.getChild(question.children, 'multiple_choice').shuffle;

  return {
    stem: Common.buildStem(question),
    choices: Common.buildChoices(question),
    authoring: {
      parts: [part],
      transformations:
        shuffle === 'true' ? [Common.shuffleTransformation()] : [],
      previewText: '',
      targeted: part.targeted,
    },
  };
}

function ordering(question: any) {
  const shuffle = Common.getChild(question.children, 'ordering').shuffle;
  const model = {
    stem: Common.buildStem(question),
    choices: Common.buildChoices(question, 'ordering'),
    authoring: {
      version: 2,
      parts: [buildOrderingPart(question)],
      transformations:
        shuffle === 'true' ? [Common.shuffleTransformation()] : [],
      previewText: '',
      correct: [],
      targeted: [],
    },
  };

  const correctResponse = model.authoring.parts[0].responses.filter(
    (r: any) => r.score !== undefined && r.score !== 0
  )[0];
  const correctIds = correctResponse.legacyRule.split(',');
  (model.authoring.correct as any).push(correctIds);
  (model.authoring.correct as any).push(correctResponse.id);

  if (!hasCatchAll(model.authoring.parts[0].responses)) {
    model.authoring.parts[0].responses.push({
      id: guid(),
      score: 0,
      rule: 'input like {.*}',
      feedback: {
        id: guid(),
        content: { model: [{ type: 'p', children: [{ text: 'Incorrect.' }] }] },
      },
    });
  }

  return model;
}

function single_response_text(question: any) {
  return {
    stem: Common.buildStem(question),
    inputType: 'text',
    authoring: {
      parts: [Common.buildTextPart(question)],
      transformations: [],
      previewText: '',
    },
  };
}

function buildModel(subType: ItemTypes, question: any) {
  if (subType === 'oli_multiple_choice') {
    return mcq(question);
  }
  if (subType === 'oli_check_all_that_apply') {
    return cata(question);
  }
  if (subType === 'oli_ordering') {
    return ordering(question);
  }
  if (subType === 'oli_multi_input') {
    return buildMulti(question);
  }

  return single_response_text(question);
}

export function toActivity(
  question: any,
  subType: ItemTypes,
  legacyId: string
) {
  const activity: Activity = {
    type: 'Activity',
    id: '',
    originalFile: '',
    title: '',
    tags: [],
    unresolvedReferences: [],
    content: {},
    objectives: [],
    legacyId,
    subType,
  };

  activity.id = legacyId + '-' + question.id;
  activity.content = buildModel(subType, question);
  activity.objectives = constructObjectives(
    (activity.content as any).authoring.parts
  );

  return activity;
}

function constructObjectives(parts: any): any {
  const objectives: any = {};
  parts.forEach((p: any) => {
    objectives[(p as any).id] = p.objectives;
  });
  return objectives;
}

type ItemTypes =
  | 'oli_multiple_choice'
  | 'oli_check_all_that_apply'
  | 'oli_short_answer'
  | 'oli_ordering'
  | 'oli_multi_input';

export function determineSubType(question: any): ItemTypes {
  const mcq = Common.getChild(question.children, 'multiple_choice');

  if (mcq !== undefined) {
    if (mcq.select && mcq.select === 'multiple') {
      return 'oli_check_all_that_apply';
    }
    return 'oli_multiple_choice';
  }

  const ordering = Common.getChild(question.children, 'ordering');
  if (ordering !== undefined) {
    return 'oli_ordering';
  }

  if (
    Common.getChild(question.children, 'numeric') !== undefined ||
    Common.getChild(question.children, 'text') !== undefined ||
    Common.getChild(question.children, 'fill_in_the_blank') !== undefined
  ) {
    return 'oli_multi_input';
  }

  return 'oli_short_answer';
}

export function performRestructure($: any) {
  standardContentManipulations($);

  DOM.rename($, 'question body', 'stem');
  DOM.eliminateLevel($, 'section');
}

export class Formative extends Resource {
  restructurePreservingWhitespace($: any): any {
    processCodeblock($);
  }

  restructure($: any): any {
    performRestructure($);
  }

  translate(xml: string, _$: any): Promise<(TorusResource | string)[]> {
    return new Promise((resolve, _reject) => {
      XML.toJSON(xml, { p: true, em: true, li: true, td: true }).then(
        (r: any) => {
          const legacyId = r.children[0].id;
          const { items } = processAssessmentModel(
            legacyId,
            r.children[0].children
          );
          resolve(items);
        }
      );
    });
  }

  summarize(file: string): Promise<string | Summary> {
    const foundIds: ItemReference[] = [];
    const summary: Summary = {
      type: 'Summary',
      subType: 'Formative',
      elementHistogram: Histogram.create(),
      id: '',
      found: () => foundIds,
    };

    return new Promise((resolve, reject) => {
      visit(file, (tag: string, attrs: Record<string, unknown>) => {
        Histogram.update(summary.elementHistogram, tag, attrs);

        if (tag === 'assessment') {
          summary.id = (attrs as any)['id'];
        }
      })
        .then((_result) => {
          resolve(summary);
        })
        .catch((err) => reject(err));
    });
  }
}

export function processAssessmentModel(legacyId: string, children: any) {
  const items: any = [];
  const unresolvedReferences: any = [];
  let title = 'Unknown';

  const handleNestableItems = (item: any, pageId: string | null) => {
    if (item.type === 'question') {
      const subType = determineSubType(item);
      const activity = toActivity(item, subType, legacyId);
      items.push(activity);

      const a = {
        type: 'activity-reference',
        activity_id: activity.id,
        purpose: 'none',
      } as any;

      if (pageId !== null) {
        a.page = pageId;
      }

      return a;
    }
    if (item.type === 'selection') {
      if (item.children.length > 0) {
        // track the reference for the tag that will power this selection in Torus
        let tagId: any = null;

        const child = item.children[0];
        if (child.type === 'pool') {
          tagId = child.id;
          tagId = tagId === null || tagId === undefined ? guid() : tagId;

          child.children.forEach((c: any) => {
            if (c.type !== 'title' && c.type !== 'content') {
              const subType = determineSubType(c);
              const pooledActivity = toActivity(c, subType, legacyId);
              pooledActivity.tags = [tagId];
              pooledActivity.scope = 'banked';
              items.push(pooledActivity);
            }
          });
        } else if (child.type === 'pool_ref') {
          tagId = child.idref;
          unresolvedReferences.push(tagId);
        }

        const a = {
          type: 'selection',
          logic: {
            conditions: {
              operator: 'all',
              children: [
                {
                  fact: 'tags',
                  operator: 'equals',
                  value: [tagId],
                },
              ],
            },
          },
          count: parseInt(item.count),
          id: guid(),
          purpose: 'none',
        } as any;

        // If this activity reference is within a specific page, track that.
        if (pageId !== null) {
          a.page = pageId;
        }

        return a;
      }
    } else if (
      item.type === 'introduction' ||
      item.type === 'conclusion' ||
      item.type === 'content'
    ) {
      const content: any = Object.assign(
        {},
        { type: 'content', purpose: 'none', id: guid() },
        { children: item.children }
      );
      if (pageId !== null) {
        content.page = pageId;
      }

      items.push({
        type: 'TemporaryContent',
        id: content.id,
        originalFile: '',
        title: '',
        tags: [],
        unresolvedReferences: [],
        content,
        objectives: [],
        legacyId,
      } as TemporaryContent);

      return content;
    }
  };

  const model = children
    .reduce((previous: any, item: any) => {
      if (item.type === 'title') {
        title = item.children[0].text;
      } else if (item.type === 'page') {
        let pageId: string | null = null;
        if (item.id !== undefined) {
          pageId = item.id;
        } else {
          pageId = guid();
        }

        return [
          ...previous,
          ...item.children
            .filter((c: any) => c.type !== 'title')
            .map((c: any) => handleNestableItems(c, pageId)),
        ];
      } else {
        return [...previous, handleNestableItems(item, null)];
      }
      return previous;
    }, [])
    .filter((e: any) => e !== undefined);

  return {
    model,
    items,
    title,
    unresolvedReferences,
  };
}

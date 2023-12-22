import { visit } from 'src/utils/xml';
import * as Histogram from 'src/utils/histogram';
import { guid, ItemReference } from 'src/utils/common';
import {
  Resource,
  TorusResource,
  Summary,
  Activity,
  TemporaryContent,
} from './resource';
import {
  standardContentManipulations,
  processCodeblock,
  processVariables,
  failIfPresent,
  failIfHasValue,
} from './common';
import {
  findCustomTag,
  process as processCustomDnd,
} from './questions/custom-dnd';
import { cata } from './questions/cata';
import { buildMulti, buildResponseMulti } from './questions/multi';
import * as DOM from 'src/utils/dom';
import * as XML from 'src/utils/xml';
import * as Common from './questions/common';
import { ProjectSummary } from 'src/project';
import { convertCatchAll } from './questions/common';

function usesSimpleModel(responses: any[]) {
  return Common.hasCatchAll(responses) && responses.length <= 2;
}

function shouldUseSimpleModel(responses: any[]) {
  return !Common.hasCatchAll(responses) && responses.length === 2;
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

  const r = responses.map((r: any) => {
    const item: any = {
      id: guid(),
      score: r.score === undefined ? 0 : parseFloat(r.score),
      rule: `input like {${convertCatchAll(r.match)}}`,
      legacyMatch: convertCatchAll(r.match),
      feedback: {
        id: guid(),
        content: Common.getFeedbackModel(r),
      },
    };
    const showPage = Common.getBranchingTarget(r);
    if (showPage !== undefined) {
      item.showPage = showPage;
    }
    return item;
  });

  const model = {
    id: Common.getPartIds(question)[0],
    responses: r,
    hints: Common.ensureThree(
      hints.map((r: any) => ({
        id: guid(),
        content: Common.ensureParagraphs(r.children),
      }))
    ),
    scoringStrategy: 'average',
    targeted: [],
    objectives: skillrefs.map((s: any) => s.idref),
    explanation: Common.maybeBuildPartExplanation(responses),
  };

  // Handle the specific case where there are exactly two choices
  // and no catch-all response
  if (shouldUseSimpleModel(r)) {
    let incorrect = r.filter((r: any) => r.score === 0)[0];

    if (incorrect === undefined) {
      incorrect = Common.makeCatchAllResponse();
      r.push(incorrect);
    } else {
      incorrect.rule = 'input like {.*}';
    }

    let other = r.filter((r: any) => r.score !== 0)[0];
    if (other === null || other === undefined) {
      other = r.filter((r: any) => r.id !== incorrect.id)[0];
    }

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

  Common.ensureCatchAllResponse(model.responses);

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
    id: Common.getPartIds(question)[0],
    responses: responses.map((r: any) => {
      const id = guid();
      const cleanedMatch = convertCatchAll(r.match);
      // change legacy a,b,c to torus {a b c}. No effect on catchAll so safe on all matches
      const torusMatch = cleanedMatch.split(/\s*,\s*/).join(' ');
      const item: any = {
        id,
        score: r.score === undefined ? 0 : parseInt(r.score),

        rule: `input like {${torusMatch}}`,
        legacyMatch: cleanedMatch,
        feedback: {
          id: guid(),
          content: Common.getFeedbackModel(r),
        },
      };
      const showPage = Common.getBranchingTarget(r);
      if (showPage !== undefined) {
        item.showPage = showPage;
      }
      return item;
    }),
    hints: Common.ensureThree(
      hints.map((r: any) => ({
        id: guid(),
        content: Common.ensureParagraphs(r.children),
      }))
    ),
    scoringStrategy: 'average',
    objectives: skillrefs.map((s: any) => s.idref),
    explanation: Common.maybeBuildPartExplanation(responses),
  };
}

function buildLikertSeriesItems(question: any) {
  const items = question.children.filter((p: any) => p.type === 'item');

  return items.map((item: any) => ({
    content: Common.ensureParagraphs(item.children),
    id: item.id,
    required: item.required,
  }));
}

function buildLikertItems(question: any) {
  const stem = Common.getChild(question.children, 'stem');

  return [
    {
      content: Common.ensureParagraphs(stem.children),
      id: guid(),
      required: false,
    },
  ];
}

function buildLikertParts(question: any, items: any[]) {
  const firstChoice = Common.buildChoices(question, 'likert_scale')[0];

  return items.map((i) => ({
    gradingApproach: 'automatic',
    hints: Common.ensureThree(),
    id: i.id,
    outOf: null,
    responses: [
      {
        id: guid(),
        score: 1,
        rule: `input like {${firstChoice.id}}`,
        feedback: {
          id: guid(),
          content: [{ type: 'p', children: [{ text: 'Correct.' }] }],
        },
      },
      Common.makeCatchAllResponse(),
    ],
    scoringStrategy: 'average',
    objectives: [],
    targeted: [],
    explanation: null,
  }));
}

function mcq(question: any, type = 'multiple_choice') {
  const part = buildMCQPart(question);
  const shuffle = Common.getChild(question.children, type).shuffle;
  const transformationElement = Common.getChild(
    question.children,
    'transformation'
  );
  const mc = Common.getChild(question.children, type);
  const mcqId = mc.id;
  const transformationsArray =
    transformationElement === undefined ? [] : [transformationElement];
  const stem = Common.buildStem(question);

  // Sometimes, there's a redundant input_ref in the input for a multiple_choice question, so let's
  // strip that out. See MER-2147 for more details.
  stem.content = Common.ensureNoEmptyChildren(
    Common.removeRedundantInputRefs(stem.content, mcqId)
  );

  return {
    stem,
    choices: Common.buildChoices(question, type),
    authoring: {
      version: 2,
      parts: [part],

      transformations: [
        ...(shuffle === 'true' ? [Common.shuffleTransformation()] : []),
        ...transformationsArray,
      ],
      previewText: '',
      targeted: part.targeted,
    },
  };
}

function processImageHotspot(question: any) {
  const imageHotspot = Common.getChild(question.children, 'image_hotspot');
  // uses MCQ model for single selection, CATA model for multiple. Restructuring
  // <hotspot> to <choice> allows leveraging model-building code for those types
  const multiple = imageHotspot.select === 'multiple';
  const modelQ: any = multiple
    ? cata(question, 'image_hotspot')
    : mcq(question, 'image_hotspot');

  return {
    stem: modelQ.stem,
    choices: getHotspots(imageHotspot),
    multiple: multiple ? true : false,
    height: Number(imageHotspot.height),
    width: Number(imageHotspot.width),
    imageURL: imageHotspot.src,
    authoring: {
      parts: modelQ.authoring.parts,
      // used with CATA model only:
      correct: multiple ? modelQ.authoring.correct : [],
      previewText: modelQ.authoring.previewText,
      targeted: modelQ.authoring.targeted,
    },
  };
}

function getHotspots(imageHotspot: any) {
  return Common.getChildren(imageHotspot.children, 'choice').map((hs: any) => {
    const hotspot: any = {
      id: hs.value,
      coords: hs.coords.split(',').map(Number),
      // shape not needed, torus derives from number of coords
    };
    if (hs.title !== undefined) hotspot.title = hs.title;

    return hotspot;
  });
}

function ordering(question: any) {
  const shuffle = Common.getChild(question.children, 'ordering').shuffle;
  const transformationElement = Common.getChild(
    question.children,
    'transformation'
  );
  const transformationsArray =
    transformationElement === undefined ? [] : [transformationElement];

  const model: any = {
    stem: Common.buildStem(question),
    choices: Common.buildChoices(question, 'ordering'),
    authoring: {
      version: 2,
      parts: [buildOrderingPart(question)],
      transformations: [
        ...(shuffle === 'true' ? [Common.shuffleTransformation()] : []),
        ...transformationsArray,
      ],
      previewText: '',
      correct: [],
      targeted: [],
    },
  };

  // ordering choices may specify a custom color. Collect any into choiceID=>colorName map
  const colorMap: Map<string, string> = new Map();
  Common.getChild(question.children, 'ordering')
    .children.filter((c: any) => c.color !== undefined)
    .forEach((c: any) => colorMap.set(c.value, c.color));
  // Include optional map if custom color found, serialized as array of [id, color] pairs
  if (colorMap.size > 0) model.choiceColors = [...colorMap];

  const correctResponse = model.authoring.parts[0].responses.filter(
    (r: any) => r.score !== undefined && r.score !== 0
  )[0];

  const correctIds = correctResponse.legacyMatch.split(/\s*,\s*/);
  (model.authoring.correct as any).push(correctIds);
  (model.authoring.correct as any).push(correctResponse.id);

  Common.ensureCatchAllResponse(model.authoring.parts[0].responses);

  return model;
}

function single_response_text(question: any) {
  const transformation = Common.getChild(question.children, 'transformation');

  const response = Common.getChild(question.children, 'short_answer');
  const id = response?.id;

  const stem = Common.buildStem(question);
  stem.content = Common.ensureNoEmptyChildren(
    Common.removeRedundantInputRefs(stem.content, id)
  );

  return {
    stem,
    inputType: 'textarea',
    submitAndCompare: Common.isSubmitAndCompare(question),
    authoring: {
      parts: [Common.buildTextPart(Common.getPartIds(question)[0], question)],
      transformations: transformation === undefined ? [] : [transformation],
      previewText: '',
    },
  };
}

function likertOrLikertSeries(question: any) {
  const isLikertSeries =
    question.children.filter((p: any) => p.type === 'item').length > 0;

  return isLikertSeries ? likertSeries(question) : likert(question);
}

function likertSeries(question: any) {
  const items = buildLikertSeriesItems(question);

  return {
    stem: Common.buildStem(question),
    choices: Common.buildChoices(question, 'likert_scale'),
    items: buildLikertSeriesItems(question),
    orderDescending: false,
    authoring: {
      parts: buildLikertParts(question, items),
      transformations: [],
      previewText: '',
      targeted: [],
    },
  };
}

function likert(question: any) {
  const items = buildLikertItems(question);

  return {
    stem: Common.buildStemFromText(''),
    choices: Common.buildChoices(question, 'likert_scale'),
    items,
    orderDescending: false,
    authoring: {
      parts: buildLikertParts(question, items),
      transformations: [],
      previewText: '',
      targeted: [],
    },
  };
}

function buildModel(subType: ItemTypes, question: any, baseFileName: string) {
  if (subType === 'oli_multiple_choice') {
    return [mcq(question), []];
  }
  if (subType === 'oli_check_all_that_apply') {
    return [cata(question), []];
  }
  if (subType === 'oli_ordering') {
    return [ordering(question), []];
  }
  if (subType === 'oli_multi_input') {
    return [buildMulti(question), []];
  }
  if (subType === 'oli_response_multi') {
    return [buildResponseMulti(question), []];
  }
  if (subType === 'oli_custom_dnd') {
    const multipart = buildMulti(question, true, true);
    return processCustomDnd(multipart, baseFileName);
  }
  if (subType === 'oli_likert') {
    return [likertOrLikertSeries(question)];
  }
  if (subType === 'oli_image_hotspot') {
    return [processImageHotspot(question)];
  }

  return [single_response_text(question), []];
}

export function toActivity(
  question: any,
  subType: ItemTypes,
  legacyId: string,
  baseFileName: string,
  pageIdIndex: string[]
) {
  const activity: Activity = {
    type: 'Activity',
    id: '',
    legacyPath: baseFileName,
    title: '',
    tags: [],
    unresolvedReferences: [],
    content: {},
    objectives: [],
    legacyId,
    subType,
    warnings: [],
  };

  activity.id = legacyId + '-' + question.id;
  // provisional title, may be adjusted by caller w/more context
  activity.title = activity.id;

  const [content, imageReferences] = buildModel(
    subType,
    question,
    baseFileName
  );

  // collect refs from any internal links in stem content
  const links: any[] = Common.getDescendants(content.stem?.content, 'a');
  links.forEach((a: any) => {
    if (a.idref !== undefined && a.idref !== null) {
      activity.unresolvedReferences.push(a.idref);
    }
  });

  content.authoring.parts.forEach((p: any) => {
    p.responses = p.responses.map((r: any) => {
      if (r.showPage !== undefined) {
        const replacement = pageIdIndex.findIndex(
          (id) => id !== null && id.length > 1 && id.at(1) === r.showPage
        );
        if (replacement !== -1) {
          return Object.assign({}, r, { showPage: replacement });
        } else if (parseInt(r.showPage) >= 0) {
          return Object.assign({}, r, { showPage: parseInt(r.showPage) });
        }
        console.log(
          'Warning: could not replace page id with index in branching assessment: ' +
            legacyId
        );
      }
      return r;
    });
  });

  activity.content = content;
  activity.imageReferences = imageReferences;
  activity.objectives = constructObjectives(
    (activity.content as any).authoring.parts
  );

  return activity;
}

// Heuristic to try to construct activity title meaningful to author:
// Want title to indicate containing assessment or pool and item reference.
// Where source IDs don't contain guids, we assume they are meaningful ones
// constructed by course author so use them. Else use page title for page
// and "q" + index within page for item.

const containsGuid = (s: string): boolean => /[0-9a-fA-f]{32}/.test(s);

export function titleActivity(
  pageId: string,
  pageTitle: string | null,
  itemId: string,
  questionNumber: number
): string {
  let pagePart = pageId;
  if (containsGuid(pagePart)) {
    if (pageTitle && pageTitle !== 'Unknown') {
      pagePart = pageTitle.replace(/[^\w]|[ ]/g, '');
    }
  }
  const itemPart = containsGuid(itemId) ? 'q' + questionNumber : itemId;

  // Detect special case where author already qualified questionIds
  // by naming them with assessmentID prefix (done in Chem pools).
  // Check after guid replacement so only applies to non-GUID-based ids
  if (itemPart.startsWith(pagePart)) return itemPart;

  return pagePart + '-' + itemPart;
}

function constructObjectives(parts: any): any {
  const objectives: any = {};
  parts.forEach((p: any) => {
    objectives[(p as any).id] = p.objectives;
  });
  return objectives;
}

type ItemTypes =
  | 'oli_custom_dnd'
  | 'oli_multiple_choice'
  | 'oli_check_all_that_apply'
  | 'oli_short_answer'
  | 'oli_ordering'
  | 'oli_multi_input'
  | 'oli_response_multi'
  | 'oli_likert'
  | 'oli_image_hotspot';

export function determineSubType(question: any): ItemTypes {
  const mcq = Common.getChild(question.children, 'multiple_choice');

  if (mcq !== undefined) {
    if (mcq.select && mcq.select === 'multiple') {
      return 'oli_check_all_that_apply';
    }
    if (Common.getChildren(question.children, 'part').length > 1) {
      console.warn(
        question.id +
          ' Multi-part multiple choice unsupported; converting to dropdown choices '
      );
      Common.getChildren(question.children, 'multiple_choice').forEach(
        (input: any) => (input.type = 'fill_in_the_blank')
      );
      return 'oli_multi_input';
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
    const customTag = findCustomTag(question);
    if (customTag !== undefined && customTag.type === 'custom') {
      return 'oli_custom_dnd';
    }

    const mults = Common.getDescendants(question.children, 'response_mult');
    return mults.length > 0 ? 'oli_response_multi' : 'oli_multi_input';
  }

  const likert_scale = Common.getChild(question.children, 'likert_scale');
  if (likert_scale !== undefined) {
    return 'oli_likert';
  }

  if (Common.getChild(question.children, 'image_hotspot') !== undefined)
    return 'oli_image_hotspot';

  // Handle the case where the original question was a multi-input type but it did not
  // specify any '<input>' elements.  In thise case we restore its orginal type and we
  // create enough input elements (of the correct type) to allow it to convert correctly.
  if (
    question.originalType !== undefined &&
    Common.getChild(question.children, 'numeric') === undefined &&
    Common.getChild(question.children, 'text') === undefined
  ) {
    const parts = Common.getChildren(question.children, 'part');

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const firstResponse = Common.getChild(part.children, 'response');
      if (firstResponse !== undefined) {
        question.children.push({
          type: question.originalType,
          id: firstResponse.input,
        });
      }
    }

    return 'oli_multi_input';
  }

  return 'oli_short_answer';
}

export function performRestructure($: any) {
  standardContentManipulations($);

  DOM.rename($, 'question body', 'stem');
  DOM.remove($, 'no_response');
  DOM.eliminateLevel($, 'section');
  DOM.rename($, 'activity_link', 'a');

  // facilitates processing image hotspot questions:
  DOM.rename($, 'image_hotspot hotspot', 'choice');

  migrateVariables($);
}

function migrateVariables($: any) {
  DOM.rename($, 'question variables', 'transformation');

  $('variable').each((i: any, item: any) => {
    item.children = [];
    $(item).attr('variable', $(item).attr('name'));
  });

  $('transformation').each((i: any, item: any) => {
    $(item).attr('path', '');
    $(item).attr('operation', 'variable_substitution');
  });
}

export class Formative extends Resource {
  restructurePreservingWhitespace($: any): any {
    processCodeblock($);
    processVariables($);
  }

  translate(
    $: any,
    projectSummary: ProjectSummary
  ): Promise<(TorusResource | string)[]> {
    failIfPresent($, ['response_mult', 'grading_criteria']);

    failIfHasValue($, 'content', 'available', 'instructor_only');
    failIfHasValue($, 'content', 'available', 'feedback_only');
    failIfHasValue($, 'content', 'available', 'never');

    performRestructure($);
    const xml = $.html();
    return new Promise((resolve, _reject) => {
      XML.toJSON(xml, projectSummary, {
        p: true,
        em: true,
        li: true,
        td: true,
        choice: true,
        stem: true,
        hint: true,
        feedback: true,
        explanation: true,
        material: true,
        anchor: true,
        translation: true,
        dt: true,
        dd: true,
      }).then((r: any) => {
        const legacyId = r.children[0].id;
        // Summative processing generates a Page resource with content model, but
        // for formatives, we return list of contained resource "items" only,
        // ignoring any content model returned from processAssessmentModel, and
        // do not create a containing page resource. Post-processing of resource
        // set will replace placeholder on referencing pages with these items.
        const { items } = processAssessmentModel(
          legacyId,
          r.children[0].children,
          this.file
        );

        resolve(items);
      });
    });
  }

  summarize(): Promise<string | Summary> {
    const foundIds: ItemReference[] = [];
    const summary: Summary = {
      type: 'Summary',
      subType: 'Formative',
      elementHistogram: Histogram.create(),
      id: '',
      found: () => foundIds,
    };

    return new Promise((resolve, reject) => {
      visit(this.file, (tag: string, attrs: Record<string, unknown>) => {
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

export function processAssessmentModel(
  legacyId: string,
  children: any[],
  baseFileName: string
) {
  const items: any = [];
  const unresolvedReferences: any = [];
  let title = 'Unknown';
  let questionNumber = 1;

  const handleNestableItems = (
    item: any,
    pageId: string | null,
    pageIdIndex: string[]
  ) => {
    if (item.type === 'question') {
      const subType = determineSubType(item);
      const activity = toActivity(
        item,
        subType,
        legacyId,
        baseFileName,
        pageIdIndex
      );
      activity.title = titleActivity(
        legacyId,
        title,
        item.id,
        questionNumber++
      );
      items.push(activity);

      const a = {
        type: 'activity-reference',
        activity_id: activity.id,
        id: guid(),
      } as any;

      if (pageId !== null) {
        a.page = pageId;
      }

      return a;
    }
    if (item.type === 'selection') {
      if (item.scope === 'section') {
        console.warn(
          'Unsupported feature: section (question group) selection. Migrated assessment will not work.'
        );
      }
      if (item.children.length > 0) {
        // track the reference for the tag that will power this selection in Torus
        let tagId: any = null;

        const child = item.children[0];
        if (child.type === 'pool') {
          // question pool embedded inline after selection
          tagId = child.id;
          tagId = tagId === null || tagId === undefined ? guid() : tagId;
          let poolQuestionNumber = 1;

          child.children.forEach((c: any) => {
            if (c.type !== 'title' && c.type !== 'content') {
              const subType = determineSubType(c);
              const pooledActivity = toActivity(
                c,
                subType,
                legacyId,
                baseFileName,
                pageIdIndex
              );
              pooledActivity.title = titleActivity(
                tagId,
                child.title,
                c.id,
                poolQuestionNumber++
              );
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
          // for wildcard count meaning 'all in pool', enter pool tag here. Post-processing after all
          // resources seen will replace with count of items with that tag.
          count: item.count == '*' ? tagId : parseInt(item.count),
          id: guid(),
        } as any;

        // If this activity reference is within a specific page, track that.
        if (pageId !== null) {
          a.page = pageId;
        }

        // For formatives (inlines), must include selection as a found resource "item" so
        // post-processing can batch it into referencing wb page when replacing placeholder.
        // Works to package it as TemporaryContent. Include pool id as unresolved reference
        // to ensure pool gets added to recursive resource processing.
        items.push({
          type: 'TemporaryContent',
          subType: 'selection',
          legacyId,
          content: a,
          unresolvedReferences: [tagId],
          tags: [],
        });

        return a;
      }
    } else if (
      item.type === 'introduction' ||
      item.type === 'conclusion' ||
      item.type === 'content'
    ) {
      const content: any = Object.assign(
        {},
        { type: 'content', id: guid() },
        { children: item.children }
      );
      if (pageId !== null) {
        content.page = pageId;
      }

      items.push({
        type: 'TemporaryContent',
        id: content.id,
        legacyPath: '',
        title: '',
        tags: [],
        unresolvedReferences: [],
        content,
        objectives: [],
        legacyId,
        warnings: [],
      } as TemporaryContent);

      return content;
    }
  };

  const maybeInsertContentBreak = (modelItems: any[], index: number) => {
    if (index < children.length - 1) {
      const id = guid();
      items.push({ type: 'Break', id, legacyId });
      return [...modelItems, { type: 'break', id }];
    }

    return modelItems;
  };

  const pageIdIndex = createPageIdIndex(children);

  const model = children
    .reduce((previous: any, item: any, index) => {
      if (item.type === 'title') {
        title = item.children[0].text;
      } else if (item.type === 'page') {
        let pageId: string | null = null;
        if (item.id !== undefined) {
          pageId = item.id;
        } else {
          pageId = guid();
        }

        return maybeInsertContentBreak(
          [
            ...previous,
            ...item.children
              .filter((c: any) => c.type !== 'title')
              .map((c: any) => handleNestableItems(c, pageId, pageIdIndex)),
          ],
          index
        );
      } else {
        return [...previous, handleNestableItems(item, null, pageIdIndex)];
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

// Takes a collection of items, filters down to only pages,
function createPageIdIndex(children: any) {
  return children
    .filter((c: any) => c.type === 'page')
    .map((page: any) => (page.id === undefined ? null : page.id));
}

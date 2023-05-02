import { guid } from 'src/utils/common';
import * as Common from './common';
import { andRules, matchListRule } from './rules';
import { convertCatchAll } from './common';

// Helper. Assumes a correct ID is given
interface Identifiable {
  id: string;
  rule: string;
}
export function getByIdUnsafe<T extends Identifiable>(
  slice: T[],
  id: string
): T {
  return slice.find((c) => c.id === id) || slice[0];
}

// Choices
export const getChoice = (model: any, id: string) =>
  getByIdUnsafe(model.choices, id);
export const getChoiceIds = ([choiceIds]: any) => choiceIds;
export const getCorrectChoiceIds = (model: any) =>
  getChoiceIds(model.authoring.correct);
export const getIncorrectChoiceIds = (model: any) =>
  getChoiceIds(model.authoring.incorrect);
export const getTargetedChoiceIds = (model: any) =>
  model.authoring.targeted.map(getChoiceIds);
export const isCorrectChoice = (model: any, choiceId: string) =>
  getCorrectChoiceIds(model).includes(choiceId);

// Responses
export const getResponses = (model: any) => model.authoring.parts[0].responses;
export const getResponse = (model: any, id: string) =>
  getByIdUnsafe(getResponses(model), id);
export const getResponseId = ([, responseId]: any) => responseId;
export const getCorrectResponse = (model: any) =>
  getResponse(model, getResponseId(model.authoring.correct));
export const getIncorrectResponse = (model: any) =>
  getResponse(model, getResponseId(model.authoring.incorrect));
export const getTargetedResponses = (model: any) =>
  model.authoring.targeted.map((assoc: any) =>
    getResponse(model, getResponseId(assoc))
  );

// Hints
export const getHints = (model: any) => model.authoring.parts[0].hints;
export const getHint = (model: any, id: string) =>
  getByIdUnsafe(getHints(model), id);

// Rules
export const createRuleForIds = (toMatch: string[], notToMatch: string[]) =>
  unionRules(
    toMatch
      .map(createMatchRule)
      .concat(notToMatch.map((id) => invertRule(createMatchRule(id))))
  );
export const createMatchRule = (id: string) => `input like {${id}}`;
export const invertRule = (rule: string) => `(!(${rule}))`;
export const unionTwoRules = (rule1: string, rule2: string) =>
  `${rule2} && (${rule1})`;
export const unionRules = (rules: string[]) => rules.reduce(unionTwoRules);
export const disjoinTwoRules = (rule1: string, rule2: string) =>
  `${rule2} || (${rule1})`;
export const disjoinRules = (rules: string[]) => rules.reduce(disjoinTwoRules);

// Other
export function setDifference<T>(subtractedFrom: T[], toSubtract: T[]) {
  return subtractedFrom.filter((x) => !toSubtract.includes(x));
}

// Extract arg list from match pattern which may be set-theoretic form "<={ a,b, c }".
export function extractArgs(legacyPat: string): string[] {
  const setRuleMatch = legacyPat.match(/\{([^}]+)\}/);
  const argList = setRuleMatch ? setRuleMatch[1] : legacyPat;
  return argList.trim().split(/\s*,\s*/);
}

// For combining rules: union/disjoinRules take array of rule strings,
// and/orRules from rules.tsx take variable length argument lists.
// invertRule(x) => (!(x)) so parenthesized and parenthesizes its argument, but
// and/or/union/disjoinRules(X, Y, Z) => Z OP (Y OP (X)) w/no outer parens, so
// safe if top-level or used as non-final arg to another and/or/union, but would
// have to have result wrapped in parens to be safe as LAST argument to
// another and/or/union/disjoinRules.

export function convertSetRule(setOp: string, set: string[], all: string[]) {
  // examples use set=[A,B] all=[A,B,C,D]
  const others = setDifference(all, set);
  switch (setOp) {
    case '<=': // subset:  ! (like {C} || like {D})
      return invertRule(disjoinRules(others.map(createMatchRule)));
    case '<': // proper subset: ! (like {C} || like {D})) && ! (like {A} && like {B}))
      return others.length === 0
        ? // special case for proper subset of all (useful esp when correct = all)
          invertRule(unionRules(set.map(createMatchRule)))
        : andRules(
            invertRule(disjoinRules(others.map(createMatchRule))),
            invertRule(unionRules(set.map(createMatchRule)))
          );
    case '=':
      return matchListRule(all, set);
    case '!=':
      return invertRule(matchListRule(all, set));
    case '>=': // superset:  like {A} && like {B}
      return unionRules(set.map(createMatchRule));
    case '>': // proper superset: (like {A} && like {B}) && (like {C} || like {D})
      return andRules(
        disjoinRules(others.map(createMatchRule)),
        unionRules(set.map(createMatchRule))
      );
    case '><': // intersection: like {A} || like {B}
      return disjoinRules(set.map(createMatchRule));
      break;
    case '<>': // disjoint: ! (like {A} || like {B})
      return invertRule(disjoinRules(set.map(createMatchRule)));
      break;
    default:
      console.log('unrecognized set operator in match, ignored: ' + setOp);
      return matchListRule(all, set);
  }
}

/*
function convertSetRuleTrace(setOp: string, set: string[], all: string[]) {
  console.log(
    `convertSetRule: ${setOp}{${set.join(',')}}  U={${all.join(',')}}`
  );
  const result = convertSetRule(setOp, set, all);
  console.log('convertSetRule ==> ' + result);
  return result;
}
*/

// Update all response rules based on a model with new choices that
// are not yet reflected by the rules.

function findResponse(model: any, id: string) {
  const result = model.authoring.parts[0].responses.find(
    (r: any) => r.id === id
  );
  return result ? result : null;
}

// NB: this applies to a (normalized) legacy match pattern, NOT a torus rule
export const hasCatchAllMatch = (response: any) => response.rule === '.*';

const updateResponseRules = (model: any) => {
  const allChoices = model.choices.map((c: any) => c.id);

  // translate correct set response rule
  getCorrectResponse(model).rule = matchListRule(
    allChoices,
    getCorrectChoiceIds(model)
  );

  // translate legacy catchAll match to torus rule
  const catchAll = model.authoring.parts[0].responses.find(hasCatchAllMatch);
  if (catchAll) catchAll.rule = 'input like {.*}';

  // translate rules in targeted feedback responses, checking for set-theoretic match rules
  model.authoring.targeted.forEach((assoc: any) => {
    const r = findResponse(model, getResponseId(assoc));
    const setOpMatch = r.rule.match(/^([!<=>]+)\{/);
    r.rule = setOpMatch
      ? convertSetRule(setOpMatch[1], getChoiceIds(assoc), allChoices)
      : matchListRule(allChoices, getChoiceIds(assoc));
  });
};

export function buildCATAPart(question: any) {
  const responses = Common.getChild(question.children, 'part').children.filter(
    (p: any) => p.type === 'response'
  );
  const hints = Common.getChild(question.children, 'part').children.filter(
    (p: any) => p.type === 'hint'
  );
  const skillrefs = Common.getChild(question.children, 'part').children.filter(
    (p: any) => p.type === 'skillref'
  );

  const part = {
    id: Common.getPartIds(question)[0],
    responses: responses.map((r: any) => {
      const id = guid();
      const cleanedMatch = convertCatchAll(r.match);
      const item: any = {
        id,
        score: r.score === undefined ? 0 : parseInt(r.score),
        // "rule" assigned here is only provisional, holding catchAll-normalized
        // legacy match pattern to be translated later on
        rule: cleanedMatch,
        legacyMatch: cleanedMatch,
        namremoveSetOpse: r.name,
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
    targeted: [],
  };

  return part;
}

export function cata(question: any, from = 'multiple_choice') {
  const choices = Common.buildChoices(question, from);
  const choiceIds = choices.map((c: any) => c.id);
  const transformationElement = Common.getChild(
    question.children,
    'transformation'
  );
  const transformationsArray =
    transformationElement === undefined ? [] : [transformationElement];
  const model = {
    stem: Common.buildStem(question),
    choices,
    type: 'TargetedCATA',
    authoring: {
      version: 2,
      parts: [buildCATAPart(question)],
      transformations: [
        ...(question.shuffle ? [Common.shuffleTransformation()] : []),
        ...transformationsArray,
      ],
      previewText: '',
      targeted: [],
      correct: [],
      incorrect: [],
    },
  };
  const responseList = model.authoring.parts[0].responses;

  // Replaces any auto-generated incorrect responses with single catchall.
  Common.convertAutoGenResponses(model);

  let correctResponse = responseList.find(
    (r: any) => r.score !== undefined && r.score !== 0
  );
  // ensure a correct response if none
  if (correctResponse === null) {
    console.log('No correct response: ' + question.id);
    if (responseList.length === 0) {
      responseList.push({
        id: guid(),
        score: 1,
        rule: `${choiceIds[0]}`,
        feedback: Common.makeFeedback('Correct'),
      });
    }

    correctResponse = responseList[0];
  }

  // authoring display uses correct response id set to response pairing
  const correctIds = correctResponse.rule.split(',');
  (model.authoring.correct as any).push(correctIds, correctResponse.id);
  // incorrect id->response pairing no longer needed by latest V2 schema

  // ensure a catchAll response.
  if (!responseList.find(hasCatchAllMatch)) {
    responseList.push({
      id: guid(),
      score: 0,
      rule: '.*', // legacy match pattern awaiting translation below
      feedback: Common.makeFeedback('Correct'),
    });
  }

  // collect targeted feedback responses into mapping from choice ID lists displayed
  // in torus authoring interface. Any set-theoretic match rules still indexed by argument
  // sets so match patterns "a,b", "<{a,b}" [subset], and ">{a,b}" [superset] could all
  // co-exist, resulting in three entries which display as responses to [A,B], though are
  // not equivalent behind the scenes. Until torus authoring improved this is best we can do.
  responseList.forEach((r: any) => {
    if (r === undefined) console.log('UNDEFINED in response list');
    if (r.id !== correctResponse.id && !hasCatchAllMatch(r)) {
      (model.authoring.targeted as any).push([extractArgs(r.rule), r.id]);
    }
  });

  // this converts response rules
  updateResponseRules(model);

  return model;
}

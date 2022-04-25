import { guid } from '../../utils/common';
import * as Common from './common';

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

// Other
export function setDifference<T>(subtractedFrom: T[], toSubtract: T[]) {
  return subtractedFrom.filter((x) => !toSubtract.includes(x));
}

// Update all response rules based on a model with new choices that
// are not yet reflected by the rules.
export const updateCATAResponseRules = (model: any) => {
  getCorrectResponse(model).rule = createRuleForIds(
    getCorrectChoiceIds(model),
    getIncorrectChoiceIds(model)
  );

  const targetedRules: string[] = [];
  const allChoiceIds = model.choices.map((choice: any) => choice.id);

  model.authoring.targeted.forEach((assoc: any) => {
    const targetedRule = createRuleForIds(
      getChoiceIds(assoc),
      setDifference(allChoiceIds, getChoiceIds(assoc))
    );
    targetedRules.push(targetedRule);
    getResponse(model, getResponseId(assoc)).rule = targetedRule;
  });
  getIncorrectResponse(model).rule = unionRules(
    targetedRules
      .map(invertRule)
      .concat([invertRule(getCorrectResponse(model).rule)])
  );
};

function buildCATAPart(question: any) {
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
        rule: r.match,
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

export function cata(question: any) {
  const choices = Common.buildChoices(question);
  const choiceIds = choices.map((c: any) => c.id);

  const model = {
    stem: Common.buildStem(question),
    choices,
    type: 'TargetedCATA',
    authoring: {
      parts: [buildCATAPart(question)],
      transformations: question.shuffle ? [Common.shuffleTransformation()] : [],
      previewText: '',
      targeted: [],
      correct: [],
      incorrect: [],
    },
  };

  const correctResponse = model.authoring.parts[0].responses.filter(
    (r: any) => r.score !== undefined && r.score !== 0
  )[0];
  const correctIds = correctResponse.rule.split(',');
  (model.authoring.correct as any).push(correctIds);
  (model.authoring.correct as any).push(correctResponse.id);

  const incorrectIds = choiceIds.filter((x: any) => !correctIds.includes(x));
  const incorrectResponses = model.authoring.parts[0].responses.filter(
    (r: any) => r.rule === '*'
  );
  let incorrectResponse: any;
  if (incorrectResponses.length === 0) {
    const r: any = {
      id: guid(),
      score: 0,
      rule: '*',
      feedback: {
        id: guid(),
        content: {
          model: [
            { type: 'p', children: [{ text: 'Incorrect', children: [] }] },
          ],
        },
      },
    };
    model.authoring.parts[0].responses.push(r);
    incorrectResponse = r;
  } else {
    incorrectResponse = incorrectResponses[0];
  }
  (model.authoring.incorrect as any).push(incorrectIds);
  (model.authoring.incorrect as any).push(incorrectResponse.id);

  model.authoring.parts[0].responses.forEach((r: any) => {
    if (r.id !== correctResponse.id && r.id !== incorrectResponse.id) {
      (model.authoring.targeted as any).push([r.rule.split(','), r.id]);
    }
  });

  updateCATAResponseRules(model);

  return model;
}


// Helper. Assumes a correct ID is given
interface Identifiable { id: string, rule: string };
export function getByIdUnsafe<T extends Identifiable>(slice: T[], id: string): T {
  return slice.find(c => c.id === id) || slice[0];
}

// Choices
export const getChoice = (model: any, id: string) => getByIdUnsafe(model.choices, id);
export const getChoiceIds = ([choiceIds]: any) => choiceIds;
export const getCorrectChoiceIds = (model: any) => getChoiceIds(model.authoring.correct);
export const getIncorrectChoiceIds = (model: any) => getChoiceIds(model.authoring.incorrect);
export const getTargetedChoiceIds = (model: any) =>
  model.authoring.targeted.map(getChoiceIds);
export const isCorrectChoice = (model: any, choiceId: string) =>
  getCorrectChoiceIds(model).includes(choiceId);

// Responses
export const getResponses = (model: any) => model.authoring.parts[0].responses;
export const getResponse = (model: any, id: string) => getByIdUnsafe(getResponses(model), id);
export const getResponseId = ([, responseId]: any) => responseId;
export const getCorrectResponse = (model: any) =>
  getResponse(model, getResponseId(model.authoring.correct));
export const getIncorrectResponse = (model: any) =>
  getResponse(model, getResponseId(model.authoring.incorrect));
export const getTargetedResponses = (model: any) =>
  model.authoring.targeted.map((assoc: any) => getResponse(model, getResponseId(assoc)));

// Hints
export const getHints = (model: any) => model.authoring.parts[0].hints;
export const getHint = (model: any, id: string) => getByIdUnsafe(getHints(model), id);

// Rules
export const createRuleForIds = (toMatch: string[], notToMatch: string[]) =>
  unionRules(
    toMatch.map(createMatchRule)
    .concat(notToMatch.map(id => invertRule(createMatchRule(id)))));
export const createMatchRule = (id: string) => `input like {${id}}`;
export const invertRule = (rule: string) => `(!(${rule}))`;
export const unionTwoRules = (rule1: string, rule2: string) => `${rule2} && (${rule1})`;
export const unionRules = (rules: string[]) => rules.reduce(unionTwoRules);

// Other
export function setDifference<T>(subtractedFrom: T[], toSubtract: T[]) {
  return subtractedFrom.filter(x => !toSubtract.includes(x));
}

// Update all response rules based on a model with new choices that
// are not yet reflected by the rules.
export const updateCATAResponseRules = (model: any) => {

  getCorrectResponse(model).rule = createRuleForIds(
    getCorrectChoiceIds(model),
    getIncorrectChoiceIds(model));

  const targetedRules: string[] = [];
  const allChoiceIds = model.choices.map((choice: any) => choice.id);

  model.authoring.targeted.forEach((assoc: any) => {
    const targetedRule = createRuleForIds(
      getChoiceIds(assoc),
      setDifference(allChoiceIds, getChoiceIds(assoc)));
    targetedRules.push(targetedRule);
    getResponse(model, getResponseId(assoc)).rule = targetedRule;
  });
  getIncorrectResponse(model).rule = unionRules(
    targetedRules.map(invertRule)
      .concat([invertRule(getCorrectResponse(model).rule)]));
};

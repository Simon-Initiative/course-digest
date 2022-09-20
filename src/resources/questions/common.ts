import { maybe } from 'tsmonad';
import { guid, replaceAll } from 'src/utils/common';

export function getChild(collection: any, named: string) {
  const items = collection.filter((e: any) => named == e.type);
  if (items.length > 0) {
    return items[0];
  }
  return undefined;
}

export function getChildren(collection: any, named: string) {
  return collection.filter((e: any) => named == e.type);
}

export function convertAutoGenResponses(model: any) {
  const autoGens = model.authoring.parts[0].responses.filter(
    (r: any) => r.name !== undefined && r.name.indexOf('AUTOGEN') > -1
  );

  if (autoGens.length > 0) {
    model.authoring.parts[0].responses =
      model.authoring.parts[0].responses.filter(
        (r: any) => r.name === undefined || r.name.indexOf('AUTOGEN') === -1
      );

    const catchAll = autoGens[0];
    catchAll.rule = 'input like {.*}';
    model.authoring.parts[0].responses.push(catchAll);
  }
}

export function hasCatchAll(responses: any[]) {
  return responses.some((r) => r.match === 'input like {.*}');
}

export function hasCatchAllRule(responses: any[]) {
  return responses.some((r) => r.rule === 'input like {.*}');
}

export function ensureParagraphs(children: any) {
  if (children.length === 1 && children[0].text !== undefined) {
    return [{ type: 'p', children }];
  }
  return children;
}

export function buildStem(question: any) {
  const stem = getChild(question.children, 'stem');
  return {
    content: {
      model: ensureParagraphs(stem.children),
    },
  };
}

export function buildStemFromText(text: string) {
  return {
    content: buildContentModelFromText(text),
  };
}

export function buildContentModelFromText(text: string) {
  return {
    model: [{ type: 'p', children: [{ text }] }],
  };
}

export function shuffleTransformation() {
  return {
    id: guid(),
    path: 'choices',
    operation: 'shuffle',
  };
}

export function buildChoices(question: any, from = 'multiple_choice') {
  const choices = getChild(question.children, from).children as any[];

  return choices.map((c: any) => ({
    content: { model: ensureParagraphs(c.children) },
    id: c.value,
  }));
}

export const isSubmitAndCompare = (question: any) =>
  hasShortAnswer(question) && getParts(question).some((p) => hasExplanation(p));

type Element = { type: string; children?: Element[] };
type Part = { type: 'part'; children: Element[] };

const hasExplanation = (part: Part) =>
  part.children.some((e) => e.type === 'explanation');

const defaultModel = () => [{ type: 'p', children: [{ text: '' }] }];

const hasShortAnswer = (question: any) =>
  question.children.some((t: any) => t.type === 'short_answer');

const shortAnswerExplanationOrDefaultModel = (question: any) =>
  hasShortAnswer(question)
    ? maybe(
        question.children.find((t: any) => t.type === 'explanation')
      ).caseOf({
        just: (explanation) => ensureParagraphs(explanation.children),
        nothing: () => defaultModel(),
      })
    : defaultModel();

const getParts = (question: any): any[] =>
  question.children.filter((c: any) => c.type === 'part');

export function getFeedbackModel(response: any) {
  if (response.children === undefined || response.children.length === 0) {
    return [
      {
        type: 'p',
        children: [{ text: ' ' }],
      },
    ];
  }
  return ensureParagraphs(response.children[0].children);
}

const getResponseFeedbacks = (r: any) =>
  r.children.filter((c: any) => c.type === 'feedback');

export const maybeBuildPartExplanation = (responses: any[]) => {
  // explanation will be built from the first response that contains multiple feedbacks
  const responseWithMultipleFeedbacks = responses.find(
    (r) => getResponseFeedbacks(r).length > 1
  );

  if (responseWithMultipleFeedbacks) {
    // there are more than one feedback defined for this response which makes it
    // a multi-feedback. Since the torus model only supports a single explanation,
    // we use the next feedback after the main feedback for the explanation

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [_mainFeedback, explanationFeedback, ..._rest] = getResponseFeedbacks(
      responseWithMultipleFeedbacks
    );

    return {
      id: guid(),
      content: ensureParagraphs(explanationFeedback.children),
    };
  } else {
    return null;
  }
};

export function getPartIds(question: any): string[] {
  return getChildren(question.children, 'part').map((p: any) =>
    p.id === undefined ? guid() : p.id
  );
}

export function getBranchingTarget(response: any) {
  if (response.children === undefined || response.children.length === 0) {
    return undefined;
  }
  return response.children[0]['xml:lang'];
}

export function buildTextPart(id: string, question: any) {
  const responses = getChild(question.children, 'part').children.filter(
    (p: any) => p.type === 'response'
  );
  const hints = getChild(question.children, 'part').children.filter(
    (p: any) => p.type === 'hint'
  );
  const skillrefs = getChild(question.children, 'part').children.filter(
    (p: any) => p.type === 'skillref'
  );

  return {
    id: '1',
    responses: responses.map((r: any) => {
      const cleanedMatch = replaceAll(r.match, '\\*', '.*');
      const item: any = {
        id: guid(),
        score: r.score === undefined ? 0 : parseFloat(r.score),
        rule: `input like {${cleanedMatch}}`,
        feedback: {
          id: guid(),
          content: {
            id: guid(),
            model: maybe(r.children[0]).caseOf({
              just: (feedback: any) => ensureParagraphs(feedback.children),
              nothing: () => shortAnswerExplanationOrDefaultModel(question),
            }),
          },
        },
      };
      const showPage = getBranchingTarget(r);
      if (showPage !== undefined) {
        item.showPage = showPage;
      }
      return item;
    }),
    hints: ensureThree(
      hints.map((r: any) => ({
        id: guid(),
        content: {
          id: guid(),
          model: ensureParagraphs(r.children),
        },
      }))
    ),
    objectives: skillrefs.map((s: any) => s.idref),
    scoringStrategy: 'average',
    explanation: maybeBuildPartExplanation(responses),
  };
}

export function hint() {
  return {
    id: guid(),
    content: { model: defaultModel() },
  };
}

export function ensureThree(hints?: any[]) {
  if (hints === undefined || hints.length === 0) {
    return [hint(), hint(), hint()];
  }
  if (hints.length === 1) {
    return [...hints, hint(), hint()];
  }
  if (hints.length === 2) {
    return [...hints, hint()];
  }
  return hints;
}

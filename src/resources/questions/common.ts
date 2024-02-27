import { maybe } from 'tsmonad';
import { guid } from 'src/utils/common';
import * as XML from '../../utils/xml';
import { isInlineTag } from 'src/utils/dom';

export function getChild(parent: any, named: string) {
  return parent.children.find((e: any) => named == e.type);
}

export function getChildren(parent: any, named: string) {
  return parent.children.filter((e: any) => named == e.type);
}

export function getDescendants(collection: any[], named: string): any[] {
  if (collection === undefined) return [];

  return collection.reduce((acc: any[], elem: any) => {
    if (named === elem.type) acc.push(elem);

    acc.push(...getDescendants(elem.children, named));

    return acc;
  }, []);
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

export function convertCatchAll(match: string): string {
  return match === '*' ? '.*' : match;
}

export function hasCatchAll(responses: any[]) {
  return responses.some((r) => r.match === 'input like {.*}');
}

export function hasCatchAllRule(responses: any[]) {
  return responses.some((r) => r.rule === 'input like {.*}');
}

export function makeFeedback(text: string) {
  return {
    id: guid(),
    content: [{ type: 'p', children: [{ text: text }] }],
  };
}

export function makeCatchAllResponse() {
  return {
    id: guid(),
    score: 0,
    rule: 'input like {.*}',
    feedback: makeFeedback('Incorrect.'),
  };
}

export function ensureCatchAllResponse(responses: any[]): void {
  if (!hasCatchAllRule(responses)) responses.push(makeCatchAllResponse());
}

/*
 * Same as wrapInlinesWithParagraphs, but if there are no children, returns an empty paragraph.
 */
export function ensureParagraphs(children: any[]) {
  const result = wrapInlinesWithParagraphs(children);
  return result.length === 0
    ? [{ type: 'p', children: [{ text: ' ' }] }] // Add an empty p if no children at all.
    : result;
}

/* Looks through children and wraps any inline elements in paragraphs. It will keep
 * elements next to each other in the same paragraph, only splitting when we hit a
 * block element (as defined by text || !isInlineTag(...) )
 *
 * ex: [inline1, inline2, block, inline3] => [ p[inline1, inline2], block, p[inline3] ]
 */
export function wrapInlinesWithParagraphs(children: any) {
  const result = [];
  let successiveInline: any[] = [];
  children
    .filter((c: any) => !isBlankText(c))
    .forEach((c: any) => {
      if (c.text !== undefined || isInlineTag(c.type)) {
        successiveInline.push(c);
      } else {
        // hit non-inline: finish any pending paragraph and reset
        if (successiveInline.length > 0) {
          result.push({ type: 'p', children: successiveInline });
          successiveInline = [];
        }
        result.push(c);
      }
    });
  // finish any final pending paragraph
  if (successiveInline.length > 0) {
    result.push({ type: 'p', children: successiveInline });
  }
  return result;
}

export function isBlankText(e: any): boolean {
  return e && e.text !== undefined && e.text.trim().length === 0;
}

export function wrapLooseText(children: any, trace = false) {
  // if loose text pieces alongside blocks, strip spurious blank ones,
  // collecting successive non-blank text pieces into p's.
  if (children.length > 1) {
    if (children.some((b: any) => XML.isBlockElement(b.type))) {
      const result = wrapInlinesWithParagraphs(
        children.filter((c: any) => !isBlankText(c))
      );

      if (
        trace &&
        children.some((b: any) => b.text !== undefined && !isBlankText(b))
      ) {
        console.log('wrapText in:' + JSON.stringify(children, null, 2));
        console.log('wrapText out:' + JSON.stringify(result, null, 2));
      }
      return result;
    }
  }
  return children;
}

/*
 * Recursively iterate through children, finding any input_ref pointing at the
 * redundantInputId, remove it, and return the result.
 */
export function removeRedundantInputRefs(
  children: any[],
  redundantInputId: string
) {
  if (!Array.isArray(children)) return children;
  return children
    .filter((c) => !(c.type === 'input_ref' && c.input === redundantInputId))
    .map((child) => {
      if (child.children) {
        child.children = removeRedundantInputRefs(
          child.children,
          redundantInputId
        );
      }
      return child;
    });
}

/*
 * Recursively iterate through children, finding any node with an empty children value
 * and adding a {text: ''} node to it and return the result.
 */
export function ensureNoEmptyChildren(children: any) {
  if (Array.isArray(children) && children.length === 0) {
    children.push({ text: '' });
  } else if (Array.isArray(children)) {
    children = children.map((child: any) => {
      if (Array.isArray(child.children)) {
        return {
          ...child,
          children: ensureNoEmptyChildren(child.children),
        };
      } else {
        return child;
      }
    });
  }

  return children;
}

export function buildStem(question: any) {
  const stem = getChild(question, 'stem');
  return {
    content: wrapLooseText(ensureParagraphs(stem.children)),
  };
}

export function buildStemFromText(text: string) {
  return {
    content: buildContentModelFromText(text),
  };
}

export function buildContentModelFromText(text: string) {
  return [{ type: 'p', children: [{ text }] }];
}

export function shuffleTransformation() {
  return {
    id: guid(),
    path: 'choices',
    operation: 'shuffle',
  };
}

export function shufflePartTransformation(partId: string) {
  const t = shuffleTransformation();
  (t as any).partId = partId;
  return t;
}

export function buildChoices(question: any, from = 'multiple_choice') {
  const choices = getChild(question, from).children as any[];

  return choices.map((c: any) => ({
    content: ensureParagraphs(c.children),
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

const shortAnswerExplanationOrDefaultModel = (question: any) => {
  if (hasShortAnswer(question)) {
    const firstPart = getChild(question, 'part');
    const explanation = getChild(firstPart, 'explanation');

    if (explanation !== undefined) {
      return wrapInlinesWithParagraphs(explanation.children);
    } else {
      return defaultModel();
    }
  }
  return defaultModel();
};

const getParts = (question: any): any[] =>
  question.children.filter((c: any) => c.type === 'part');

export function getFeedbackModel(response: any) {
  let feedback =
    response.children !== undefined
      ? getChild(response, 'feedback')
      : undefined;

  // odd case seen on responses generated for mcq's on surveys: feedback
  // content is direct child of response, not wrapped in <feedback> element
  if (feedback === undefined && response.children.length > 0)
    feedback = response.children[0];

  if (feedback === undefined) {
    return [
      {
        type: 'p',
        children: [{ text: ' ' }],
      },
    ];
  }

  return ensureParagraphs(feedback.children);
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
  return getChildren(question, 'part').map((p: any) =>
    p.id === undefined ? guid() : p.id
  );
}

export function getBranchingTarget(response: any) {
  if (response.children === undefined || response.children.length === 0) {
    return undefined;
  }
  return response.children[0]['xml:lang'];
}

function getGradingApproach(question: any) {
  return question.grading === 'instructor' ? 'manual' : 'automatic';
}

export function buildTextPart(id: string, question: any) {
  const part = getChild(question, 'part');
  const responses = part.children.filter((p: any) => p.type === 'response');
  const hints = part.children.filter((p: any) => p.type === 'hint');
  const skillrefs = part.children.filter((p: any) => p.type === 'skillref');

  return {
    id: part.id || id,
    responses: responses.map((r: any) => {
      const cleanedMatch = convertCatchAll(r.match.trim());
      const item: any = {
        id: guid(),
        score: r.score === undefined ? 0 : parseFloat(r.score),
        rule: `input like {${cleanedMatch}}`,
        feedback: {
          id: guid(),
          content: maybe(r.children[0]).caseOf({
            just: (feedback: any) => ensureParagraphs(feedback.children),
            nothing: () => shortAnswerExplanationOrDefaultModel(question),
          }),
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
        content: ensureParagraphs(r.children),
      }))
    ),
    objectives: skillrefs.map((s: any) => s.idref),
    scoringStrategy: 'average',
    explanation: maybeBuildPartExplanation(responses),
    gradingApproach: getGradingApproach(question),
  };
}

export function hint() {
  return {
    id: guid(),
    content: defaultModel(),
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

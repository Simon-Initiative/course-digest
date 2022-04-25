import { guid, replaceAll } from '../../utils/common';

export function getChild(collection: any, named: string) {
  const items = collection.filter((e: any) => named == e.type);
  if (items.length > 0) {
    return items[0];
  }
  return undefined;
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

export function shuffleTransformation() {
  return {
    id: guid(),
    path: 'choices',
    operation: 'shuffle',
  };
}

export function buildChoices(question: any, from = 'multiple_choice') {
  const choices = getChild(question.children, from).children;

  return choices.map((c: any) => ({
    content: { model: ensureParagraphs(c.children) },
    id: c.value,
  }));
}

export function buildTextPart(question: any) {
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
      return {
        id: guid(),
        score: r.score === undefined ? 0 : parseFloat(r.score),
        rule: `input like {${cleanedMatch}}`,
        feedback: {
          id: guid(),
          content: {
            id: guid(),
            model: ensureParagraphs(r.children[0].children),
          },
        },
      };
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
  };
}

export function hint() {
  return {
    id: guid(),
    content: { model: [{ type: 'p', children: [{ text: '' }] }] },
  };
}

export function ensureThree(hints: any) {
  if (hints.length === 0) {
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

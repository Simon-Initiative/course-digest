// Assemble the Torus representation of a multi-input activity from

import { guid, replaceAll } from 'src/utils/common';

import * as Common from './common';

// a JSON representation of the Formative Legacy model of this question type
export function buildMulti(question: any, skipInputRefValidation = false) {
  // Pair up the inputs and the parts
  const { items, parts } = collectItemsParts(question);
  const allChoices: any[] = [];
  const inputs: any[] = [];
  const allTargeted: any[] = [];
  const torusParts: any[] = [];

  if (items.length === parts.length && items.length > 0) {
    for (let i = 0; i < items.length; i++) {
      const { input, part, choices, targeted } = produceTorusEquivalents(
        items[i],
        parts[i],
        i
      );
      choices.forEach((c: any) => allChoices.push(c));
      targeted.forEach((c: any) => allTargeted.push(c));
      inputs.push(input);
      torusParts.push(part);
    }
  }
  const transformation = Common.getChild(question.children, 'transformation');
  return {
    stem: buildStem(question, inputs, skipInputRefValidation),
    choices: allChoices,
    inputs,
    authoring: {
      targeted: allTargeted,
      parts: torusParts,
      transformations: transformation === undefined ? [] : [transformation],
      previewText: '',
    },
  };
}

function updateInputRefs(model: any, foundInputs: any): any {
  if (model.type === 'input_ref') {
    foundInputs[model.input] = true;
    return Object.assign({}, model, {
      id: model.input,
      children: [{ text: '' }],
    });
  }
  if (model.children !== undefined) {
    return Object.assign({}, model, {
      children: updateInputRefs(model.children, foundInputs),
    });
  }
  if (Array.isArray(model)) {
    return model.map((c: any) => updateInputRefs(c, foundInputs));
  }
  return model;
}

export function buildStem(
  question: any,
  inputs: any[],
  skipInputRefValidation: boolean
) {
  const stem = Common.getChild(question.children, 'stem');
  const model = Common.ensureParagraphs(stem.children);
  const foundInputs: any = {};
  const updated = updateInputRefs(model, foundInputs);

  // Some multi input questions omit the input_ref.  We do not allow that in Torus, therefore we must
  // detect that case and append an input ref for every one that is missing.
  if (!skipInputRefValidation) {
    inputs.forEach((input) => {
      if (foundInputs[input.id] === undefined) {
        updated.push({
          type: 'p',
          id: guid(),
          children: [
            { type: 'input_ref', id: input.id, children: [{ text: '' }] },
          ],
        });
      }
    });
  }

  return {
    content: {
      model: updated,
    },
  };
}

export function buildChoices(question: any, from = 'fill_in_the_blank') {
  const choices = Common.getChild(question.children, from).children;

  return choices.map((c: any) => ({
    content: c.children,
    id: c.value,
  }));
}

function produceTorusEquivalents(item: any, p: any, i: number) {
  const input: any = {};
  let part: any = {};
  let choices: any[] = [];
  const targeted: any[] = [];

  if (item.type === 'text') {
    part = buildTextPart(p, i);
    input.inputType = 'text';
  } else if (item.type === 'numeric') {
    part = buildTextPart(p, i);
    input.inputType = 'numeric';
  } else {
    part = buildDropdownPart(p, i);
    input.inputType = 'dropdown';

    choices = buildChoices({ children: [item] }, 'fill_in_the_blank');
    input.choiceIds = choices.map((c: any) => c.id);

    if (!(part.responses as Array<any>).some((r) => r.legacyMatch === '.*')) {
      part.responses.forEach((r: any) => {
        targeted.push([[r.legacyMatch], r.id]);
      });
      part.responses.push({
        id: guid(),
        score: 0,
        rule: `input like {.*}`,
        feedback: {
          id: guid(),
          content: {
            id: guid(),
            model: [
              {
                type: 'p',
                children: [{ text: 'Incorrect' }],
              },
            ],
          },
        },
      });
    }
  }

  input.id = item.id;
  input.partId = part.id;

  return { input, part, choices, targeted };
}

function collectItemsParts(question: any) {
  const items = question.children.filter((c: any) => {
    return (
      c.type === 'numeric' ||
      c.type === 'text' ||
      c.type === 'fill_in_the_blank'
    );
  });

  const parts = question.children.filter((c: any) => {
    return c.type === 'part';
  });

  return { items, parts };
}

function buildDropdownPart(part: any, _i: number) {
  const responses = part.children.filter((p: any) => p.type === 'response');
  const hints = part.children.filter((p: any) => p.type === 'hint');
  const skillrefs = part.children.filter((p: any) => p.type === 'skillref');

  const firstResponseInputValue =
    responses.length > 0 ? responses[0].input : guid();

  const id =
    part.id !== undefined && part.id !== null
      ? part.id + ''
      : firstResponseInputValue;

  return {
    id,
    responses: responses.map((r: any) => {
      const m = replaceAll(r.match, '\\*', '.*');
      const item: any = {
        id: guid(),
        score: r.score === undefined ? 0 : parseFloat(r.score),
        rule: `input like {${m}}`,
        legacyMatch: m,
        feedback: {
          id: guid(),
          content: { model: Common.getFeedbackModel(r) },
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
        content: { model: Common.ensureParagraphs(r.children) },
      }))
    ),
    objectives: skillrefs.map((s: any) => s.idref),
    scoringStrategy: 'average',
    explanation: Common.maybeBuildPartExplanation(responses),
  };
}

export function buildTextPart(part: any, _i: number) {
  const responses = part.children.filter((p: any) => p.type === 'response');
  const hints = part.children.filter((p: any) => p.type === 'hint');
  const skillrefs = part.children.filter((p: any) => p.type === 'skillref');
  const id = part.id !== undefined && part.id !== null ? part.id + '' : guid();

  return {
    id,
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
            model: Common.getFeedbackModel(r),
          },
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
        content: {
          id: guid(),
          model: Common.ensureParagraphs(r.children),
        },
      }))
    ),
    objectives: skillrefs.map((s: any) => s.idref),
    scoringStrategy: 'average',
  };
}

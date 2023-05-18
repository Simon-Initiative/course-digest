// Assemble the Torus representation of a multi-input activity from

import { guid, replaceAll } from 'src/utils/common';

import * as Common from './common';
import { convertCatchAll } from './common';

// a JSON representation of the Formative Legacy model of this question type
export function buildMulti(
  question: any,
  skipInputRefValidation = false,
  ignorePartId = false
) {
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
        i,
        ignorePartId
      );
      choices.forEach((c: any) => allChoices.push(c));
      targeted.forEach((c: any) => allTargeted.push(c));
      inputs.push(input);
      torusParts.push(part);
    }
  }
  /*
  const dropdowns = inputs.filter((i) => i.inputType === 'dropdown');
  if (!dropdowns.every((e, _i, arr) => e.shuffle === arr[0].shuffle)) {
    console.log(
      'mixed shuffle vals in multi ' +
        question.id +
        ':' +
        dropdowns.map((i: any) => i.shuffle).join(',')
    );
  }*/
  const transformation = Common.getChild(question.children, 'transformation');

  torusParts.reduce((seen, part) => {
    if (seen[part.id] === undefined) {
      seen[part.id] = part.id;
    } else {
      console.log(
        'detected duplicate part id within question: [' + part.id + ']'
      );
      part.id = guid();
    }
    return seen;
  }, {});

  return {
    stem: buildStem(question, inputs, skipInputRefValidation),
    choices: allChoices,
    inputs,
    submitPerPart: true,
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
    content: updated,
  };
}

export function buildChoices(
  question: any,
  partId: string,
  from = 'fill_in_the_blank'
) {
  const choices = Common.getChild(question.children, from).children;

  return choices.map((c: any) => ({
    content: c.children,
    id: partId + '_' + c.value,
  }));
}

function ensureAtLeastOneCorrectResponse(part: any) {
  const responses = part.responses;

  if (!responses.some((r: any) => r.score > 0) && responses.length > 0) {
    // Find the first that isn't the * and set it to be correct
    const withoutStar = responses.filter((r: any) => r.legacyMatch !== '.*');
    if (withoutStar.length > 0) {
      withoutStar[0].score = 1;
    } else {
      responses[0].score = 1;
    }
  }
}

function produceTorusEquivalents(
  item: any,
  p: any,
  i: number,
  ignorePartId: boolean
) {
  const input: any = {};
  let part: any = {};
  let choices: any[] = [];
  const targeted: any[] = [];

  if (item.type === 'text') {
    part = buildInputPart('text', p, item);
    ensureAtLeastOneCorrectResponse(part);
    input.inputType = 'text';
  } else if (item.type === 'numeric') {
    part = buildInputPart('numeric', p, i);
    ensureAtLeastOneCorrectResponse(part);
    input.inputType = 'numeric';
  } else {
    part = buildDropdownPart(p, i, ignorePartId);
    ensureAtLeastOneCorrectResponse(part);
    input.inputType = 'dropdown';
    // input.shuffle = item.shuffle;

    choices = buildChoices({ children: [item] }, part.id, 'fill_in_the_blank');
    input.choiceIds = choices.map((c: any) => c.id);

    if (!(part.responses as Array<any>).some((r) => r.legacyMatch === '.*')) {
      part.responses.forEach((r: any) => {
        // must adjust to match part-qualified choiceIds we generate
        targeted.push([[part.id + '_' + r.legacyMatch], r.id]);
      });
    }
  }

  input.id = item.id;
  input.partId = part.id;

  Common.ensureCatchAllResponse(part.responses);

  return { input, part, choices, targeted };
}

// It is terribly unfortunate that we have to write code like this, but the issue is that
// the legacy system has a really odd way of allowing inputs and parts to be misaligned, that is
// to say, allowing them to exist at different indices within their respective arrays. It
// relies on the "input" attribute from the reponse to indicate which input that part pertains to, but
// that attribute is not required.  When it is absent we have to assume that the items and parts
// are aligned.  So we try first to align with 'input', if that fails we fall back in aligned.
function collectItemsParts(question: any) {
  const items = question.children.filter((c: any) => {
    return (
      c.type === 'numeric' ||
      c.type === 'text' ||
      c.type === 'fill_in_the_blank'
    );
  });

  const originalParts = question.children.filter((c: any) => {
    return c.type === 'part';
  });

  const partsByFirstReponseInput = originalParts.reduce((m: any, p: any) => {
    const responses = p.children.filter((p: any) => p.type === 'response');

    if (responses.length > 0) {
      m[responses[0].input] = p;
      return m;
    }
    return m;
  }, {});

  const partsByPartId = originalParts.reduce((m: any, p: any) => {
    m[p.id] = p;
    return m;
  }, {});

  const parts = items.map((item: any) => {
    if (partsByFirstReponseInput[item.id] !== undefined) {
      return partsByFirstReponseInput[item.id];
    } else {
      return partsByPartId[item.id];
    }
  });

  if (parts.some((p: any) => p === undefined)) {
    return { items, parts: originalParts };
  }

  return { items, parts };
}

function buildDropdownPart(part: any, i: number, ignorePartId: boolean) {
  const responses = part.children.filter((p: any) => p.type === 'response');
  const hints = part.children.filter((p: any) => p.type === 'hint');
  const skillrefs = part.children.filter((p: any) => p.type === 'skillref');

  // May be undefined if parts implicitly aligned w/inputs by ordinal position
  const firstResponseInputValue = responses[0]?.input;
  const id =
    part.id !== undefined && part.id !== null && !ignorePartId
      ? part.id
      : // take part id from input attr if exists, else generate one
      firstResponseInputValue
      ? firstResponseInputValue
      : 'part' + (i + 1);

  return {
    id,
    responses: responses.map((r: any) => {
      const m = replaceAll(r.match, '\\*', '.*');
      const item: any = {
        id: guid(),
        score: r.score === undefined ? 0 : parseFloat(r.score),
        rule: m === '.*' ? `input like {${m}}` : `input like {${id + '_' + m}}`,
        legacyMatch: m,
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
    objectives: skillrefs.map((s: any) => s.idref),
    scoringStrategy: 'average',
    explanation: Common.maybeBuildPartExplanation(responses),
  };
}

// for dealing with legacy match expressions

export function isRegExp(match: string) {
  return match.startsWith('/') && match.endsWith('/');
}

export function getRegExp(match: string) {
  return match.slice(1, match.length - 1);
}

export function hasCasedChars(s: string) {
  return [...s].some((c) => c.toLowerCase() != c.toUpperCase());
}

// This escapes argument for the match rule notation
const escapeInput = (s: string) => s.replace(/[\\{}]/g, (i) => `\\${i}`);

// legacy match value for text input is either special wildcard *
// a literal string to be matched; or, rarely, /regexp/
// convert to torus rule, handling case_sensitive setting from input
export function matchToRule(match: string, input: any, type: any) {
  let m = match;

  // convert * to standard regexp
  if (match === '*') {
    m = '/.*/';
  } else if (isRegExp(m) && input.case_sensitive === 'false') {
    // if it matters, modify regexp match to be case insensitive
    if (hasCasedChars(m)) m = `/(?i)${getRegExp(m)}/`;
  }

  const matchArg = isRegExp(m) ? getRegExp(m) : m;
  let operator;
  if (isRegExp(m)) operator = 'like';
  else if (type === 'numeric') operator = '=';
  else if (input.case_sensitive === 'false') operator = 'iequals';
  else operator = 'equals';

  return `input ${operator} {${escapeInput(matchArg)}}`;
}

export function buildInputPart(
  type: 'text' | 'numeric',
  part: any,
  input: any
) {
  const responses = part.children.filter((p: any) => p.type === 'response');
  const hints = part.children.filter((p: any) => p.type === 'hint');
  const skillrefs = part.children.filter((p: any) => p.type === 'skillref');
  const id = part.id !== undefined && part.id !== null ? part.id + '' : guid();

  return {
    id,
    responses: responses.map((r: any) => {
      const cleanedMatch = convertCatchAll(r.match);
      const item: any = {
        id: guid(),
        score: r.score === undefined ? 0 : parseFloat(r.score),
        rule: matchToRule(r.match, input, type),
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
    objectives: skillrefs.map((s: any) => s.idref),
    scoringStrategy: 'average',
    explanation: Common.maybeBuildPartExplanation(responses),
  };
}

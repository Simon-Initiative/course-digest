import { guid } from 'src/utils/common';
import * as Common from './common';
import { convertCatchAll } from './common';
import { andRules, orRules } from './rules';

// Assemble the Torus representation of a multi-input activity from
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
  const transformations: any[] = [];

  if (items.length === parts.length && items.length > 0) {
    for (let i = 0; i < items.length; i++) {
      const { input, part, choices, targeted } = produceTorusEquivalents(
        items[i],
        parts[i],
        i,
        ignorePartId,
        question.id
      );
      choices.forEach((c: any) => allChoices.push(c));
      targeted.forEach((c: any) => allTargeted.push(c));
      inputs.push(input);
      torusParts.push(part);
      if (input.inputType === 'dropdown' && input.shuffle === 'true') {
        transformations.push(Common.shufflePartTransformation(part.id));
      }
    }
  }

  const transformation = Common.getChild(question, 'transformation');
  if (transformation !== undefined) transformations.push(transformation);

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

  const stem = buildStem(question, inputs, skipInputRefValidation);

  return {
    stem,
    choices: allChoices,
    inputs,
    submitPerPart: true,
    authoring: {
      targeted: allTargeted,
      parts: torusParts,
      transformations: transformations,
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
  const stem = Common.getChild(question, 'stem');
  const model = Common.wrapLooseText(Common.ensureParagraphs(stem.children));
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
            {
              type: 'input_ref',
              id: input.id,
              children: [{ text: '' }],
            },
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
  const choices = Common.getChild(question, from).children;

  return choices.map((c: any) => ({
    content: fixChoiceContent(c.children),
    id: partId + '_' + c.value,
  }));
}

// some legacy choices use mathML as dropdown choice content, though only text gets rendered by browser
const fixChoiceContent = (elements: any[]): any[] => {
  return elements
    .map((e) =>
      e.type === 'formula_inline' && e.subtype === 'mathml'
        ? // return plain text piece with tags stripped
          {
            text: e.src
              .trim()
              // strip white space between tags, but leave nobreak sp
              .replace(/>[\n\t\f ]+</gi, '><')
              .replace(/(<([^>]+)>)/gi, ''),
          }
        : e
    )
    .filter((e) => !Common.isBlankText(e));
};

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
  ignorePartId: boolean,
  questionId: string
) {
  const input: any = {};
  let part: any = {};
  let choices: any[] = [];
  const targeted: any[] = [];

  if (item.type === 'text') {
    part = buildInputPart('text', p, item);
    ensureAtLeastOneCorrectResponse(part);
    input.inputType = 'text';
    input.size = item.size;
  } else if (item.type === 'numeric') {
    part = buildInputPart('numeric', p, i);
    ensureAtLeastOneCorrectResponse(part);
    input.inputType = 'numeric';
    input.size = item.size;
  } else {
    part = buildDropdownPart(p, i, ignorePartId);
    ensureAtLeastOneCorrectResponse(part);
    input.inputType = 'dropdown';
    input.shuffle = item.shuffle;

    choices = buildChoices({ children: [item] }, part.id, 'fill_in_the_blank');
    input.choiceIds = choices.map((c: any) => c.id);

    if (!(part.responses as Array<any>).some((r) => r.legacyMatch === '.*')) {
      part.responses.forEach((r: any) => {
        // must adjust to match part-qualified choiceIds we generate
        targeted.push([[part.id + '_' + r.legacyMatch], r.id]);
      });
    }
  }

  if (item.id) {
    input.id = item.id;
  } else if (item.type === 'text' || item.type === 'numeric') {
    if (item.children && item.children.length === 1) {
      /*
        Sometimes, we run into a multi-question that the item does not have an id, but there is an
        input ref that points at the choice value.  In this case, we can use the choice value as the
        input id. Example:

        <numeric id="q2_interp_zscore">
          <body>
              <p>A question goes here</p>
              <p>
                  <input_ref input="A" />
              </p>
          </body>          
          <input labels="false" shuffle="false">
              <choice value="A" />
          </input>
          <part>
              <response input="A" match="89" score="10">
                  <feedback>Correct. We need to find the exam score such that the probability of
                      getting a score
                      above it is 0.04. Equivalently, we need to find the exam score such that the
                      probability of
                      getting a score below it is 1 − 0.04 = 0.96. The z-score with a probability
                      closest to 0.96
                      (which is 0.9599) is 1.75. This means that the exam score that we are looking
                      for is 1.75 * SD
                      above the mean, and therefore is 75 + 1.75 * SD = 75 + 14 = 89. </feedback>
              </response>            
          </part>
        </numeric>
      */
      const choice = item.children[0];
      input.id = choice.value;
    }
  }
  // can apparently have minimal question w/implied input but no input id used anywhere
  if (!input.id) {
    console.warn(`${questionId} part ${i + 1} ${item.type}: no input id found`);
    input.id = `${questionId}-${i + 1}`;
  }

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
  const partId =
    part.id !== undefined && part.id !== null && !ignorePartId
      ? part.id
      : // take part id from input attr if exists, else generate one
      firstResponseInputValue
      ? firstResponseInputValue
      : 'part' + (i + 1);

  return {
    id: partId,
    responses: responses.map((r: any) => {
      const m = convertCatchAll(r.match);
      const item: any = {
        id: guid(),
        score: r.score === undefined ? 0 : parseFloat(r.score),
        rule:
          m === '.*' ? `input like {.*}` : `input like {${partId + '_' + m}}`,
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
export function inputMatchToRule(
  match: string,
  case_sensitive: string,
  type: any
) {
  let m = match.trim();

  // convert * to standard regexp
  if (match === '*') {
    m = '/.*/';
  } else if (isRegExp(m) && case_sensitive === 'false') {
    // if it matters, modify regexp match to be case insensitive
    if (hasCasedChars(m)) m = `/(?i)${getRegExp(m)}/`;
  }

  const matchArg = isRegExp(m) ? getRegExp(m) : m;
  let operator;
  if (isRegExp(m)) operator = 'like';
  else if (type === 'numeric') operator = '=';
  else if (case_sensitive === 'false') operator = 'iequals';
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
        rule: inputMatchToRule(r.match, input.case_sensitive, type),
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

// Build a response_multi question. Similar to multi-input, but each part subsumes a *set* of
// inputs, using response_mult response rules which match sets of responses over those targets.
export function buildResponseMulti(question: any) {
  // collect list of legacy input items
  const items = question.children.filter((c: any) =>
    ['fill_in_the_blank', 'text', 'numeric'].includes(c.type)
  );

  // ensure all parts have ids and target id lists
  const parts = Common.getChildren(question, 'part');
  parts.forEach((p: any, i: number) => {
    if (!p.id) p.id = 'part' + (i + 1);
    // single part covering all inputs can omit target id list
    if (!p.targets) {
      if (parts.length != 1)
        console.log(`response_mult missing targets list on part ${p.id}`);
      else p.targets = items.map((i: any) => i.id).join(',');
    }
  });

  // build torus inputs from legacy items, collecting associated torus choices
  const inputs: any[] = [];
  const choices: any[] = [];
  items.forEach((item: any) => {
    const [input, inputChoices] = toResponseMultiInput(item, parts);
    inputs.push(input);
    if (inputChoices) inputChoices.forEach((c: any) => choices.push(c));
  });

  // buildStem handles input ref replacement in question stem
  const stem = buildStem(question, inputs, true);

  // walk the parts, building torus parts with multi response rules
  const torusParts = parts.map((p: any) => toResponseMultiPart(p, items));

  // set transformations particularly shuffle
  const transformationElement = Common.getChild(question, 'transformation');
  const transformations = transformationElement ? [transformationElement] : [];
  // Torus can only shuffle per-part, not per input, so only apply if ALL dropdown part inputs shuffled
  const findInput = (id: string) => inputs.find((inp: any) => inp.id === id);
  torusParts.forEach((p: any) => {
    const partDropdowns = p.targets
      .map(findInput)
      .filter((inp: any) => inp && inp.type === 'dropdown');
    if (partDropdowns.every((inp: any) => inp.shuffle))
      transformations.push(Common.shufflePartTransformation(p.id));
  });

  return {
    stem,
    choices,
    inputs,
    multInputsPerPart: true,
    submitPerPart: true,
    authoring: {
      targeted: [],
      parts: torusParts,
      transformations: transformations,
      previewText: '',
    },
  };
}

// create torus input w/any associated choices from a legacy response_mult input item
const toResponseMultiInput = (item: any, parts: any[]) => {
  // find the part containing this input. targets is comma-delimited string listing ids
  let part = parts.find((p: any) => p.targets.split(',').includes(item.id));
  if (part === undefined) {
    console.log(`part not found for ${item.type} item: ${item.id}`);
    part = { id: 'unknown' };
  }

  const inputType = item.type === 'fill_in_the_blank' ? 'dropdown' : item.type;
  const input: any = { id: item.id, partId: part.id, inputType };
  let choices;
  if (item.type === 'fill_in_the_blank') {
    input.shuffle = item.shuffle;
    // torus dropdowns reference choices by id from a list of all choices in activity.
    // Regular multi-inputs prepend partID_ as prefix to _choiceID to ensure choiceIDs
    // unique within activity. Because response_multi can have multiple inputs per part,
    // we use inputID for that purpose on assumption inputIds must be unique over question.
    // Note must rewrite dropdown matching rules to use same qualified choice ids.
    choices = buildChoices(
      { children: [item] }, // question structure used by buildChoices
      input.id,
      'fill_in_the_blank'
    );
    input.choiceIds = choices.map((c: any) => c.id);
  } else input.size = item.size;

  return [input, choices];
};

// create torus part from a legacy response_mult part
const toResponseMultiPart = (part: any, items: any[]) => {
  // A single-input part may have regular responses, not response_mults
  const responses = [
    ...Common.getChildren(part, 'response_mult'),
    ...Common.getChildren(part, 'response'),
  ];
  const hints = Common.getChildren(part, 'hint');
  const skillrefs = Common.getChildren(part, 'skillref');

  return {
    id: part.id,
    targets: part.targets.split(','),
    responses: responses.map((r: any) => toResponseMultiResponse(r, items)),
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
};

// r is a single response element, normally
//    <response_mult>
//      <match match=""..." input="..."/>
///     <match ... />
// But for a single-input part we may get regular response element
//    <response match=".." input="...>
// We build a response mult style rule even for single response
const toResponseMultiResponse = (r: any, items: any[]) => {
  const matches =
    r.type === 'response_mult' ? Common.getChildren(r, 'match') : [r];
  const matchStyle = r.type === 'response_mult' ? r.match_style : 'all';

  const rule = compoundRule(matchStyle, matches, items);

  const response: any = {
    id: guid(),
    score: r.score === undefined ? 0 : parseFloat(r.score),
    rule,
    matchStyle: r.match_style,
    legacyMatch: 'response_mult',
    feedback: {
      id: guid(),
      content: Common.getFeedbackModel(r),
    },
  };
  const showPage = Common.getBranchingTarget(r);
  if (showPage !== undefined) {
    response.showPage = showPage;
  }
  return response;
};

// Build a compound rule from style and list of response_mult match elements
// Each match element has a match string and input id to apply it to
const compoundRule = (match_style: string, matches: any, items: any[]) => {
  const dropdownMatchToRule = (matchStr: string, inputId: string) =>
    // map legacy choice id in match string to torus input-qualified choice id
    matchStr === '*'
      ? `input like {.*}`
      : `input like {${inputId + '_' + matchStr}}`;

  const inputRules = matches.map((m: any) => {
    const item = items.find((item: any) => item.id === m.input);
    const inputRule =
      item.type === 'fill_in_the_blank'
        ? dropdownMatchToRule(m.match, m.input)
        : inputMatchToRule(m.match, item.case_sensitive, item.type);
    // must change 'input op {foo}' to 'input_ref_ID op {foo}'
    return inputRule.replace('input ', `input_ref_${m.input} `);
  });

  // Wildcard input rules often included in multi-item rulesets for completeness,
  // e.g input1=A input2=B input3=*, This is usually equivalent to leaving wildcard out, and
  // torus interface doesn't handle wildcard rule well, so optimize by removing them.
  // Assumes no conflicting rules for same input like (input1=A || input1=*)
  // !!! Not equivalent if wildcard match requires SOME input while input may be left unfilled.
  // Have seen 3-item questions where input3 is optional: correct response leaves out input3 ,
  // and wildcard match on 3 used to detect error of including any response to 3. But torus
  // does not support this use of wildcards, so such questions will have to change in any case.
  const nonCatchAllRules = inputRules.filter(
    (r: string) => !r.endsWith(' {.*}')
  );
  const cleanedRules =
    nonCatchAllRules.length > 0 && match_style != 'none'
      ? nonCatchAllRules
      : inputRules;

  // combine the base rules into compound torus rule
  const joined =
    match_style === 'all'
      ? andRules(...cleanedRules)
      : orRules(...cleanedRules);
  return match_style === 'none' ? `!(${joined})` : joined;
};

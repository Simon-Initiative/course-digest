// Assemble the Torus representation of a multi-input activity from

import { guid, replaceAll } from "../../utils/common";

import * as Common from "./common";

// a JSON representation of the Formative Legacy model of this question type
export function buildMulti(question: any) {
  // Pair up the inputs and the parts
  const { items, parts } = collectItemsParts(question);
  const allChoices: any[] = [];
  const inputs: any[] = [];
  const torusParts: any[] = [];

  if (items.length === parts.length && items.length > 0) {
    for (let i = 0; i < items.length; i++) {
      const { input, part, choices } = produceTorusEquivalents(
        items[i],
        parts[i],
        i
      );
      choices.forEach((c: any) => allChoices.push(c));
      inputs.push(input);
      torusParts.push(part);
    }
  }

  return {
    stem: buildStem(question, inputs),
    choices: allChoices,
    inputs,
    authoring: {
      targeted: [],
      parts: torusParts,
      transformations: [],
      previewText: "",
    },
  };
}

function updateInputRefs(model: any, foundInputs: any): any {
  if (model.type === "input_ref") {
    foundInputs[model.input] = true;
    return Object.assign({}, model, {
      id: model.input,
      children: [{ text: "" }],
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

export function buildStem(question: any, inputs: any[]) {
  const stem = Common.getChild(question.children, "stem");
  const model = Common.ensureParagraphs(stem.children);
  const foundInputs: any = {};
  const updated = updateInputRefs(model, foundInputs);

  // Some multi input questions omit the input_ref.  We do not allow that in Torus, therefore we must
  // detect that case and append an input ref for every one that is missing.
  inputs.forEach((input) => {
    if (foundInputs[input.id] === undefined) {
      updated.push({
        type: "p",
        id: guid(),
        children: [
          { type: "input_ref", id: input.id, children: [{ text: "" }] },
        ],
      });
    }
  });

  return {
    content: {
      model: updated,
    },
  };
}

function produceTorusEquivalents(item: any, p: any, i: number) {
  const input: any = {};
  let part: any = {};
  let choices: any[] = [];

  if (item.type === "text") {
    part = buildTextPart(p, i);
    input.inputType = "text";
  } else if (item.type === "numeric") {
    part = buildTextPart(p, i);
    input.inputType = "numeric";
  } else {
    part = buildDropdownPart(p, i);
    input.inputType = "dropdown";

    choices = Common.buildChoices({ children: [item] }, "fill_in_the_blank");
    input.chiceIds = choices.map((c: any) => c.id);
  }
  input.id = item.id;
  input.partId = part.id;

  return { input, part, choices };
}

function collectItemsParts(question: any) {
  const items = question.children.filter((c: any) => {
    return (
      c.type === "numeric" ||
      c.type === "text" ||
      c.type === "fill_in_the_blank"
    );
  });

  const parts = question.children.filter((c: any) => {
    return c.type === "part";
  });

  return { items, parts };
}

function buildDropdownPart(part: any, _i: number) {
  const responses = part.children.filter((p: any) => p.type === "response");
  const hints = part.children.filter((p: any) => p.type === "hint");
  const skillrefs = part.children.filter((p: any) => p.type === "skillref");

  const id = part.id !== undefined && part.id !== null ? part.id + "" : guid();

  return {
    id,
    responses: responses.map((r: any) => ({
      id: guid(),
      score: r.score === undefined ? 0 : parseFloat(r.score),
      rule: `input like {${r.match}}`,
      feedback: {
        id: guid(),
        content: { model: Common.ensureParagraphs(r.children[0].children) },
      },
    })),
    hints: Common.ensureThree(
      hints.map((r: any) => ({
        id: guid(),
        content: { model: Common.ensureParagraphs(r.children) },
      }))
    ),
    objectives: skillrefs.map((s: any) => s.idref),
    scoringStrategy: "average",
  };
}

export function buildTextPart(part: any, _i: number) {
  const responses = part.children.filter((p: any) => p.type === "response");
  const hints = part.children.filter((p: any) => p.type === "hint");
  const skillrefs = part.children.filter((p: any) => p.type === "skillref");
  const id = part.id !== undefined && part.id !== null ? part.id + "" : guid();

  return {
    id,
    responses: responses.map((r: any) => {
      const cleanedMatch = replaceAll(r.match, "\\*", ".*");
      return {
        id: guid(),
        score: r.score === undefined ? 0 : parseFloat(r.score),
        rule: `input like {${cleanedMatch}}`,
        feedback: {
          id: guid(),
          content: {
            id: guid(),
            model: Common.ensureParagraphs(r.children[0].children),
          },
        },
      };
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
    scoringStrategy: "average",
  };
}

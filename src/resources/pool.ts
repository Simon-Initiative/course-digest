import { visit } from 'src/utils/xml';
import * as Histogram from 'src/utils/histogram';
import { Resource, TorusResource, Summary } from './resource';
import * as Formative from './formative';
import * as Summative from './summative';
import * as XML from 'src/utils/xml';
import { processCodeblock, processVariables } from './common';
import { ProjectSummary } from 'src/project';
import {
  getChild,
  getChildren,
  getDescendants,
  emptyOrDummyContent,
} from './questions/common';
import * as DOM from 'src/utils/dom';
import { replaceAll } from 'src/utils/common';

export type PoolFormat = 'Summative' | 'Formative';

export class Pool extends Resource {
  poolFormat: PoolFormat = 'Summative';

  constructor(
    file: string,
    navigable: boolean,
    format: PoolFormat = 'Summative'
  ) {
    super(file, navigable);
    this.poolFormat = format;
  }

  restructurePreservingWhitespace($: any): any {
    processCodeblock($);
    processVariables($);
  }

  restructure($: any): any {
    // don't restructure pool sections away, they must be converted differently
    DOM.rename($, 'section', 'pool_section');

    if (this.poolFormat === 'Summative') Summative.convertToFormative($);
    Formative.performRestructure($);
  }

  translate(
    $: any,
    projectSummary: ProjectSummary
  ): Promise<(TorusResource | string)[]> {
    this.restructure($);
    const xml = $.html();
    return new Promise((resolve, _reject) => {
      XML.toJSON(xml, projectSummary, {
        // use same list as formative
        p: true,
        em: true,
        li: true,
        td: true,
        choice: true,
        stem: true,
        hint: true,
        feedback: true,
        explanation: true,
        material: true,
        anchor: true,
        translation: true,
        dt: true,
        dd: true,
      }).then((r: any) => {
        const items: any = [];

        // Must have pool root element
        const pool = getChild(r, 'pool');
        const legacyId = pool.id;
        const tagId = pool.id;

        let prefixContent: any[] = [];
        let poolQuestionNumber = 1;
        pool.children.forEach((c: any) => {
          if (c.type === 'content') {
            prefixContent = c.children;
          } else if (c.type !== 'title') {
            // question: prepend any pool-wide prologue to stem
            if (!emptyOrDummyContent(prefixContent)) {
              const stem = getChild(c, 'stem');
              stem.children = [...prefixContent, ...stem.children];
            }

            const subType = Formative.determineSubType(c);
            const pooledActivity = Formative.toActivity(
              c,
              subType,
              legacyId,
              this.file,
              []
            );
            pooledActivity.title = Formative.titleActivity(
              tagId,
              pool.title,
              c.id,
              poolQuestionNumber++
            );
            pooledActivity.tags = [tagId];
            pooledActivity.scope = 'banked';
            items.push(pooledActivity);

            // checkActivity(pooledActivity, 'Legacy Pool: ' + tagId);
          }
        });

        resolve(items);
      });
    });
  }

  summarize(): Promise<string | Summary> {
    const summary: Summary = {
      type: 'Summary',
      subType: 'SummativePool',
      elementHistogram: Histogram.create(),
      id: '',
      found: () => [],
    };

    return new Promise((resolve, reject) => {
      visit(this.file, (tag: string, attrs: Record<string, unknown>) => {
        Histogram.update(summary.elementHistogram, tag, attrs);

        if (tag === 'pool') {
          summary.id = (attrs as any)['id'];
        }
      })
        .then((_result) => {
          resolve(summary);
        })
        .catch((err) => reject(err));
    });
  }
}

//
// Convert a pool section which may contain multiple questions into
// a single merged multi-input or response_multi question w/original
// questions as parts.
// Can handle questions of type multi-input, mcq, or response_multi only
//
export const sectionToQuestion = (s: any): any => {
  console.log(`converting pool section ${s.id} to question`);

  // first collect all the question models in this section
  const pieces: any[] = [];
  s.children.forEach((sc: any) => {
    // save content pieces in type-tagged stem-only fragment
    if (sc.type === 'content') {
      pieces.push({
        type: 'content',
        stem: { content: sc.children },
      });
    } else if (sc.type !== 'title') {
      // restructure mcqs to multi-input w/dropdown so can be merged
      let subType = Formative.determineSubType(sc);
      let hasRichChoices = false;
      if (subType === 'oli_multiple_choice') {
        const inputs = getChildren(sc, 'multiple_choice');
        hasRichChoices = inputs.some((input: any) =>
          getChildren(input, 'choice').some(choiceHasTableOrImage)
        );
        inputs.forEach((input: any) => {
          // Labels in the dropdown must stay aligned with the rich legend.
          if (hasRichChoices) input.shuffle = 'false';
          input.type = 'fill_in_the_blank';
        });
        subType = 'oli_multi_input';
      }
      const model = Formative.toActivity(sc, subType, sc.id, 'pool', [])
        .content as any;
      if (hasRichChoices) moveRichChoicesToStem(model);
      // Keep the child question id until its parts have been renamed. It is not
      // included in the merged model emitted to Torus.
      model.legacyQuestionId = sc.id;
      pieces.push(model);
    }
  });

  // if any one is response_multi, our result must be response_multi
  const multInputsPerPart = pieces.some((q) => q.multInputsPerPart);

  // Get each question in shape to be merged. Even a one-question section is
  // renamed so its Torus part id documents the legacy child question id.
  const qs = pieces.filter((p) => p.type !== 'content');
  const usedPartIds = new Set<string>();
  qs.forEach((q: any) => {
    // If the result is response_multi, convert any regular multi-inputs.
    if (multInputsPerPart && !q.multInputsPerPart) toResponseMulti(q);

    // Use the child question id as provenance while ensuring all ids in the
    // synthesized question remain unique.
    makeUniqueIds(q, q.legacyQuestionId, usedPartIds);
  });

  // Now merge parts into one big question
  const concatLists = (objs: any[], fn: (obj: any) => any[] | undefined) =>
    objs.flatMap((o) => fn(o) || []);

  const stemContent = concatLists(pieces, (q) => q.stem?.content);
  const lastStemNode = stemContent[stemContent.length - 1];
  // Torus requires an editable model to end in a text block. Supplying it here
  // prevents editor normalization from splitting a final image-choice legend.
  if (lastStemNode && !/^h[1-6]$|^p$/.test(lastStemNode.type)) {
    stemContent.push({ type: 'p', children: [{ text: '' }] });
  }

  return {
    stem: { content: stemContent },
    choices: concatLists(pieces, (q) => q.choices),
    inputs: concatLists(pieces, (q) => q.inputs),
    multInputsPerPart,
    submitPerPart: true,
    authoring: {
      parts: concatLists(pieces, (q) => q.authoring?.parts),
      targeted: concatLists(pieces, (q) => q.authoring?.targeted),
      transformations: concatLists(pieces, (q) => q.authoring?.transformations),
      previewText: '',
    },
  };
};

// Dropdown options can only display plain text. Tables and images remain
// answerable by displaying every option in an alphabetic legend after the
// dropdown and using the same letters as its option text.
const choiceHasTableOrImage = (choice: any) =>
  ['table', 'img', 'image'].some(
    (type) => getDescendants(choice.children, type).length > 0
  );

// The image layout is deliberately narrow: mixed content containing an image
// remains a list, while a choice containing only one image can safely occupy a
// table cell without changing the order or structure of any surrounding text.
const choiceIsSingleImage = (choice: any) =>
  choice.content.length === 1 &&
  ['img', 'image'].includes(choice.content[0].type);

const upperLatinLabel = (index: number) => {
  let label = '';
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) {
    label = String.fromCharCode(65 + ((n - 1) % 26)) + label;
  }
  return label;
};

const moveRichChoicesToStem = (model: any) => {
  const imageOnly = model.choices.every(choiceIsSingleImage);
  const richChoices = model.choices.map((choice: any, index: number) => {
    const richContent = choice.content;
    choice.content = [{ text: upperLatinLabel(index) }];
    return { label: `${upperLatinLabel(index)}.`, content: richContent };
  });

  if (imageOnly) {
    // A borderless two-column table keeps image-only choices aligned while
    // placing each label next to its image instead of on the image baseline.
    model.stem.content.push({
      type: 'table',
      border: 'hidden',
      rowstyle: 'plain',
      children: richChoices.map((choice: any) => ({
        type: 'tr',
        children: [
          {
            type: 'td',
            align: 'right',
            children: [{ type: 'p', children: [{ text: choice.label }] }],
          },
          {
            type: 'td',
            align: 'left',
            children: choice.content,
          },
        ],
      })),
    });
  } else {
    // Lists allow table and mixed-content choices to retain their full rich
    // structure without creating invalid nested Torus tables.
    model.stem.content.push({
      type: 'ol',
      style: 'upper-latin',
      children: richChoices.map((choice: any) => ({
        type: 'li',
        children: choice.content,
      })),
    });
  }
};

// convert regular multi-input model to response_multi model
const toResponseMulti = (q: any) => {
  // rewrite regular multi-input rules to response_multi form
  q.authoring.parts.forEach((part: any) => {
    const inputId = q.inputs.find((inp: any) => inp.partId === part.id)?.id;
    part.responses.forEach(
      (r: any) =>
        (r.rule = replaceAll(r.rule, 'input ', `input_ref_${inputId} `))
    );

    // also set target list for this part
    part.targets = [inputId];
  });

  q.multInputsPerPart = true;
};

// Rewrite ids using the legacy child question id. Section pools are a rare
// legacy device for faking a heterogeneous multi-part question, so the common
// single-part child can preserve its question id directly as the Torus part id.
const makeUniqueIds = (
  q: any,
  legacyQuestionId: string,
  usedPartIds: Set<string>
) => {
  const idMap = new Map<string, string>();
  const isSinglePart = q.authoring.parts.length === 1;
  q.authoring.parts.forEach((part: any, index: number) => {
    const oldPartId = part.id;
    const legacyPartId = oldPartId || `p${index + 1}`;
    const basePartId = isSinglePart
      ? legacyQuestionId
      : `${legacyQuestionId}__${legacyPartId}`;
    let partId = basePartId;
    let suffix = 2;
    while (usedPartIds.has(partId)) partId = `${basePartId}__${suffix++}`;
    if (partId !== basePartId) {
      console.warn(
        `Duplicate part id while converting pool section: ${basePartId}; using ${partId}`
      );
    }
    usedPartIds.add(partId);
    part.id = partId;
    // update any per-part transformations
    q.authoring.transformations
      .filter((t: any) => t.partId === oldPartId)
      .forEach((t: any) => (t.partId = part.id));

    // qualify ids of inputs in this part
    if (q.inputs) {
      q.inputs
        .filter((inp: any) => inp.partId == oldPartId)
        .forEach((inp: any) => {
          const oldInputId = inp.id;
          inp.partId = part.id;
          inp.id = `${part.id}_${inp.id}`;
          idMap.set(oldInputId, inp.id);

          // for response_multi, replace input_ref_oldID input_ref_new_id in rules
          if (q.multInputsPerPart) {
            part.responses.forEach((rsp: any) => {
              rsp.rule = replaceAll(
                rsp.rule,
                `input_ref_${oldInputId} `,
                `input_ref_${idMap.get(oldInputId)} `
              );
            });
            // update inputId in part's target list
            part.targets = part.targets.map((id: string) =>
              id === oldInputId ? idMap.get(id) : id
            );
          }

          // if dropdown handle dependent choice ids
          if (inp.choiceIds) {
            // rename this input's choice objects at question level
            q.choices
              .filter((ch: any) => inp.choiceIds.includes(ch.id))
              .forEach((choice: any) => {
                const oldChoiceId = choice.id;
                idMap.set(choice.id, `${part.id}_${choice.id}`);
                choice.id = idMap.get(choice.id);

                // replace {oldChoiceId} {newChoiceId} in response rules
                part.responses.forEach((rsp: any) => {
                  rsp.rule = replaceAll(
                    rsp.rule,
                    `{${oldChoiceId}}`,
                    `{${choice.id}}`
                  );
                });
              });
            // update input's list of choice idrefs
            inp.choiceIds = inp.choiceIds.map((cid: string) => idMap.get(cid));
          }
        });
    }
  });

  // update all input_refs in stem
  getDescendants(q.stem.content, 'input_ref').forEach(
    (ref) => (ref.id = idMap.get(ref.id))
  );

  // replace all choiceIds in question-wide targeted feedback index keys
  q.authoring.targeted = q.authoring.targeted.map(
    ([[choiceId], respId]: any) => [[idMap.get(choiceId)], respId]
  );
};

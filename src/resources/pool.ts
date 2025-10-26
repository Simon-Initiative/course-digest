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
          if (c.type === 'content' && !emptyOrDummyContent(c.children)) {
            prefixContent = c.children;
          } else if (c.type !== 'title') {
            const subType = Formative.determineSubType(c);
            // prepend pool-wide prologue to question stem, safe if empty default
            c.stem.content = [...prefixContent, ...c.stem.content];
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
      if (subType === 'oli_multiple_choice') {
        getChildren(sc, 'multiple_choice').forEach(
          (input: any) => (input.type = 'fill_in_the_blank')
        );
        subType = 'oli_multi_input';
      }
      pieces.push(Formative.toActivity(sc, subType, sc.id, 'pool', []).content);
    }
  });

  // if any one is response_multi, our result must be response_multi
  const multInputsPerPart = pieces.some((q) => q.multInputsPerPart);

  // if >1 questions, get them in shape to be merged:
  const qs = pieces.filter((p) => p.type !== 'content');
  if (qs.length > 1) {
    let nPart = 1;
    qs.forEach((q: any) => {
      // if result is response_multi, convert any regular multi-inputs
      if (multInputsPerPart && !q.multInputsPerPart) toResponseMulti(q);

      // redo each question's ids to ensure unique over whole merged question
      makeUniqueIds(q, nPart);
      nPart += q.authoring.parts.length;
    });
  }

  // Now merge parts into one big question
  const concatLists = (objs: any[], fn: (obj: any) => any[] | undefined) =>
    objs.flatMap((o) => fn(o) || []);

  return {
    stem: { content: concatLists(pieces, (q) => q.stem?.content) },
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

// rewrite all ids using given part number as unique prefix
const makeUniqueIds = (q: any, nPart: number) => {
  const idMap = new Map<string, string>();
  q.authoring.parts.forEach((part: any) => {
    const oldPartId = part.id;
    part.id = `p${nPart++}`;
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

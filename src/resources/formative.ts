import { visit } from '../utils/xml';
import * as Histogram from '../utils/histogram';
import { guid, ItemReference } from '../utils/common';
import { Resource, TorusResource, Summary, Activity } from './resource';
import { standardContentManipulations, processCodeblock } from './common';
import * as DOM from '../utils/dom';
import * as XML from '../utils/xml';

function ensureParagraphs(children: any) {
  if (children.length === 1 && children[0].text !== undefined) {
    return [{type: 'p', children }]
  }
  return children;
}

function buildStem(question: any) {
  
  const stem = getChild(question.children, 'stem');
  return {
    content: {
      model: ensureParagraphs(stem.children),
    }
  };
}

function buildChoices(question: any) {
  const choices = getChild(question.children, 'multiple_choice').children;

  return choices.map((c: any) => ({
    content: {model: ensureParagraphs(c.children)},
    id: c.value,
  }));
}


function buildTextPart(question: any) {

  const responses = getChild(question.children, 'part')
    .children.filter((p: any) => p.type === 'response');
  const hints = getChild(question.children, 'part')
    .children.filter((p: any) => p.type === 'hint');

  return {
    id: '1',
    responses: responses.map((r: any) => ({
      id: guid(),
      score: r.score === undefined ? 0 : parseFloat(r.score),
      rule: `input like {${r.match}}`,
      feedback: {
        id: guid(),
        content: {
          id: guid(),
          model: ensureParagraphs(r.children[0].children),
        }
      }
    })),
    hints: ensureThree(hints.map((r: any) => ({
      id: guid(),
      content: {
        id: guid(),
        model: ensureParagraphs(r.children),
      }
    }))),
    scoringStrategy: 'average',
  }
}

function hint() {
  return {
    id: guid(),
    content: {model: [{type: 'p', children: [{text: ''}]}]}
  };
}

function ensureThree(hints: any) {
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


function buildMCQPart(question: any) {

  const responses = getChild(question.children, 'part')
    .children.filter((p: any) => p.type === 'response');
  const hints = getChild(question.children, 'part')
    .children.filter((p: any) => p.type === 'hint');

  return {
    id: '1',
    responses: responses.map((r: any) => ({
      id: guid(),
      score: r.score === undefined ? 0 : parseFloat(r.score),
      rule: `input like {${r.match}}`,
      feedback: {
        id: guid(),
        content: {model: ensureParagraphs(r.children[0].children)},
      }
    })),
    hints: ensureThree(hints.map((r: any) => ({
      id: guid(),
      content: {model: ensureParagraphs(r.children)},
    }))),
    scoringStrategy: 'average',
  }
}


function buildCATAPart(question: any, choices: any, part: any, targeted: any, correct: any, incorrect: any) {

  const choiceIds = choices.map((c: any) => c.id);

  const responses = getChild(question.children, 'part')
    .children.filter((p: any) => p.type === 'response');
  const hints = getChild(question.children, 'part')
    .children.filter((p: any) => p.type === 'hint');


  part.id = '1';
  part.responses = responses.map((r: any) => {

      const id = guid();

      // Build the rule and the 'targeted' association list at the same time

      let rule;
      if (r.match === '*') {
        rule = 'input like {.*}';
      } else {

        const presentIds =  r.match
        .split(',')
        .reduce((s: any, p: any) => {
          s[p] = true;
          return s;
        }, {});

        targeted.push([Object.keys(presentIds), id]);
        if (r.score === '1') {
          correct.push([Object.keys(presentIds), id]);
        } else {
          incorrect.push([Object.keys(presentIds), id]);
        }

        rule = choiceIds.reduce((s: any, p: any) => {
          if (s === '') {
            return presentIds[p] ? `input like {${p}}` : `!(input like {${p}})`;
          } 
          return (presentIds[p] ? `input like {${p}}` : `!(input like {${p}})`) + ' && (' + s + ')';
        }, '');

      }

      return {
        id,
        score: r.score === undefined ? 0 : parseFloat(r.score),
        rule,
        feedback: {
          id: guid(),
          content: {model: ensureParagraphs(r.children[0].children)},
        }
      };
    });
  
  part.hints = ensureThree(hints.map((r: any) => ({
      id: guid(),
      content: {model: ensureParagraphs(r.children)},
    })));
  part.scoringStrategy = 'average';
  
}

function mcq(question: any) {

  return {
    stem: buildStem(question),
    choices: buildChoices(question),
    authoring: {
      parts: [buildMCQPart(question)],
      transformations: [],
      previewText: '',
    }
  };
}


function cata(question: any) {

  const choices = buildChoices(question);

  const part = {};
  const targeted : any = [];
  const correct : any = [];
  const incorrect : any = [];
  buildCATAPart(question, choices, part, targeted, correct, incorrect);

  return {
    stem: buildStem(question),
    choices,
    type: 'TargetedCATA',
    authoring: {
      parts: [part],
      transformations: [],
      previewText: '',
      targeted,
      correct,
      incorrect
    }
  };
}

function single_response_text(question: any) {
  return {
    stem: buildStem(question),
    authoring: {
      parts: [buildTextPart(question)],
      transformations: [],
      previewText: '',
    }
  };
}

function buildModel(subType: ItemTypes, question: any) {
  if (subType === 'oli_multiple_choice') {
    return mcq(question);
  } 
  if (subType === 'oli_check_all_that_apply') {
    return cata(question);
  }
  return single_response_text(question);
}

function toActivity(question: any, subType: ItemTypes, legacyId: string) {

  const activity : Activity = {
    type: 'Activity',
    id: '',
    originalFile: '',
    title: '',
    tags: [],
    unresolvedReferences: [],
    content: {},
    objectives: [],
    legacyId,
    subType,
  };

  activity.id = question.id;
  activity.content = buildModel(subType, question);
  return activity;
}

function countIn(collection: any, named: string) {
  return collection.reduce((c: any, e: any) => c + (named == e.type ? 1 : 0), 0);
}

function getChild(collection: any, named: string) {
  const items = collection.filter((e: any) => named == e.type);
  if (items.length > 0) {
    return items[0];
  }
  return undefined;
}


type ItemTypes = 'oli_multiple_choice' | 'oli_check_all_that_apply' | 'oli_short_answer';

function determineSubType(question: any) : ItemTypes {

  const mcq = getChild(question.children, 'multiple_choice');

  if (mcq !== undefined) {

    if (mcq.select && mcq.select === 'multiple') {
      return 'oli_check_all_that_apply';
    } 
    return 'oli_multiple_choice';
  }

  return 'oli_short_answer';

}

export class Formative extends Resource {

  restructurePreservingWhitespace($: any): any {
    processCodeblock($);
  }

  restructure($: any) : any {
    standardContentManipulations($);

    DOM.rename($, 'question body', 'stem');
    DOM.eliminateLevel($, 'section');
    DOM.eliminateLevel($, 'page');
    DOM.eliminateLevel($, 'pool');
  }

  translate(xml: string, $: any) : Promise<(TorusResource | string)[]> {

    return new Promise((resolve, reject) => {
      XML.toJSON(xml, { p: true, em: true, li: true, td: true}).then((r: any) => {
        const legacyId = r.children[0].id;
        const activities = r.children[0].children
        .filter((item: any) => item.type === 'question')
        .map((question: any) => {
          const subType = determineSubType(question);
          return toActivity(question, subType, legacyId);
        });
        
        resolve(activities);
      });
    });

  }

  summarize(file: string): Promise<string | Summary> {

    const foundIds: ItemReference[] = [];
    const summary : Summary = {
      type: 'Summary',
      subType: 'Formative',
      elementHistogram: Histogram.create(),
      id: '',
      found: () => foundIds,
    };

    return new Promise((resolve, reject) => {

      visit(file, (tag: string, attrs: Object) => {
        Histogram.update(summary.elementHistogram, tag, attrs);

        if (tag === 'assessment') {
          summary.id = (attrs as any)['id'];
        }

      })
      .then((result) => {
        resolve(summary);
      })
      .catch(err => reject(err));
    });
  }
}

import * as Cheerio from 'cheerio';
import { ProjectSummary } from './project';
import * as Common from './resources/questions/common';
import {
  eqRule,
  equalsRule,
  iequalsRule,
  matchListRule,
  matchRule,
  setDifference,
} from './resources/questions/rules';
import { executeSerially, guid, replaceAll, toPlainText } from './utils/common';
import * as DOM from './utils/dom';
import * as fs from 'fs';
import { standardContentManipulations } from './resources/common';
import * as XML from 'src/utils/xml';
import {
  Activity,
  defaultCollabSpaceDefinition,
  TorusResource,
} from './resources/resource';
import { decode } from 'html-entities';
import { updateInputRefs } from './resources/questions/multi';
import * as path from 'path';
import { flattenPath } from './media';

// Convert QTI 1.2 format archives as exported from Canvas or Blackboard into archive of banked questions
// Blackboard QTI exports include non-standard Blackboard extensions and has slight differences.
// Code attempts to handle both where there are differences.

// Note: because we rely the existing Promise-valued routine XML.toJSON at leaves of call tree to convert bits of content
// (stem, choices, feedback) where needed to our content model, essentially every function becomes async. However,
// serial processing is very desireable to ensure trace and debugging messages come out in an intelligible
// order. Therefore care is taken to ensure serial processing via executeSerially, though this adds some complexity.

export function processQtiFolder(
  dir: string,
  projectSummary: ProjectSummary
): Promise<Activity[]> {
  return new Promise(async (resolve, _reject) => {
    console.log('Processing QTI package ' + dir);

    // load manifest
    const manifest = dir + '/' + 'imsmanifest.xml';
    if (!fs.existsSync(manifest)) {
      console.log(`imsmanifest.xml not found in ${dir}`);
      resolve([]);
    }
    const $ = DOM.read(manifest);

    // collect file paths from resource elements
    // Canvas has resource's file(s) in href attr of file sub-element(s)
    // Some Blackboard exports have filepaths in bb:file attribute
    const bbResources = $('resource[bb\\:file]');
    const files = bbResources.length
      ? $(bbResources).map((i, elem) => $(elem).attr('bb:file'))
      : $('resource file').map((i, elem) => $(elem).attr('href'));

    const fileProcessors = files
      .get()
      .map((file) => () => processResourceFile(`${dir}/${file}`));

    // result is concatenated list of activities from each resource file
    const activities = await executeSerially(fileProcessors);

    // post-process to fix up image refs, recording in media summary
    activities.forEach((a: Activity) => fixImageRefs(a, dir, projectSummary));

    resolve(activities);
  });
}

// resolves to list of activity resources, [] if none
async function processResourceFile(file: string): Promise<Activity[]> {
  return new Promise((resolve, _reject) => {
    // Detect files we can convert by looking for root element of questtestinterop
    const $ = DOM.read(file);
    const rootTag = $(':root').prop('tagName').toLowerCase();
    if (rootTag !== 'questestinterop') {
      // check for QTI version 2.x tags which are entirely different
      if ($('assessmentItem, responseDeclaration').length) {
        console.log(
          'QTI 2.x is not yet supported. Handles QTI 1.2 as exported by Canvas or equivalent.'
        );
      }
      resolve([]);
    }

    // else have a questtestinterop file

    // tag is the containing zip file name, i.e parent directory of this file
    const tag = path.basename(path.dirname(file));
    // title is used to label individual activities
    const title = fixBBTitle($('assessment').attr('title') || 'Untitled');

    const itemProcessors = $('item')
      .map((i, item) => () => processQtiItem($, item, title, i, tag))
      .get();
    resolve(executeSerially(itemProcessors));
  });
}

// Blackboard-exported titles include long unneded prefix. Also break assessments into
// multiple resource files appending a,b,c,... suffix which we will strip
const fixBBTitle = (s: string) =>
  s.startsWith('single.qti.export')
    ? s
        .replace('single.qti.export.referenced.canvas.name.prefix ', '')
        .slice(0, -1)
    : s;

async function processQtiItem(
  $: cheerio.Root,
  item: any,
  title: string,
  i: number,
  tag: string
) {
  // get value from named item metadata field
  const getFieldValue = (fieldlabel: string) =>
    $(item)
      .find(
        `qtimetadatafield:has(fieldlabel:contains("${fieldlabel}")) fieldentry`
      )
      .first()
      .text();

  // QTI standard does not specify question type names, but it is convenient to have them. Canvas uses the QTI-standard
  // qtimetadata extension mechanism for "external vocabulary" to include a "question_type" field. Blackboard includes
  // its question type identifiers in a custom bbmd_questiontype field in its own custom metadata section.
  // Lower-case types below are from Canvas; mixed-case are Blackboard's
  const bbType = $(item).find('bbmd_questiontype').first();
  const type =
    $(bbType).length > 0 ? $(bbType).text() : getFieldValue('question_type');
  console.log(`Question type ${type}`);

  let q, subType: any;
  switch (type) {
    case 'multiple_choice_question':
    case 'Multiple Choice':
    // true/false question just special case of multiple choice
    case 'true_false_question':
    case 'True/False':
    // BB Either/Or is just a general two-choice multiple choice
    case 'Either/Or':
      subType = 'oli_multiple_choice';
      q = await build_multiple_choice($, item);
      if (type === 'Either/Or') fixBBChoices(q);
      break;
    case 'multiple_answers_question':
    case 'Multiple Answer':
      subType = 'oli_check_all_that_apply';
      q = await build_cata($, item);
      break;
    case 'multiple_dropdowns_question':
    case 'Jumbled Sentence':
      subType = 'oli_multi_input';
      q = await build_multi_dropdown($, item);
      break;
    case 'numerical_question':
    case 'Numeric':
      subType = 'oli_short_answer';
      q = await build_short_answer($, item, 'numeric');
      break;
    case 'Fill in the Blank':
      subType = 'oli_short_answer';
      q = await build_short_answer($, item, 'text');
      break;
    case 'calculated_question':
    case 'Calculated':
      subType = 'oli_short_answer';
      q = await build_calculated($, item);
      break;
    default:
      console.log('Unsupported question type: ' + type);
      return [];
  }

  return {
    type: 'Activity',
    subType,
    id: guid(),
    title: `${title}-q${i + 1}`,
    content: q,
    scope: 'banked',
    tags: [tag],
    unresolvedReferences: [],
    objectives: [],
    legacyPath: '',
    legacyId: '',
    warnings: [],
  };
}

async function build_multiple_choice($: cheerio.Root, item: any) {
  return {
    stem: await getStem($, item),
    choices: await getChoices($, item),
    authoring: {
      version: 2,
      parts: [mcq_part($, item)],
      transformations: getShuffle($, item)
        ? [Common.shuffleTransformation()]
        : [],
      targeted: [],
      previewText: '',
    },
  };
}

// Found BB Either/Or choice text came out true_false.true, true_false.false
// Assuming this is some BB-specific convention for Either/Or type
function fixBBChoices(q: { choices: any[] }) {
  q.choices.forEach((c) => {
    const text = toPlainText(c.content);
    const newText = text.split('.')[1] || text;
    c.content = Common.buildContentModelFromText(newText);
  });
}

// Used for both single part multiple choice (respident === '')
// and potentially multi-part dropdown question parts (respident set)
function mcq_part($: cheerio.Root, item: any, respident = '') {
  const correctResp = getCorrectRespConditions($, item, respident);
  // Found BB multi-part dropdowns with a single correct response condition of form
  // <and>
  //   <varequal respident="a"> correctChoicePartA</varequal>
  //   <varequal respident="b"> correctChoicePartB</varequal>
  // </and>
  // Selecting the varequal by respident handles this
  const varSelector =
    respident === '' ? 'varequal' : `varequal[respident="${respident}"]`;
  const correctId = $(correctResp).find(varSelector).text().trim();
  if (correctId === '') console.log('correct choice not found!');
  // must use part-qualified choice id in multi-part items
  const torusId = respident === '' ? correctId : `${respident}_${correctId}`;
  const correctResponse = {
    id: guid(),
    score: 1,
    rule: matchRule(torusId),
    feedback: {
      id: guid(),
      content: Common.buildContentModelFromText('Correct'),
    },
  };
  return {
    id: respident === '' ? '1' : respident,
    responses: [correctResponse, Common.makeCatchAllResponse()],
    hints: Common.ensureThree(),
    scoringStrategy: 'average',
  };
}

function getShuffle($: cheerio.Root, item: any, respident = '') {
  // use optional respident to qualify selection on multi-part questions
  const choiceSelector =
    respident === ''
      ? 'render_choice'
      : `response_lid[ident="{respident}"] render_choice`;
  return $(item).find(choiceSelector).attr('shuffle') === 'Yes';
}

function getCorrectRespConditions($: cheerio.Root, item: any, respident = '') {
  // Search respconditions containing a child var operator (varequal, vargt, varlt etc)
  // using respident of part. respident of '' means single part so any child will do
  const childSelector = respident === '' ? '*' : `*[respident="${respident}"]`;
  const correct: any[] = [];
  $(item)
    .find(`respcondition:has(${childSelector})`)
    .each((i: number, resp: any) => {
      if (
        $(resp).attr('title') === 'correct' ||
        $(resp).find('setvar:contains("SCORE.max")').length == 1 ||
        // Canvas seems to always set correct score of 100, presumably percentage
        $(resp).find('setvar:contains("100")').length === 1 ||
        // seen in BB exports: no score set, but shows feedback named "correct"
        $(resp).find('displayfeedback[linkrefid="correct"]').length === 1
        // could also check for score set to declared max value of outcome variable
      ) {
        correct.push(resp);
      }
    });

  if (correct.length === 0) console.log('correct response condition not found');
  return correct;
}

async function build_cata($: cheerio.Root, item: any) {
  const choices = await getChoices($, item);
  const [part, correct] = cata_part($, item, choices);
  return {
    stem: await getStem($, item),
    choices,
    authoring: {
      version: 2,
      parts: [part],
      correct,
      transformations: getShuffle($, item)
        ? [Common.shuffleTransformation()]
        : [],
      previewText: '',
      targeted: [],
    },
  };
}

function cata_part($: cheerio.Root, item: any, choices: any[]) {
  const correctResp = getCorrectRespConditions($, item)[0];
  const allIds = choices.map((choice: any) => choice.id);
  const incorrectIds = $(correctResp)
    .find('not>varequal')
    .map((i: number, vareq: any) => $(vareq).text().trim())
    .get();
  const correctIds = setDifference(allIds, incorrectIds);
  const correctResponse = {
    id: guid(),
    score: 1,
    rule: matchListRule(allIds, correctIds),
    feedback: {
      id: guid(),
      content: Common.buildContentModelFromText('Correct'),
    },
  };
  // return part plus correct map
  return [
    {
      id: '1',
      responses: [correctResponse, Common.makeCatchAllResponse()],
      hints: Common.ensureThree(),
      scoringStrategy: 'average',
    },
    // torus model uses to map from correct ID set to response id
    [correctIds, correctResponse.id],
  ];
}

async function build_multi_dropdown($: cheerio.Root, item: any) {
  // following collect choices and inputs for all parts:
  const choices: any[] = [];
  const inputs: any[] = [];
  const parts: any[] = [];
  const transformations: any[] = [];

  const stem = await getStem($, item, 'inputs');

  // In QTI, each input to fill in is a "response", corresponding to a torus part.
  // When answer type is a logical id ("lid") as for choices, QTI response is specified
  // by a response_lid element with id in "ident" attribute. Result processing rules are
  // linked to part by matching "respident" attribute = response ident in the varequal element.
  // Although this is NOT part of QTI 1.2 standard, Canvas,Blackboard apparently indicate
  // dropdown locations by associated input item id such as a, b embedded in stem as [a], [b].
  // Blackboard exports just use the input ids a and b as the response ident. Canvas uses
  // distinct response idents and includes the linked input id as piece of mattext content
  // within the response_lid element. Canvas also seems to generate response idents of form
  // response_a, response_b. We rely on latter convention to match responses to input ids.
  const responses = $(item).find('response_lid').get();
  for (const response of responses) {
    const response_id = $(response).attr('ident') || 'missing_response_id';
    const response_input_id = response_id?.includes('_')
      ? response_id.split('_')[1]
      : response_id;

    // get choices within current response,  ignoring the "choose" or "choose one" choice
    // for dropdown that apparently gets included
    const choicesTemp = await getChoices($, response);
    const responseChoices = choicesTemp.filter(
      (c: any) => !toPlainText(c.content).trim().startsWith('choose')
    );
    // In QTI different parts may make use of same choice. Qualify by respident to make
    // unique choice ids for each part. Will also have to be done when generating rules
    responseChoices.forEach((c: any) => (c.id = `${response_id}_${c.id}`));
    choices.push(...responseChoices);

    inputs.push({
      id: response_input_id,
      inputType: 'dropdown',
      choiceIds: responseChoices.map((c: any) => c.id),
      partId: response_id,
      // could estimate size from max choice text length
    });

    parts.push(mcq_part($, item, response_id));

    if (getShuffle($, item, response_id))
      transformations.push(Common.shufflePartTransformation(response_id));
  }

  return {
    stem,
    choices,
    inputs,
    submitPerPart: true,
    authoring: {
      version: 2,
      parts,
      transformations,
      previewText: '',
      targeted: [],
    },
  };
}

async function build_short_answer(
  $: cheerio.Root,
  item: any,
  inputType: 'numeric' | 'text'
) {
  return {
    stem: await getStem($, item),
    inputType,
    authoring: {
      version: 2,
      parts: [short_answer_part($, item, inputType)],
      transformations: [],
      previewText: '',
      targeted: [],
    },
  };
}

function short_answer_part($: cheerio.Root, item: any, inputType: string) {
  // Allow for multiple correct answers, primarily for text input accepting multiple forms
  const correctRespConds = getCorrectRespConditions($, item);

  const condToRule = (respCond: any) => {
    let rule = null;
    if (inputType === 'numeric') {
      const varequal = $(respCond).find('varequal')[0];
      if (varequal) {
        rule = eqRule($(varequal).text());
      } else {
        const varlb = $(respCond).find('varlte, varlt')[0];
        const varub = $(respCond).find('vargte, vargt')[0];
        if (varlb && varub) {
          // both upper and lower bound => range rule
          // console.log('found upper and lower bound rules');
          // but have seen this special case in canvas export:
          if ($(varlb).text() === $(varub).text()) {
            rule = eqRule($(varlb).text());
          } else {
            const lbchar = $(varlb).prop('tagName') === 'varlt' ? '(' : '[';
            const rbchar = $(varub).prop('tagName') === 'vargt' ? ')' : ']';
            rule = eqRule(
              lbchar + $(varlb).text() + ',' + $(varub).text() + rbchar
            );
          }
        }
        // else could be pure lt or gt rule, rare in practice
      }
    } else if (inputType === 'text') {
      const varequal = $(respCond).find('varequal')[0];
      if (varequal) {
        rule =
          $(varequal).attr('case') === 'Yes'
            ? equalsRule($(varequal).text())
            : iequalsRule($(varequal).text());
      }
      // varsubstring also possible, with case parameter
    }
    return rule;
  };

  const correctResponses = correctRespConds.map((respCond) => {
    return {
      id: guid(),
      score: 1,
      rule: condToRule(respCond),
      feedback: {
        id: guid(),
        content: Common.buildContentModelFromText('Correct'),
      },
    };
  });

  return {
    id: '1',
    responses: [...correctResponses, Common.makeCatchAllResponse()],
    hints: Common.ensureThree(),
    scoringStrategy: 'average',
  };
}

async function build_calculated($: cheerio.Root, item: any) {
  // build up Javascript variable code for transform
  const codelines = [];
  let scale;
  $(item)
    .find('vars>var')
    .each((i: number, elem: any) => {
      const name = $(elem).attr('name');
      const min = $(elem).find('min').first().text();
      const max = $(elem).find('max').first().text();
      // number of decimal points
      scale = $(elem).attr('scale') || '0';
      codelines.push(`const ${name} = OLI.random(${min}, ${max}, ${scale});`);
    });
  const formulaEncoded = $(item).find('formula').first().text();
  const formulaMathML = decode(replaceAll(formulaEncoded, '&amp;', '&'), {
    level: 'html5',
  });
  const formulaJavascript = MathMlToJavascript(formulaMathML);
  // hard to know where to get decimal places required in answer, does not seem explicit.
  // Try to sniff from first sample answer.
  const sampleAnswer = $(item).find('var_set>answer').first().text();
  const sampleDecimalPart = sampleAnswer.split('.')[1];
  const answerDecimals = sampleDecimalPart ? sampleDecimalPart.length : 0;
  codelines.push(
    `const answer = (${formulaJavascript}).toFixed(${answerDecimals});`
  );
  let ruleArg = '@@answer@@';

  // If includes a percent tolerance, define vars for bounds
  // Unclear how to interpret other types of tolerance -- this is not qti standard
  const tolerance = $(item).find('answer_tolerance[type=percent]')[0];
  if (tolerance) {
    const percent = $(tolerance).text();
    codelines.push(`const ansLow = (1 - 0.01*${percent})*answer`);
    codelines.push(`const ansHigh = (1 + 0.01*${percent})*answer`);
    ruleArg = '[@@ansLow@@,@@ansHigh@@]';
  }

  // list exported vars
  const allVars = codelines.map((line: string) => line.split(' ')[1]);
  codelines.push(`module.exports = {`);
  allVars.forEach((v) => codelines.push(`   ${v},`));
  codelines.push(`};`);

  const expression = codelines.join('\n');
  // console.log('expression:\n' + expression);

  const transform = {
    operation: 'variable_substitution',
    id: guid(),
    firstAttemptOnly: false,
    data: [
      {
        type: 'variable',
        id: guid(),
        name: 'module',
        variable: 'module',
        expression,
      },
    ],
  };

  const correctResponse = {
    id: guid(),
    score: 1,
    rule: eqRule(ruleArg),
    feedback: {
      id: guid(),
      content: Common.buildContentModelFromText('Correct'),
    },
  };
  const part = {
    id: '1',
    responses: [correctResponse, Common.makeCatchAllResponse()],
    hints: Common.ensureThree(),
    scoringStrategy: 'average',
  };

  return {
    stem: await getStem($, item, 'variables'),
    inputType: 'numeric',
    authoring: {
      version: 2,
      parts: [part],
      transformations: [transform],
      previewText: '',
      targeted: [],
    },
  };
}

function MathMlToJavascript(mathML: string) {
  /*
  // rudimentary start: strip tags, adjust special chars and hope
  const plainText = mathML.replace(/(<([^>]+)>)/gi, '');
  const expr = plainText.replace('÷', '/').replace('×', '*');
  */
  const $ = Cheerio.load(mathML, { xmlMode: true });

  function translate(elem: cheerio.Element): string {
    let result = '';

    const tagName = (elem as cheerio.TagElement).tagName;

    if ($(elem).children().length === 0) {
      // leaf node: could be mn (number), mi (identifier), mo (operator)
      result = $(elem).text();
      if (tagName === 'mo') result = result.replace('÷', '/').replace('×', '*');
    } else if (tagName === 'mfrac') {
      // Fraction
      const numExpr = translate($(elem).children()[0]);
      const denomExpr = translate($(elem).children()[1]);
      result = `(${numExpr})/(${denomExpr})`;
    } else if (tagName === 'msup') {
      // Superscript (power)
      const baseExpr = translate($(elem).children()[0]);
      const expExpr = translate($(elem).children()[1]);
      result = `Math.pow(${baseExpr}, ${expExpr})`;
    } else if (tagName === 'mroot') {
      // Root with index
      const argExpr = translate($(elem).children()[0]);
      const rootExpr = translate($(elem).children()[1]);
      result = `Math.pow(${argExpr}, 1/(${rootExpr}))`;
    } else {
      // any other node with children (includes math root): concat child results
      result = $(elem)
        .children()
        .get()
        .map((child) => translate(child))
        .join('');
    }

    if (tagName === 'msqrt') {
      // Square root
      result = `Math.sqrt(${result})`;
    } else if (tagName === 'mrow') {
      // Grouping
      result = `(${result})`;
    }

    return result;
  }

  const expression = translate($('math')[0]);
  const expr = expression.replace(/\s+/g, ' ').trim();
  console.log('MathML to Javascript: ', mathML, '\n', expr);
  return expr;
}

async function getChoices($: cheerio.Root, item: any) {
  const choiceGetters = $(item)
    .find('render_choice response_label')
    .map((i: number, elem: any) => async () => {
      const content = await getContent($, elem);
      return {
        id: $(elem).attr('ident'),
        content: Common.ensureParagraphs(content as any[]),
      };
    })
    .get();

  return await executeSerially(choiceGetters);
}

async function getStem($: cheerio.Root, item: any, replace = '') {
  const presentation = $(item).find('presentation').first();
  let content = await getContent($, presentation, replace);
  // have to fix up input refs post conversion
  if (replace === 'inputs') content = updateInputRefs(content, {});

  return { content: Common.ensureParagraphs(content as any[]) };
}

async function getContent($: cheerio.Root, elem: any, replace = '') {
  // Blackboard may use mat_formattedtext extension
  const mattext = $(elem).find('mattext, mat_formattedtext').first();
  const rawtext = $(mattext).text();

  let text = rawtext;
  if (replace === 'variables')
    text = text.replace(/\[/g, '@@').replace(/\]/g, '@@');
  else if (replace === 'inputs') {
    // translate to unrestructured legacy input_ref tag form
    text = text.replace(/\[/g, '<input_ref input="').replace(/\]/g, '"/>');
  }

  if ($(mattext).attr('texttype') === 'text/plain')
    return Common.buildContentModelFromText(text);

  // Else HTML as XML-encoded text content:  &lt;, &gt; around tags,
  // other ampersand-escaped items as e.g. &amp;nbsp;
  const html = decode(replaceAll(text, '&amp;', '&'), { level: 'html5' });
  return await htmlToContentModel(html);
}

async function htmlToContentModel(html: string) {
  // Blackboard questions can embed img tags in paragraphs w/<br> tags before and/or after
  // Strip all of these, torus doesn't use. Strip in source because unclosed tags not XML
  const fixedHtml = html.replace(/\<br\>/g, '');

  // parse fragment as xml doc
  const $ = Cheerio.load(`<html><body>${fixedHtml}</body><html>`, {
    xmlMode: true,
  });

  // restructure as we do for legacy XML content. Overkill, but adjusts some elements we want:
  // unwrapped mathML to formula-inline, inline styles like sup to em tag form handled by toJSON
  standardContentManipulations($);

  // do some ad hoc restructuring for problematic html we have encountered

  // Canvas can wrap text in spans, some w/app-specific classes, e.g. <span class="prompt">
  // Blackboard sometimes wraps image elements too. Strip, replacing with inner html.
  $('span').each((_i, elem) => {
    $(elem).replaceWith($(elem).html()!);
  });

  // Now assume any images left within p's are standalone block images.
  DOM.eliminateLevel($, 'p:has(>img)');

  // torus tables don't use these wrappers
  DOM.eliminateLevel($, 'thead');
  DOM.eliminateLevel($, 'tbody');

  // Canvas output wraps content in div, not p. Torus content model does not have divs at all
  DOM.eliminateLevel($, 'div:has(>p)');
  DOM.rename($, 'div', 'p');

  const xml = $.html();
  const docJSON: any = await XML.toJSON(xml, {} as ProjectSummary, {
    p: true,
    em: true,
    li: true,
    td: true,
    th: true,
    dt: true,
    dd: true,
  });

  // desired content model = list of content elements in doc body
  const content = Common.getDescendants(docJSON.children, 'body')[0].children;

  return content;
}

export function fixImageRefs(
  a: Activity,
  qtiFolder: string,
  projectSummary: ProjectSummary
) {
  const stem = a.content.stem as { content: any[] };
  const images = [
    ...Common.getDescendants(stem.content, 'img'),
    ...Common.getDescendants(stem.content, 'img-inline'),
  ];

  images.forEach((img) => {
    const localPath = findImagePath(img.src, qtiFolder);
    if (localPath) {
      // flattenPath needs assetReference to record, but any dummy OK.
      const ref = { filePath: localPath, assetReference: '' };
      img.src = flattenPath(localPath, projectSummary.mediaSummary, ref);
    }
  });
}

function findImagePath(src: string, qtiFolder: string) {
  // Blackboard content-embedded images have magic srcs of form
  // @X@EmbeddedFile.requestUrlStub@X@bbcswebdav/xid-74789077_1
  // and store files within csfiles/home_dir as __xid-74789077_1.[jpg, png, ...?]
  if (src.startsWith('@X@EmbeddedFile')) {
    const basename = path.basename(src);
    const root = qtiFolder + '/csfiles/home_dir';
    const localPath =
      findFile(root, `__${basename}.jpg`) ||
      findFile(root, `__${basename}.png`);

    return localPath;
  }

  // not clear how to handle not-Blackboard case yet
  return qtiFolder + '/' + src;
}

// return path of given file within directory tree
function findFile(dir: string, filename: string): string | null {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stats = fs.statSync(filePath);

    if (stats.isDirectory()) {
      const foundFile = findFile(filePath, filename);
      if (foundFile) return foundFile;
    } else if (stats.isFile() && file === filename) {
      return filePath;
    }
  }

  return null;
}

// Note this has to happen *before* Tag resources are generated
export function addAssessments(activities: Activity[]): TorusResource[] {
  // get set of unique tags
  const tagIds = [...new Set(activities.map((a) => a.tags[0]))];

  const assessments = tagIds.map((tagId) => {
    const nItems = activities.filter((a) => a.tags.includes(tagId)).length;
    console.log(`${tagId}: ${nItems} items`);

    // page content model contains one selection of all items with tag
    const model: any[] = [];
    model.push({
      type: 'selection',
      logic: {
        conditions: {
          operator: 'all',
          children: [
            {
              fact: 'tags',
              operator: 'equals',
              value: [tagId],
            },
          ],
        },
      },
      count: nItems,
      id: guid(),
    });

    // create the wrapper practice page
    return {
      type: 'Page',
      id: guid(),
      title: tagId,
      legacyPath: '',
      legacyId: '',
      tags: [],
      unresolvedReferences: [],
      content: { model },
      isGraded: true,
      isSurvey: false,
      objectives: [],
      warnings: [],
      collabSpace: defaultCollabSpaceDefinition(),
    };
  });
  console.log(`created ${assessments.length} quiz pages`);

  return [...activities, ...assessments];
}

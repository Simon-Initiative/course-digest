import * as Cheerio from 'cheerio';
import { ProjectSummary } from './project';
import * as Common from './resources/questions/common';
import {
  eqRule,
  matchListRule,
  matchRule,
  setDifference,
} from './resources/questions/rules';
import { executeSerially, guid, replaceAll, toPlainText } from './utils/common';
import * as DOM from './utils/dom';
import * as fs from 'fs';
import { standardContentManipulations } from './resources/common';
import * as XML from 'src/utils/xml';
import { Activity } from './resources/resource';
import { decode } from 'html-entities';
import { updateInputRefs } from './resources/questions/multi';

// Convert QTI 1.2 format archives as exported from Canvas or Blackboard into archive of banked questions
// Blackboard QTI exports include non-standard Blackboard extensions and has slight differences.
// Code attempts to handle both where there are differences.

// Note: because we rely the existing Promise-valued routine XML.toJSON at leaves of call tree to convert bits of content
// (stem, choices, feedback) where needed to our content model, essentially every function becomes async. However,
// serial processing is very desireable to ensure trace and debugging messages come out in an intelligible
// order. Therefore care is taken to ensure serial processing via executeSerially, though this adds some complexity.

export function processQtiFolder(
  dir: string,
  _projectSummary: ProjectSummary
): Promise<Activity[]> {
  return new Promise((resolve, _reject) => {
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
    resolve(executeSerially(fileProcessors));
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
    const title = $('assessment').attr('title') || 'Untitled';

    const itemProcessors = $('item')
      .map((i, item) => () => processQtiItem($, item, title, i))
      .get();
    resolve(executeSerially(itemProcessors));
  });
}

async function processQtiItem(
  $: cheerio.Root,
  item: any,
  title: string,
  i: number
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

  let q, subType: any;
  switch (type) {
    case 'multiple_choice_question':
    case 'true_false_question':
    case 'Multiple Choice':
      subType = 'oli_multiple_choice';
      q = await build_multiple_choice($, item);
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
    case 'calculated_question':
    case 'Calculated':
      subType = 'oli_short_answer';
      q = await build_calculated($, item);
      break;
    default:
      console.log('Unsupported question type: ' + type);
      return [];
  }

  console.log(`Question type ${type}`);
  return {
    type: 'Activity',
    subType,
    id: guid(),
    title: `${title}-q${i + 1}`,
    content: q,
    scope: 'banked',
    tags: [title],
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

function mcq_part($: cheerio.Root, item: any, response_id = '') {
  const correctResp = findCorrectRespCondition($, item, response_id);
  const correctId = $(correctResp).find('varequal').text().trim();
  const correctResponse = {
    id: guid(),
    score: 1,
    rule: matchRule(correctId),
    feedback: {
      id: guid(),
      content: Common.buildContentModelFromText('Correct'),
    },
  };
  return {
    id: response_id === '' ? '1' : response_id,
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

function findCorrectRespCondition($: cheerio.Root, item: any, respident = '') {
  // Search respconditions containing a child var operator (varequal, vargt, varlt etc)
  // using respident of part. respident of '' means single part so any child will do
  const childSelector = respident === '' ? '*' : `*[respident="${respident}"]`;
  let correct: any = null;
  $(item)
    .find(`respcondition:has(${childSelector})`)
    .each((i: number, resp: any) => {
      if (
        $(resp).attr('title') === 'correct' ||
        $(resp).find('setvar:contains("SCORE.max")').length == 1 ||
        // Canvas seems to always set correct score of 100, presumably percentage
        $(resp).find('setvar:contains("100")').length === 1
        // should check for max declared value of outcome variable
      ) {
        correct = resp;
        return false; // do not continue loop
      }
    });

  if (correct === null) console.log('correct response condition not found');
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
  const correctResp = findCorrectRespCondition($, item);
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
  // linked to part by matching "respid" attribute = response ident in the varequal element.
  // Although this is NOT part of QTI 1.2 standard, Canvas,Blackboard apparently indicate
  // dropdown locationsby associated input item id such as a, b embedded in stem as [a], [b].
  // Blackboard exports just use the input ids a and b as the response ident. Canvas uses
  // distinct response idents and includes the linked input id as piece of mattext content
  // within the response_lid element. Canvase also seems to generate response idents of form
  // response_a, response_b. We rely on latter convention to match responses to input ids.
  const responses = $(item).find('response_lid').get();
  for (const response of responses) {
    const response_id = $(response).attr('ident') || 'missing_response_id';
    const response_input_id = response_id?.includes('_')
      ? response_id.split('_')[1]
      : response_id;

    // get choices within current response,  ignoring the "choose one" choice
    // for dropdown that gets included
    const choicesTemp = await getChoices($, response);
    const responseChoices = choicesTemp.filter(
      (c: any) => toPlainText(c.content) !== 'choose one'
    );

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
  const correctResp = findCorrectRespCondition($, item);
  let rule = eqRule('1'); // dummy
  if (inputType === 'numeric') {
    const varequal = $(correctResp).find('varequal')[0];
    if (varequal) {
      rule = eqRule($(varequal).text());
    } else {
      const varlb = $(correctResp).find('varlte, varlt')[0];
      const varub = $(correctResp).find('vargte, vargt')[0];
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
  }
  // TODO: else handle string rule
  const correctResponse = {
    id: guid(),
    score: 1,
    rule,
    feedback: {
      id: guid(),
      content: Common.buildContentModelFromText('Correct'),
    },
  };
  return {
    id: '1',
    responses: [correctResponse, Common.makeCatchAllResponse()],
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
  // console.log('MathML to Javascript: ', mathML, '\n', expr);
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
    text = text.replace('[', '<input_ref input="').replace(']', '"/>');
  }

  if ($(mattext).attr('texttype') === 'text/plain')
    return Common.buildContentModelFromText(text);

  // Else HTML as XML-encoded text content:  &lt;, &gt; around tags,
  // other ampersand-escaped items as e.g. &amp;nbsp;
  const html = decode(replaceAll(text, '&amp;', '&'), { level: 'html5' });
  // console.log('html: ' + html);

  /*
  // just strips any html tags. Leaves white space around tags
  const plainText = html.replace(/(<([^>]+)>)/gi, '');
  // console.log('plainText= ' + plainText);
  return Common.buildContentModelFromText(plainText);
*/

  return await htmlToContentModel(html);
}

async function htmlToContentModel(html: string) {
  // parse fragment as xml doc
  const $ = Cheerio.load(`<html><body>${html}</body><html>`, { xmlMode: true });

  // restructure as we do for legacy XML content. Overkill, but adjusts some elements we want:
  // unwrapped mathML to formula-inline, inline styles like sup to em tag form handled by toJSON
  standardContentManipulations($);
  // do some custom restructuring for our html.
  // Canvas output wraps content in div, not p
  DOM.eliminateLevel($, 'div:has(>p)');
  DOM.rename($, 'div', 'p');
  // Output can wrap text in spans with app-specific classes, e.g. <span class="prompt">
  $('span').each(function () {
    $(this).replaceWith($(this).text());
  });

  const xml = $.html();
  // console.log('xml after restructure:' + xml);
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
  // console.log(`json: ${JSON.stringify(content, null, 2)}\n`);
  return content;
}

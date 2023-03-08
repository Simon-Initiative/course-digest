import { ItemReference, guid } from 'src/utils/common';
import * as Histogram from 'src/utils/histogram';
import * as DOM from 'src/utils/dom';
import { TorusResource } from './resource';

export interface HasReferences {
  found: () => ItemReference[];
}

export interface HasHistogram {
  elementHistogram: Histogram.ElementHistogram;
}

// Escapes space, tab and backslash, but not newline, for use in code lines
// BACKSLASH TAB could get normalized to BACKSLASH SP, so uses BACKSLASH T instead
export function escapeWhiteSpace(s: string) {
  return s.replace(/[ \t\\]/g, (ch) => '\\' + (ch === '\t' ? 'T' : ch));
}

export function unescapeWhiteSpace(s: string) {
  return s.replace(/(?:\\(.))/g, (_match, ch) => (ch === 'T' ? '\t' : ch));
}

// split into <code_line>'s and escape space in line so it can be
// preserved through later pass through whitespace-normalizing parsing
// unescaped in toJSON
export function processCodeblock($: any) {
  $('codeblock').each((i: any, item: any) => {
    const h = $(item).html();
    if (h.startsWith('<![CDATA[') && h.endsWith(']]>')) {
      const html = h
        .substring(9, h.length - 3)
        .split('\n')
        .map(
          (r: any) =>
            '<code_line><![CDATA[' + escapeWhiteSpace(r) + ']]></code_line>'
        )
        .reduce((s: string, e: string) => s + e);

      $(item).html(html);
    } else {
      const html = h
        .split('\n')
        .map((r: any) => '<code_line>' + escapeWhiteSpace(r) + '</code_line>')
        .reduce((s: string, e: string) => s + e);

      $(item).html(html);
    }
  });
}
export function processVariables($: any) {
  $('variable').each((i: any, item: any) => {
    const h = $(item).html().trim();
    if (h.startsWith('<![CDATA[') && h.endsWith(']]>')) {
      const html = h
        .substring(9, h.length - 3)
        .split('\n')
        .map((r: any) => r + '\n')
        .reduce((s: string, e: string) => s + e);

      $(item).attr('expression', html);
    } else {
      const html = h
        .split('\n')
        .map((r: any) => r + '\n')
        .reduce((s: string, e: string) => s + e);

      $(item).attr('expression', html);
    }
  });
}

export function addWarning(
  resource: TorusResource,
  description: string,
  idref = null
) {
  resource.warnings.push({ idref, description });
}

export function failIfPresent($: any, items: string[]) {
  items.forEach((e: string) => {
    $(e).each((_i: any, _item: any) => {
      console.log(`unsupported element [${e}] detected, exiting`);
      process.exit(1);
    });
  });
}

export function failIfHasValue(
  $: any,
  selector: string,
  attr: string,
  value: string
) {
  $(selector).each((_i: any, item: any) => {
    if ($(item).attr(attr) === value) {
      console.log(
        `unsupported element attribute value [${selector} ${attr} ${value}] detected, exiting`
      );
      process.exit(1);
    }
  });
}

export function standardContentManipulations($: any) {
  failIfPresent($, ['ipa', 'bdo']);

  handleCommandButtons($);

  DOM.unwrapInlinedMedia($, 'video');
  DOM.unwrapInlinedMedia($, 'audio');
  DOM.unwrapInlinedMedia($, 'youtube');
  DOM.unwrapInlinedMedia($, 'iframe');

  DOM.rename($, 'definition term', 'definition-term');

  // Convert all inline markup elements to <em> tags, this
  // greatly simplifies downstream conversionto JSON
  $('var').each((i: any, item: any) => $(item).attr('style', 'code'));
  $('term').each((i: any, item: any) => $(item).attr('style', 'term'));
  $('sub').each((i: any, item: any) => $(item).attr('style', 'sub'));
  $('sup').each((i: any, item: any) => $(item).attr('style', 'sup'));
  DOM.rename($, 'var', 'em');
  DOM.rename($, 'term', 'em');
  DOM.rename($, 'sub', 'em');
  DOM.rename($, 'sup', 'em');

  // <code> is a mixed element, we only want to translate the inline <code>
  // instances to <em> elements.  The block level <code> will get converted
  // to Torus code model elements.
  ['p', 'li', 'td', 'choice', 'hint', 'feedback'].forEach((e) => {
    $(`${e} code`).each((i: any, item: any) => $(item).attr('style', 'code'));
    DOM.rename($, `${e} code`, 'em');
  });

  // Certain constructs have to be converted into an alternate
  // representation for how Torus supports them
  DOM.flattenNestedSections($);
  DOM.removeSelfClosing($);
  DOM.mergeCaptions($);
  // Default to block images
  DOM.rename($, 'image', 'img');
  DOM.rename($, 'link', 'a');
  // Images "nested" inside paragraphs and links become inline images.
  // Block images are wrapped inside figures in Torus, so even if an
  // image in a legacy course is intended as a block semantically, with
  // newlines before or after, converting to inline images feels like
  // a closer mapping to the correct rendering.
  DOM.rename($, 'p img', 'img_inline');
  DOM.rename($, 'a img', 'img_inline');

  $('img').each((i: any, item: any) => {
    if (DOM.isInlineElement($, item)) {
      item.tagName = 'img_inline';
    }
  });

  // Inline images should technically be valid in any Slate model element
  // that supports inline elements, but we're only explicitly handling
  // converting images in paragraphs and links (anchors).
  DOM.rename($, 'codeblock', 'code');
  DOM.renameAttribute($, 'code', 'syntax', 'language');

  // Certain elements are not currently (and some may never be) supported
  // in Torus, so we remove them.  In this respect, OLI course conversion
  // is lossy wrt specific element constructs.
  $('question_bank_ref').remove();
  $('wb\\:manual').remove();
  $('wb\\:path').remove();
  $('testandconfigure').remove();
  $('theme').remove();
  $('popout').remove();
  $('sym').remove();
  $('applet').remove();
  $('director').remove();
  $('flash').remove();
  $('mathematica').remove();
  $('panopto').remove();
  $('unity').remove();
  $('vimeo').remove();
  $('table cite').remove();
  $('image cite').remove();
  $('audio cite').remove();
  $('video cite').remove();
  $('iframe cite').remove();
  $('youtube cite').remove();

  handleAlternate($, 'img');
  handleAlternate($, 'img_inline');
  handleAlternate($, 'video');
  handleAlternate($, 'audio');
  handleAlternate($, 'iframe');
  handleAlternate($, 'youtube');

  // iframe and youtube are both designed to scale responsively within Torus, so
  // we need to strip out height and width attrs if they exist
  stripMediaSizing($, 'iframe');
  stripMediaSizing($, 'youtube');

  DOM.stripElement($, 'p ol');
  DOM.stripElement($, 'p ul');
  DOM.stripElement($, 'p li');
  DOM.stripElement($, 'p ol');
  DOM.stripElement($, 'p ul');
  DOM.stripElement($, 'p li');
  DOM.stripElement($, 'p ol');
  DOM.stripElement($, 'p ul');
  DOM.stripElement($, 'p li');
  DOM.stripElement($, 'p p');
  DOM.stripElement($, 'p p');

  DOM.stripElement($, 'li p');
  DOM.rename($, 'li img', 'img_inline');
  DOM.stripElement($, 'p quote');

  $('p table').remove();
  $('p title').remove();
  $('ol title').remove();
  $('ul title').remove();

  DOM.rename($, 'quote', 'blockquote');
  DOM.rename($, 'composite_activity title', 'p');

  DOM.renameAttribute(
    $,
    'composite_activity wb\\:inline',
    'purpose',
    'innerpurpose'
  );

  DOM.rename($, 'composite_activity', 'group');
  DOM.rename($, 'pullout title', 'p');
  DOM.rename($, 'pullout', 'group');

  $('example').each((i: any, item: any) => {
    $(item).attr('purpose', 'example');
    $(item).attr(
      'id',
      $(item).attr('id') === undefined ? guid() : $(item).attr('id')
    );
  });

  DOM.rename($, 'example', 'group');
  DOM.rename($, 'group title', 'p');

  $('group').each((i: any, item: any) => {
    $(item).attr('layout', 'vertical');
    $(item).attr(
      'id',
      $(item).attr('id') === undefined ? guid() : $(item).attr('id')
    );
  });

  DOM.renameAttribute($, 'pronunciation', 'type', 'contenttype');
  DOM.renameAttribute($, 'video source', 'type', 'contenttype');
  DOM.renameAttribute($, 'video source', 'src', 'url');

  DOM.rename($, 'extra', 'popup');

  handleFormulaMathML($);
  sideBySideMaterials($);
  handleInquiry($);
  handleDefinitions($);
  handleDialogs($);
  handleConjugations($);
  handleAlternatives($);

  DOM.rename($, 'li formula', 'formula_inline');
  DOM.rename($, 'li callback', 'callback_inline');
}

function handleCommandButtons($: any) {
  DOM.renameAttribute($, 'command', 'type', 'commandtype');
  DOM.rename($, 'command', 'command_button');

  $('command_button').each((i: any, elem: any) => {
    const title = $(elem).children('title').text();
    $(elem).children().remove('title');

    if (title) {
      $(elem).attr('title', title);
    }

    const style = $(elem).attr('style');

    if (style === null || style === undefined) {
      $(elem).attr('style', 'button');
    } else if (style === 'checkbox') {
      $(elem).attr('style', 'button');
    }
  });

  // Now wrap all command_button instances in a paragraph.  This can
  // lead to situations where we have paragraphs inside of paragaphs, or
  // paragraphs inside of list-items, but downstream code eliminates those
  // conditions.
  $('command_button').wrap('<p></p>');
}

function stripMediaSizing($: any, selector: string) {
  $(selector).each((i: any, item: any) => {
    $(item).removeAttr('height');
    $(item).removeAttr('width');
  });
}

function handleConjugations($: any) {
  // The rest of conjugation support is in xml.ts

  DOM.rename($, 'conjugate', 'tc');
  DOM.rename($, 'cr', 'tr');
  DOM.renameAttribute($, 'tc', 'src', 'audioSrc');
  DOM.renameAttribute($, 'tc', 'type', 'audioType');

  const items = $('conjugation');
  items.each((i: any, elem: any) => {
    const title = $(elem).children('title').text();
    $(elem).children().remove('title');

    if (title) {
      $(elem).attr('title', title);
    }
  });
}

function handleAlternatives($: cheerio.Root) {
  $('alternatives').each((i, alternatives) => {
    $(alternatives).attr('strategy', 'user_section_preference');

    // get default alternative value and remove default child element
    const defaultValue = $('default', alternatives).text();
    $(alternatives).children('default').remove();

    if (defaultValue) {
      // the default alternative in torus is just the first one in the list
      // so move the default item to first position
      $(`alternative[value="${defaultValue}"]`, alternatives).insertBefore(
        $(alternatives).children().first()
      );
    }
  });

  $('alternative').each((i, alternative) => {
    $(alternative).attr('id', $(alternative).attr('value') as string);
  });
}

function handleDialogs($: any) {
  DOM.stripElement($, 'line material');
  DOM.stripElement($, 'line translation');
  DOM.rename($, 'line', 'dialog_line');

  $('speaker img').each((i: any, elem: any) => {
    $(elem).parent().attr('image', $(elem).attr('src'));
    $(elem).remove();
  });

  $('speaker').each((i: any, elem: any) => {
    $(elem).attr('name', $(elem).text());
  });

  const items = $('dialog');
  items.each((i: any, elem: any) => {
    const title = $(elem).children('title').text();
    $(elem).children().remove('title');

    if (title) {
      $(elem).attr('title', title);
    }
  });
}

function handleAlternate($: any, item: string) {
  const items = $(item);
  items.each((i: any, elem: any) => {
    const alt = $(elem).children('alternate').text();
    $(elem).children().remove('alternate');

    if (alt) {
      $(elem).attr('alt', alt);
    }
  });
}

function handleDefinitions($: any) {
  $('definition title').remove();
  DOM.stripElement($, 'definition material');

  $('definition').each((i: any, elem: any) => {
    const term = $(elem).children('definition-term').text();
    $(elem).children().remove('definition-term');
    $(elem).attr('term', term);
  });
}

function handleInquiry($: any) {
  DOM.rename($, 'inquiry title', 'p');
  DOM.rename($, 'inquiry question', 'p');
  DOM.rename($, 'inquiry answer', 'p');
  DOM.stripElement($, 'inquiry');
}

function sideBySideMaterials($: any) {
  $('materials material').each((i: any, item: any) => {
    item.tagName = 'td';
  });
  $('materials').each((i: any, item: any) => {
    item.tagName = 'table';
    $(item).attr('border', 'hidden');
    const orientation = $(item).attr('orient');

    if (
      orientation === undefined ||
      orientation === null ||
      orientation === 'horizontal'
    ) {
      $(item).html(`<tr>${$(item).html().trim()}</tr>`);
    } else {
      const tr = $('<tr></tr>');
      $(item).children().wrap(tr);
    }
  });
}

export function ensureParentHasId($: any, item: any) {
  if ($(item).parent().attr('id') === undefined) {
    $(item).parent().attr('id', guid());
  }
  return $(item).parent().attr('id');
}
export function flagStandardContentWarnigns($: any, resource: TorusResource) {
  $('p table').each((_i: any, item: any) => {
    addWarning(resource, 'table within paragraph', ensureParentHasId($, item));
  });
  $('p ul').each((_i: any, item: any) => {
    addWarning(
      resource,
      'unordered list within paragraph',
      ensureParentHasId($, item)
    );
  });
  $('p ol').each((_i: any, item: any) => {
    addWarning(
      resource,
      'ordered list within paragraph',
      ensureParentHasId($, item)
    );
  });
  $('p dl').each((_i: any, item: any) => {
    addWarning(
      resource,
      'definition list within paragraph',
      ensureParentHasId($, item)
    );
  });
  $('p p').each((_i: any, item: any) => {
    addWarning(
      resource,
      'paragraph within paragraph',
      ensureParentHasId($, item)
    );
  });

  $('materials material').each((i: any, _item: any) => {
    if (i === 0) {
      // Flag only the first material, not all of them
      addWarning(resource, 'materials material');
    }
  });
}

export function handleFormulaMathML($: any) {
  $('formula').each((i: any, item: any) => {
    const subtype = determineFormulaType(item);
    if (subtype === 'mathml') {
      $(item).attr('src', getFirstMathML($, item));
      item.children = [];
      $(item).attr('subtype', subtype);
    } else if (subtype === 'latex') {
      $(item).attr('src', stripLatexDelimiters(item.children[0].data));
      const blockRendered = wasBlockRendered(item.children[0].data);
      $(item).attr('legacyBlockRendered', blockRendered);
      item.children = [];
      $(item).attr('subtype', subtype);
    } else {
      item.tagName = 'callout';
    }
  });

  // For formula inside of paragraphs, we know they are of the inline variety
  DOM.rename($, 'p formula', 'formula_inline');
  DOM.rename($, 'p callout', 'callout_inline');

  // All others, we must inspect their context to determine whether they are
  // inline or block
  $('formula').each((i: any, item: any) => {
    if (DOM.isInlineElement($, item)) {
      item.tagName = 'formula_inline';
    }
  });
  $('callout').each((i: any, item: any) => {
    if (DOM.isInlineElement($, item)) {
      item.tagName = 'callout_inline';
    } else {
      const containsInlineOnly = item.children.every(
        (c: any) =>
          c.type === 'text' || (c.type == 'tag' && DOM.isInlineTag(c.name))
      );

      // We must wrap these inlines only in a paragraph
      if (containsInlineOnly) {
        $(item).html(`<p>${$(item).html()}</p>`);
      }
    }
  });

  // At this point, all remaining <m:math> or <math> elements must be "standalone",
  // that is, they exist without <formula> as their direct parent.  They all also
  // can only be inline, thus we can safely parent them all with <formula_inline>
  const formula_inline = $(
    '<formula_inline_temp subtype="mathml"></formula_inline_temp>'
  );
  $('m\\:math').wrap(formula_inline);
  $('math').wrap(formula_inline);
  $('formula_inline_temp').each((i: any, item: any) => {
    item.tagName = 'formula_inline';
    $(item).attr('src', getFirstMathML($, item));
    item.children = [];
  });
}

function getFirstMathML($: any, item: any) {
  const text = $(item).html();

  let firstMath = text.indexOf('<math');
  if (firstMath === -1) {
    firstMath = text.indexOf('<m:math');
  }

  let firstMathEnd = text.indexOf('</m:math>');
  if (firstMathEnd !== -1) {
    firstMathEnd = firstMathEnd + 9;
  } else {
    firstMathEnd = text.indexOf('</math>') + 7;
  }

  return text.substring(firstMath, firstMathEnd);
}

export function determineFormulaType(item: any) {
  if (
    item.children.length === 1 &&
    item.children[0].type === 'text' &&
    isLatexString(item.children[0].data)
  ) {
    return 'latex';
  }

  if (
    item.children.some((c: any) => isMathTag(c)) &&
    item.children.every((c: any) => isTextOrMathTag(c))
  ) {
    return 'mathml';
  }
  return 'richtext';
}

function isTextOrMathTag(e: any) {
  return e.type === 'text' || isMathTag(e);
}

function isMathTag(e: any) {
  return e.type === 'tag' && (e.name === 'm:math' || e.name === 'math');
}

function stripLatexDelimiters(s: string): string {
  const trimmed = s.trim();
  return trimmed.substring(2, trimmed.length - 2);
}

function wasBlockRendered(s: string): boolean {
  const trimmed = s.trim();
  const delimiter = trimmed.substring(0, 2);
  return delimiter === '$$' || delimiter === '\\[';
}

function isLatexString(s: string): boolean {
  const trimmed = s.trim();
  if (trimmed.startsWith('$$') && trimmed.endsWith('$$')) {
    return true;
  }
  if (trimmed.startsWith('\\(') && trimmed.endsWith('\\)')) {
    return true;
  }
  if (trimmed.startsWith('\\[') && trimmed.endsWith('\\]')) {
    return true;
  }
  return false;
}

function getPurpose(purpose?: string) {
  if (
    purpose === 'checkpoint' ||
    purpose === 'didigetthis' ||
    purpose === 'learnbydoing' ||
    purpose === 'manystudentswonder' ||
    purpose === 'learnmore' ||
    purpose === 'labactivity' ||
    purpose === 'myresponse' ||
    purpose === 'quiz' ||
    purpose === 'simulation' ||
    purpose === 'walkthrough' ||
    purpose === 'example'
  ) {
    return purpose;
  }

  return 'none';
}

export function wrapContentInSurveyOrGroup(
  content: any[],
  m: any,
  legacyMyResponseFeedbackIds: Record<string, boolean>
) {
  const isSurvey = legacyMyResponseFeedbackIds[m.idref];
  return isSurvey
    ? wrapContentInSurvey(content)
    : wrapContentInGroup(content, m.purpose);
}

export function wrapContentInGroup(content: any[], purpose?: string) {
  return {
    type: 'group',
    id: guid(),
    layout: 'vertical',
    purpose: getPurpose(purpose),
    children: content,
  };
}

export function wrapContentInSurvey(content: any[]) {
  return {
    type: 'survey',
    id: guid(),
    children: content,
  };
}

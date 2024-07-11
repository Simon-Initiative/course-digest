import { ItemReference, guid } from 'src/utils/common';
import * as Histogram from 'src/utils/histogram';
import * as DOM from 'src/utils/dom';
import { TorusResource } from './resource';
import * as Common from './questions/common';

export interface HasReferences {
  found: () => ItemReference[];
}

export interface HasHistogram {
  elementHistogram: Histogram.ElementHistogram;
}

// Escapes space, tab and backslash, but not newline, for preservation in code lines
// BACKSLASH TAB could get normalized to BACKSLASH SP, so uses BACKSLASH T instead
// Strips trailing white space on assumption it is never needed
export function escapeCodeWhiteSpace(s: string) {
  return s
    .trimEnd()
    .replace(/[ \t\\]/g, (ch) => '\\' + (ch === '\t' ? 'T' : ch));
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
            '<code_line><![CDATA[' + escapeCodeWhiteSpace(r) + ']]></code_line>'
        )
        .reduce((s: string, e: string) => s + e);

      $(item).html(html);
    } else {
      const html = h
        .split('\n')
        .map(
          (r: any) => '<code_line>' + escapeCodeWhiteSpace(r) + '</code_line>'
        )
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

export function failIfPresent($: cheerio.Root, items: string[]) {
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

  DOM.rename($, 'definition>term', 'definition-term');

  // Torus figures require a title, so add one if missing. Do this
  // early to ensure gets any further title processing below
  $('figure:not(:has(title))').each((i: any, elem: any) => {
    $(elem).prepend('<title></title>');
  });

  // Change sub within sub to distinct doublesub mark. Will remove the
  // regular sub style from doublesub text when collecting styles in toJSON
  DOM.rename($, 'sub sub', 'doublesub');

  // Convert all inline markup elements to <em> tags, this
  // greatly simplifies downstream conversionto JSON
  $('var').each((i: any, item: any) => $(item).attr('style', 'code'));
  $('term').each((i: any, item: any) => $(item).attr('style', 'term'));
  $('sub').each((i: any, item: any) => $(item).attr('style', 'sub'));
  $('sup').each((i: any, item: any) => $(item).attr('style', 'sup'));
  $('doublesub').each((i: any, item: any) =>
    $(item).attr('style', 'doublesub')
  );
  $('deemphasis').each((i: any, item: any) =>
    $(item).attr('style', 'deemphasis')
  );
  $('highlight').each((i: any, item: any) =>
    $(item).attr('style', 'highlight')
  );
  DOM.rename($, 'var', 'em');
  DOM.rename($, 'term', 'em');
  DOM.rename($, 'sub', 'em');
  DOM.rename($, 'sup', 'em');
  DOM.rename($, 'doublesub', 'em');
  DOM.rename($, 'deemphasis', 'em');
  DOM.rename($, 'highlight', 'em');

  // <code> is a mixed element, we only want to translate the inline <code>
  // instances to <em> elements.  The block level <code> will get converted
  // to Torus code model elements.
  ['p', 'li', 'td', 'choice', 'hint', 'feedback'].forEach((e) => {
    $(`${e} code`).each((i: any, item: any) => $(item).attr('style', 'code'));
    DOM.rename($, `${e} code`, 'em');
  });
  // also convert code elements with explicit inline style
  $('code[style="inline"]').each((i: any, item: any) => {
    $(item).attr('style', 'code');
    item.tagName = 'em';
  });

  // One course wrapped mathML in code for style; won't work in torus block code box
  DOM.rename($, 'code:has(m\\:math)', 'p');

  // Certain constructs have to be converted into an alternate
  // representation for how Torus supports them
  DOM.flattenNestedSections($);
  DOM.removeSelfClosing($);
  DOM.titlesToContent($);

  // Default to block images
  DOM.rename($, 'image', 'img');
  DOM.rename($, 'link', 'a');

  // Images "nested" inside paragraphs and links become inline images.
  // Block images are wrapped inside figures in Torus, so even if an
  // image in a legacy course is intended as a block semantically, with
  // newlines before or after, converting to inline images feels like
  // a closer mapping to the correct rendering.
  // AW: this undesirable for images inside paragraphs
  // DOM.rename($, 'p img', 'img_inline');
  DOM.rename($, 'a img', 'img_inline');

  $('img').each((i: any, item: any) => {
    const style = $(item).attr('style');
    if (
      // don't inline if captioned no matter what style specified
      isUnCaptioned($, item) &&
      (style === 'inline' ||
        (DOM.isInlineElement($, item) && style !== 'block'))
    ) {
      item.tagName = 'img_inline';
    }
  });

  stripEmptyCaptions($, 'iframe');

  $('caption').each((i: any, item: any) => {
    const containsInlineOnly = item.children.every(
      (c: any) =>
        c.type === 'text' || (c.type == 'tag' && DOM.isInlineTag(c.name))
    );

    // We must wrap these inlines only in a paragraph
    if (containsInlineOnly) {
      $(item).html(`<p>${$(item).html()}</p>`);
    }
  });

  // torus video element has no caption, so add any caption content after
  DOM.appendCaptions($, 'video');

  // Inline images should technically be valid in any Slate model element
  // that supports inline elements, but we're only explicitly handling
  // converting images in paragraphs and links (anchors).

  DOM.rename($, 'codeblock', 'code');
  DOM.renameAttribute($, 'code', 'syntax', 'language');
  // Torus code language value must be exact "pretty" name shown in dropdown
  $('code').each((i: any, item: any) => {
    const lang = $(item).attr('language');
    if (lang)
      $(item).attr('language', lang === 'cpp' ? 'C++' : capitalize(lang));
  });

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
  stripNonDefaultMediaSizing($, 'iframe');
  stripMediaSizing($, 'youtube');

  // videos with size parameters have layout issue (not centered), so strip
  stripMediaSizing($, 'video');

  DOM.stripElement($, 'p>ol');
  DOM.stripElement($, 'p>ul');
  DOM.stripElement($, 'p>li');
  DOM.stripElement($, 'p>ol');
  DOM.stripElement($, 'p>ul');
  DOM.stripElement($, 'p>li');
  DOM.stripElement($, 'p>ol');
  DOM.stripElement($, 'p>ul');
  DOM.stripElement($, 'p>li');

  DOM.stripElement($, 'p>p');
  DOM.stripElement($, 'p>p');

  // Change to allow block elements within list items
  // DOM.stripElement($, 'li p');
  // DOM.rename($, 'li img', 'img_inline');

  DOM.stripElement($, 'p>quote');

  $('p>table').remove();
  $('p>title').remove();

  DOM.rename($, 'quote', 'blockquote');

  DOM.renameAttribute(
    $,
    'composite_activity wb\\:inline',
    'purpose',
    'innerpurpose'
  );

  DOM.rename($, 'composite_activity', 'group');

  // Strip alternatives within feedback/explanation, won't work.
  // Shows all possible content, OK if they are titled as in cases we have
  DOM.eliminateLevel($, 'feedback alternatives');
  DOM.eliminateLevel($, 'feedback alternative');
  DOM.eliminateLevel($, 'explanation alternatives');
  DOM.eliminateLevel($, 'explanation alternative');

  // Strip pullout level if it contains alternatives, won't work.
  DOM.eliminateLevel($, 'pullout:has(alternatives)');

  DOM.renameAttribute($, 'pullout', 'type', 'pullouttype');
  $('pullout[pullouttype]').each((i: number, item: any) => {
    const typeId = $(item).attr('pullouttype');
    const typeHeader = typeId === 'tosumup' ? 'To Sum Up' : capitalize(typeId);
    $(item).prepend(`<em>${typeHeader}...</em>`);
  });
  DOM.rename($, 'pullout', 'blockquote');

  $('example').each((i: any, item: any) => {
    $(item).attr('purpose', 'example');
    $(item).attr(
      'id',
      $(item).attr('id') === undefined ? guid() : $(item).attr('id')
    );
  });
  DOM.rename($, 'example', 'group');

  $('group').each((i: any, item: any) => {
    $(item).attr('layout', 'vertical');
    $(item).attr(
      'id',
      $(item).attr('id') === undefined ? guid() : $(item).attr('id')
    );
  });

  DOM.renameAttribute($, 'theorem', 'type', 'theoremtype');
  DOM.renameAttribute($, 'pronunciation', 'type', 'contenttype');
  DOM.renameAttribute($, 'video source', 'type', 'contenttype');
  DOM.renameAttribute($, 'video source', 'src', 'url');
  DOM.renameAttribute($, 'video', 'type', 'contenttype');
  DOM.renameAttribute($, 'audio', 'type', 'audioType');

  DOM.rename($, 'extra', 'popup');

  handleTheorems($);
  handleFormulaMathML($);
  sideBySideMaterials($);
  handleInquiry($);
  handleDefinitions($);
  handleDialogs($);
  handleConjugations($);
  handleAlternatives($);

  // preference-conditional inclusion not supported. Include to avoid error; let reviewers handle
  DOM.stripElement($, 'pref\\:if');

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

// We don't want empty caption tags ie <caption /> to be expanded to an empty caption with <p></p> in it for iframes (maybe others?)
// This will remove those before they get expanded
function stripEmptyCaptions($: any, selector: string) {
  $(selector).each((i: any, item: any) => {
    const caption = $(item).find('caption');
    if (caption !== undefined) {
      const noText = caption.text().trim() === '';
      const noChildren = caption.children().length === 0;
      if (noText && noChildren) {
        // This is an empty <caption /> node, trash it.
        caption.remove();
      }
    }
  });
}

function isUnCaptioned($: any, item: any) {
  const caption = $(item).find('caption');
  return (
    caption === undefined ||
    (caption.text().trim() === '' && caption.children().length === 0)
  );
}

// Strip any sizing that's not the default 800x450 that iframes use
// The thinking is that if the author has specified a size, they want
// that size, and we shouldn't override it.  However, if they haven't
// specified a size and left the default, we want to use the default torus
// size.
function stripNonDefaultMediaSizing(
  $: any,
  selector: string,
  width = 800,
  height = 450
) {
  $(selector).each((i: any, item: any) => {
    if (
      $(item).attr('width') === width.toString() &&
      $(item).attr('height') === height.toString()
    ) {
      $(item).removeAttr('height');
      $(item).removeAttr('width');
    }
  });
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
  // Title already handled
  // Insert "Question" and "Answer" headers
  $('inquiry question').before('<h5><em>Question</em></h5>');
  $('inquiry answer').before('<h5><em>Answer</em></h5>');
  DOM.rename($, 'inquiry question', 'p');
  DOM.rename($, 'inquiry answer', 'p');

  DOM.rename($, 'inquiry', 'group');
}

function sideBySideMaterials($: any) {
  $('materials > material').each((i: any, item: any) => {
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

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function handleTheorems($: any) {
  // if no title, legacy shows type name in bold as theorem header
  $('theorem:not(:has(title))').each((i: any, item: any) => {
    const typeHeader = capitalize($(item).attr('theoremtype'));
    $(item).prepend(`<h5><em>${typeHeader}</em></h5>`);
  });

  DOM.rename($, 'theorem title', 'h4');
  DOM.eliminateLevel($, 'theorem statement');

  $('theorem proof').each((i: any, item: any) => {
    $(item).prepend('<h5>Proof</h5>');
  });
  DOM.eliminateLevel($, 'theorem proof');

  // theorem in torus just a sequence of block items
  DOM.eliminateLevel($, 'theorem');
}

// Legacy formula element defines a content span expected to contain formula.
// In typical case where it contains a single MathML or LaTex formula,
// we convert it to a torus formula or formula-inline element. But if
// it contains mixed text (multiple formulas, or rich text possibly intermixed
// with one or more formulas), we convert to callout and let general content
// translation find and convert delimited LaTex or MathML pieces.
export function handleFormulaMathML($: any) {
  // Flag MathML formulas w/display=block as block rendered even if inline
  $('formula:has(m\\:math[display="block"])').each((i: any, item: any) => {
    $(item).attr('legacyBlockRendered', true);
  });
  $('formula:has(math[display="block"])').each((i: any, item: any) => {
    $(item).attr('legacyBlockRendered', true);
  });

  $('formula').each((i: any, item: any) => {
    const subtype = determineSingleFormulaType(item);

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
  DOM.rename($, 'p > formula', 'formula_inline');
  DOM.rename($, 'p > callout', 'callout_inline');

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

export function determineSingleFormulaType(item: any) {
  if (
    item.children.length === 1 &&
    item.children[0].type === 'text' &&
    isSingleLatexString(item.children[0].data)
  ) {
    return 'latex';
  }

  if (item.children.length === 1 && isMathTag(item.children[0])) {
    return 'mathml';
  }

  return 'richtext';
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

function isSingleLatexString(s: string): boolean {
  const trimmed = s.trim();
  return (
    // make sure no internal closing delimiter as for multiple formula
    (trimmed.startsWith('$$') &&
      trimmed.indexOf('$$', 2) === trimmed.length - 2) ||
    (trimmed.startsWith('\\(') &&
      trimmed.indexOf('\\)', 2) === trimmed.length - 2) ||
    (trimmed.startsWith('\\[') &&
      trimmed.indexOf('\\]', 2) === trimmed.length - 2)
  );
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

// Normalize all LIs below given rootObj that contain block items such as images to wrap
// text in paragraphs for Slate editor requirements. Operates on javascript content objects
// after JSONification from XML DOM elements to make use of existing wrapLooseText
export function fixListItemsWithBlocks(rootObj: any) {
  const listItems: any[] = Common.getDescendants(rootObj.children, 'li');
  listItems.forEach((li: any) => {
    // wrapLooseText only modifies if block elements alongside texts
    li.children = Common.wrapLooseText(li.children);
  });
}

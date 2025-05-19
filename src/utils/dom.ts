// cheerio based DOM manipulation helpers

import * as cheerio from 'cheerio';
import * as fs from 'fs';

function flattenSection($: cheerio.CheerioAPI, selector: string, tag: string) {
  const triple = $(selector);

  triple.each((i: any, elem: cheerio.TagElement) => {
    const text = $(elem).children('title').html();

    $(elem).children('title').replaceWith(`<${tag}>${text}</${tag}>`);
    $(elem).children('body').replaceWith($(elem).children('body').children());

    const purpose = $(elem).attr('purpose');
    if (purpose) {
      // replace the section element with a group placeholder
      elem.tagName = 'group';
    } else {
      $(elem).replaceWith($(elem).children());
    }
  });
}

// Eliminates a node, but elevating its children into the collection of the
// node's parent
//
// <a>
//   <b><c/><d/></b>
//   <b><c/></b>
// </a>
//
// eliminateLevel('b') would yield:
//
// <a>
//   <c/><d/><c/>
// </a>
//
export function eliminateLevel($: any, selector: string) {
  const triple = $(selector);

  triple.each((i: any, elem: any) => {
    $(elem).replaceWith($(elem).children());
  });
}

export function unwrapInlinedMedia($: any, type: string) {
  $(`p ${type}`).each((i: any, elem: any) => {
    const parent = $(elem).parent();
    $(parent[0]).children().remove(elem);
    $(elem).insertBefore($(parent[0]));
  });
}

export function flattenResourceRefs($: any) {
  const refs = $('item resourceref');

  const allItems: any = {};

  refs.each((i: any, elem: any) => {
    const id = $(elem).attr('idref').trim();
    if (allItems[id] === undefined) {
      allItems[id] = true;
      $(elem).parent().replaceWith(`<item idref="${id}"></item>`);
    } else {
      $(elem).parent().replaceWith(`<duplicate></duplicate>`);
    }
  });
  $('duplicate').remove();
}

const removeEmptyText = (elem: any) =>
  !(elem.type === 'text' && elem.data.trim() === '');

// Utility function that allows determining whether an instance of a mixed type element (e.g. formula) is
// needs to be considered inline or block.
export function isInlineElement($: any, elem: any) {
  const parent = $(elem).parent();

  if (
    isOneOf(parent[0].name, [
      // now treat images in li as block
      // 'li',
      'td',
      'th',
      'dd',
      'dt',
      'choice',
      'feedback',
      'hint',
      // AW: found inlining in these contexts leads to undesired left-alignment:
      // 'stem',
      'body',
    ])
  ) {
    if (parent[0].children.length === 1) {
      return false;
    }

    // true if has some sibling that is inline
    return parent[0].children
      .filter(removeEmptyText)
      .some(
        (c: any) =>
          c.type === 'text' || (c.type == 'tag' && isInlineTag(c.name))
      );
  }
  return false;
}

const inlineTags = {
  em: true,
  sub: true,
  sup: true,
  cite: true,
  a: true,
  link: true,
  activity_link: true,
  foreign: true,
  ipa: true,
  code: true,
  var: true,
  term: true,
  extra: true,
  text: true,
  xref: true,
  img_inline: true,
  input_ref: true,
  formula_inline: true,
};

export function isInlineTag(tag: string) {
  return (inlineTags as any)[tag] === true;
}

export const isOneOf = (item: string, items: string[]) => items.includes(item);

export function moveAttrToChildren(
  $: any,
  item: any,
  attr: string,
  childType: string
) {
  const value = $(item).attr(attr);
  if (value !== undefined && value !== null) {
    $(item)
      .children()
      .each((i: any, c: any) => {
        if (c.tagName == childType) {
          $(c).attr(attr, value);
        }
      });
  }
  $(item).removeAttr(attr);
}

export function rename($: any, source: string, dest: string) {
  $(source).each((i: any, item: any) => (item.tagName = dest));
}

export function renameAttribute(
  $: any,
  tag: string,
  source: string,
  dest: string
) {
  $(tag).each((i: any, item: any) => {
    const value = $(item).attr(source);

    if (value !== undefined && value !== null) {
      $(item).attr(dest, value);
      $(item).removeAttr(source);
    }
  });
}

// Removes all instances of an element, but leaves its text
// and child nodes in place:
//
// This:
// <p>This <u>test</u></p>
//
// If called to strip <u> would be translated to:
// <p>This test</p>
//
export function stripElement($: any, selector: string) {
  $(selector).each((i: any, elem: any) => {
    $(elem).replaceWith($(elem).html());
  });
}

export function mergeTitles($: any) {
  mergeElementText($, 'organization', 'title');
  mergeElementText($, 'sequence', 'title');
  mergeElementText($, 'unit', 'title');
  mergeElementText($, 'module', 'title');
  mergeElementText($, 'section', 'title');
}

export function titlesToContent($: any) {
  // These have title content inserted before element
  handleTitledContent($, 'table');
  handleTitledContent($, 'audio');
  handleTitledContent($, 'iframe');
  handleTitledContent($, 'youtube');
  handleTitledContent($, 'image');
  handleTitledContent($, 'video');
  // legacy allowed titles on lists
  handleTitledContent($, 'ol');
  handleTitledContent($, 'ul');

  // For these, title content remains inside the element
  replaceTitle($, 'example');
  replaceTitle($, 'alternative');
  replaceTitle($, 'composite_activity');
  replaceTitle($, 'pullout');
  replaceTitle($, 'inquiry', 'INQUIRY: ');
}

// move text of child element to same-named attribute
function mergeElementText($: any, selector: string, element: string) {
  const items = $(selector);

  items.each((i: any, elem: any) => {
    const text = $(elem).children(element).text();
    $(elem).attr(element, text);
    $(elem).children().remove(element);
  });
}

// insert title content as header before element
export function handleTitledContent($: any, selector: string) {
  const items = $(selector);

  items.each((i: any, elem: any) => {
    const title = $(elem).children('title').html();
    $(elem).children().remove('title');

    if (title && title !== 'Title') {
      $('<h6><em>' + title + '</em></h6>').insertBefore($(elem));
    }
  });
}

// replace title element with bold header to look like title
export function replaceTitle($: any, selector: string, prefix = '') {
  const items = $(`${selector}>title`);
  items.each((i: any, elem: any) => {
    const titleText = $(elem).text().trim();
    if (titleText.toLowerCase() === 'title') $(elem).remove();
    else $(elem).replaceWith(`<h6><em>${prefix}${titleText}</em></h6>`);
  });
}

export function appendCaptions($: any, selector: string) {
  const items = $(selector);

  items.each((i: any, elem: any) => {
    const captionHtml = $(elem).children('caption').html();
    $(elem).children().remove('caption');

    if (captionHtml) {
      $(captionHtml).insertAfter($(elem));
    }
  });
}

export function removeSelfClosing($: any) {
  $('caption').removeAttr('___selfClosing___');
  $('title').removeAttr('___selfClosing___');
  $('image').removeAttr('___selfClosing___');
  $('th').removeAttr('___selfClosing___');
  $('td').removeAttr('___selfClosing___');
}

export function remove($: any, element: string) {
  $(element).remove();
}

export function flattenNestedSections($: any) {
  flattenSection($, 'section section section section section section', 'h6');
  flattenSection($, 'section section section section section', 'h5');
  flattenSection($, 'section section section section', 'h4');
  flattenSection($, 'section section section', 'h3');
  flattenSection($, 'section section', 'h2');
  flattenSection($, 'section', 'h1');
}

export function read(file: string, options = {}) {
  const content = fs.readFileSync(file, 'utf-8');

  return cheerio.load(
    content,
    Object.assign(
      {},
      {
        normalizeWhitespace: true,
        xmlMode: true,
      },
      options
    )
  );
}

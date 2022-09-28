// cheerio based DOM manipulation helpers

import * as cheerio from 'cheerio';
import * as fs from 'fs';

function flattenSection($: any, selector: string, tag: string) {
  const triple = $(selector);

  triple.each((i: any, elem: any) => {
    const text = $(elem).children('title').html();

    $(elem).children('title').replaceWith(`<${tag}>${text}</${tag}>`);
    $(elem).children('body').replaceWith($(elem).children('body').children());
    $(elem).replaceWith($(elem).children());
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
    const id = $(elem).attr('idref');
    if (allItems[id] === undefined) {
      allItems[id] = true;
      $(elem).parent().replaceWith(`<item idref="${id}"></item>`);
    } else {
      $(elem).parent().replaceWith(`<duplicate></duplicate>`);
    }
  });
  $('duplicate').remove();
}

// Utility function that allows determining whether an instance of a mixed type element (e.g. formula) is
// needs to be considered inline or block.
export function isInlineElement($: any, elem: any) {
  const parent = $(elem).parent();

  if (
    isOneOf(parent[0].name, ['li', 'td', 'th', 'choice', 'feedback', 'hint'])
  ) {
    if (parent[0].children.length === 1) {
      return false;
    }

    return parent[0].children.some(
      (c: any) => c.type === 'text' || (c.type == 'tag' && isInlineTag(c.name))
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
};

export function isInlineTag(tag: string) {
  return (inlineTags as any)[tag] === true;
}

export function isOneOf(item: string, items: Array<string>) {
  return items.some((i: string) => i === item);
}

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
  mergeElement($, 'organization', 'title');
  mergeElement($, 'sequence', 'title');
  mergeElement($, 'unit', 'title');
  mergeElement($, 'module', 'title');
  mergeElement($, 'section', 'title');
}

export function mergeCaptions($: any) {
  handleLabelledContent($, 'table');
  handleLabelledContent($, 'audio');
  handleLabelledContent($, 'iframe');
  handleLabelledContent($, 'youtube');
  handleLabelledContent($, 'image');
  handleLabelledContent($, 'video');
}

function mergeElement($: any, selector: string, element: string) {
  const items = $(selector);

  items.each((i: any, elem: any) => {
    const text = $(elem).children(element).text();
    $(elem).attr(element, text);
    $(elem).children().remove(element);
  });
}

function handleLabelledContent($: any, selector: string) {
  const items = $(selector);

  items.each((i: any, elem: any) => {
    const title = $(elem).children('title').html();
    $(elem).children().remove('title');

    if (title) {
      $('<h5>' + title + '</h5>').insertBefore($(elem));
    }
  });
}

export function removeSelfClosing($: any) {
  $('caption').removeAttr('___selfClosing___');
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

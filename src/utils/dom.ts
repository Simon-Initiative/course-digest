// cheerio based DOM manipulation helpers

const cheerio = require('cheerio');
const fs = require('fs');

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


export function flattenResourceRefs($: any) {

  const refs = $('item resourceref');

  refs.each((i: any, elem: any) => {
    const id = $(elem).attr('idref');
    $(elem).parent().replaceWith(`<item idref="${id}"></item>`);
  });
}

export function rename($: any, source: string, dest: string) {
  $(source).each((i: any, item: any) => (item.tagName = dest));
}

export function renameAttribute($: any, tag: string, source: string, dest: string) {
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
  mergeElement($, 'table', 'caption');
  mergeElement($, 'audio', 'caption');
  mergeElement($, 'iframe', 'caption');
  mergeElement($, 'youtube', 'caption');
  mergeElement($, 'image', 'caption');
  mergeElement($, 'codeblock', 'caption');
}

function mergeElement($: any, selector: string, element: string) {
  const items = $(selector);

  items.each((i: any, elem: any) => {
    const text = $(elem).children(element).text();
    $(elem).attr(element, text);
    $(elem).children().remove(element);
  });
}

export function removeSelfClosing($: any) {
  $('caption').removeAttr('___selfClosing___');
  $('image').removeAttr('___selfClosing___');
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
  const content = fs.readFileSync(file, 'utf-8', 'r+');

  return cheerio.load(content, Object.assign({}, {
    normalizeWhitespace: true,
    xmlMode: true,
  }, options));
}

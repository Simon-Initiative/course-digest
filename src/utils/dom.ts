// cheerio based DOM manipulation helpers

const cheerio = require('cheerio');
const fs = require('fs');

function flattenSection($: any, selector: string, tag: string) {

  const triple = $(selector);

  triple.each((i: any, elem: any) => {
    const text = $(elem).children('title').html();
    const body = $(elem).children('body').html();

    $(elem).children('title').replaceWith(`<${tag}>${text}</${tag}>${body}`);
    $(elem).children('body').replaceWith($(elem).children('body').children());
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

export function mergeTitles($: any) {
  mergeTitle($, 'organization');
  mergeTitle($, 'sequence');
  mergeTitle($, 'unit');
  mergeTitle($, 'module');
  mergeTitle($, 'section');
}

function mergeTitle($: any, selector: string) {
  const items = $(selector);

  items.each((i: any, elem: any) => {
    const text = $(elem).children('title').text();
    $(elem).attr('title', text);
    $(elem).children().remove('title');
  });
}

export function removeSelfClosing($: any) {
  $('caption').removeAttr('___selfClosing___');
  $('image').removeAttr('___selfClosing___');
}

export function flattenNestedSections($: any) {

  flattenSection($, 'section section section section section section', 'h6');
  flattenSection($, 'section section section section section', 'h5');
  flattenSection($, 'section section section section', 'h4');
  flattenSection($, 'section section section', 'h3');
  flattenSection($, 'section section', 'h2');
  flattenSection($, 'section', 'h1');
}

export function read(file: string) {
  const content = fs.readFileSync(file, 'utf-8', 'r+');

  return cheerio.load(content, {
    normalizeWhitespace: true,
    xmlMode: true,
  });
}

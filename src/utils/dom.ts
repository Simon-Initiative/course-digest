// cheerio based DOM manipulation helpers

const cheerio = require('cheerio');
const fs = require('fs');

function flattenSection($: any, selector: string, tag: string) {

  const triple = $(selector);

  triple.each(function(i: any, elem: any) {
    const text = $(this).children('title').html();
    const body = $(this).children('body').html();

    $(this).children('title').replaceWith(`<${tag}>${text}</${tag}>${body}`);
    $(this).children('body').replaceWith($(this).children('body').children());
    $(this).replaceWith($(this).children());
  });
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

const cheerio = require('cheerio');
const fs = require('fs');
const content = fs.readFileSync('./test/test.xml', 'utf-8', 'r+');

const $ = cheerio.load(content, {
  normalizeWhitespace: true,
  xmlMode: true,
});



function flattenSection(selector, tag) {

  const triple = $(selector);

  triple.each(function(i, elem) {
  
    const text = $(this).children('title').html();
    const body = $(this).children('body').html();

    $(this).children('title').replaceWith(`<${tag}>${text}</${tag}>${body}`);
    $(this).children('body').replaceWith($(this).children('body').children());
    $(this).replaceWith($(this).children());

  //  $(this).parent().html(`<${tag}>${text}</${tag}>${body}`);
  
  });
}


flattenSection('section section section', 'h3');
flattenSection('section section', 'h2');
flattenSection('section', 'h1');

console.log($.root().html());
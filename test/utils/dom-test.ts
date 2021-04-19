import { renameAttribute, eliminateLevel, stripElement, flattenNestedSections } from '../../src/utils/dom';
const cheerio = require('cheerio');

describe('dom mutations', () => {

  test('should flatten sections', () => {

    const content = `
    <body>
      <section><title>The title</title><body><p>1</p></body></section>
    </body>
    `;

    const $ = cheerio.load(content, {
      normalizeWhitespace: true,
      xmlMode: true,
    });

    flattenNestedSections($);

    expect($.xml()).toEqual(` <body> <h1>The title</h1><p>1</p> </body> `);
  });

  test('should strip the element', () => {

    const content = '<p>1<b>2</b>3<b><c/></b></p>';

    const $ = cheerio.load(content, {
      normalizeWhitespace: true,
      xmlMode: true,
    });

    stripElement($, 'b');

    expect($.xml()).toEqual('<p>123<c/></p>');
  });

  test('should strip paragraphs from lists', () => {

    const content = '<ul><li><p>1</p><p>2</p></li><li><p>3</p></li></ul>';

    const $ = cheerio.load(content, {
      normalizeWhitespace: true,
      xmlMode: true,
    });

    stripElement($, 'li p');

    expect($.xml()).toEqual('<ul><li>12</li><li>3</li></ul>');
  });

  test('should rename the attribute', () => {

    const content = '<a><b test="v1"/><b test="v2"/><b/><c test="v3"/></a>';

    const $ = cheerio.load(content, {
      normalizeWhitespace: true,
      xmlMode: true,
    });

    renameAttribute($, 'b', 'test', 'apple');

    expect($.xml()).toEqual('<a><b apple="v1"/><b apple="v2"/><b/><c test="v3"/></a>');
  });

  test('should elevate the children', () => {

    const content = '<a><b><c/><d/></b><b><c/></b></a>';

    const $ = cheerio.load(content, {
      normalizeWhitespace: true,
      xmlMode: true,
    });

    eliminateLevel($, 'b');

    expect($.xml()).toEqual('<a><c/><d/><c/></a>');
  });

});

import { renameAttribute, eliminateLevel } from '../../src/utils/dom';
const cheerio = require('cheerio');

describe('dom mutations', () => {
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

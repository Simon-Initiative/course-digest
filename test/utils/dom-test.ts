import {
  renameAttribute,
  eliminateLevel,
  stripElement,
  moveAttrToChildren,
  mergeCaptions,
} from '../../src/utils/dom';
import * as cheerio from 'cheerio';

describe('dom mutations', () => {
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

    expect($.xml()).toEqual(
      '<a><b apple="v1"/><b apple="v2"/><b/><c test="v3"/></a>'
    );
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

  test('should move attribute down to children', () => {
    const content = '<a test="one" test2="two"><body/><input/><input/></a>';

    const $ = cheerio.load(content, {
      normalizeWhitespace: true,
      xmlMode: true,
    });
    $('a').each((i: any, item: any) => {
      moveAttrToChildren($, item, 'test', 'input');
    });

    expect($.xml()).toEqual(
      '<a test2="two"><body/><input test="one"/><input test="one"/></a>'
    );
  });

  test('should mergeCaptions with title', () => {
    const content =
      '<a><youtube id="d74862fd549747f6b7bf366768378591" src="9ixG0YbDSSw?showinfo=0;" height="500" width="1000" controls="true"><title><p>A Wonderful Title</p></title></youtube></a>';

    const $ = cheerio.load(content, {
      normalizeWhitespace: true,
      xmlMode: true,
    });

    mergeCaptions($);

    expect($.xml()).toContain('<h5><p>A Wonderful Title</p></h5>');
  });

  test('should mergeCaptions without title', () => {
    const content =
      '<a><youtube id="d74862fd549747f6b7bf366768378591" src="9ixG0YbDSSw?showinfo=0;" height="500" width="1000" controls="true"></youtube></a>';

    const $ = cheerio.load(content, {
      normalizeWhitespace: true,
      xmlMode: true,
    });

    mergeCaptions($);

    expect($.xml()).not.toContain('<h5>null</h5>');
  });
});

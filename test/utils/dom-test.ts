import {
  renameAttribute,
  eliminateLevel,
  stripElement,
  moveAttrToChildren,
  mergeCaptions,
  isInlineElement,
} from 'src/utils/dom';
import * as cheerio from 'cheerio';

describe('dom mutations', () => {
  test('blank text elements implicityly created by whitespace in a body tag should not affect isInlineElement test', () => {
    const content = `<body>
      <p></p>
      <formula>hi</formula>
      <p></p>
    </body>`;

    const $ = cheerio.load(content, {
      normalizeWhitespace: true,
      xmlMode: true,
    });

    const refs = $('formula');

    refs.each((i: any, elem: any) => {
      expect(isInlineElement($, elem)).toBeFalsy();
    });
  });
  test('should return that the formula is not inline', () => {
    const content = '<td><formula>test</formula></td>';

    const $ = cheerio.load(content, {
      normalizeWhitespace: true,
      xmlMode: true,
    });

    const refs = $('formula');

    refs.each((i: any, elem: any) => {
      expect(isInlineElement($, elem)).toBeFalsy();
    });
  });

  test('should return that the formula is inline', () => {
    const content = '<td>This is some <formula>test</formula></td>';

    const $ = cheerio.load(content, {
      normalizeWhitespace: true,
      xmlMode: true,
    });

    const refs = $('formula');

    refs.each((i: any, elem: any) => {
      expect(isInlineElement($, elem)).toBeTruthy();
    });
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
      '<a><youtube id="d74862fd549747f6b7bf366768378591" src="9ixG0YbDSSw?showinfo=0;" height="500" width="1000" controls="true"><title>A Wonderful Title</title></youtube></a>';

    const $ = cheerio.load(content, {
      normalizeWhitespace: true,
      xmlMode: true,
    });

    mergeCaptions($);

    expect($.xml()).toContain('<h6><em>A Wonderful Title</em></h6>');
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

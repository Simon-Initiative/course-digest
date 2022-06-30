import { handleFormulaMathML } from '../../src/resources/common';
import * as cheerio from 'cheerio';

function process(xml: string): any {
  const $ = cheerio.load(xml, {
    normalizeWhitespace: false,
    xmlMode: true,
  });
  handleFormulaMathML($);
  return $.xml();
}

describe('formulas and mathml', () => {
  test('should properly identify and convert inlines', () => {
    expect(
      process('<body><formula>test</formula><p>test</p></body>').indexOf(
        'callout'
      )
    ).toBeGreaterThan(-1);

    expect(
      process('<body><formula>test</formula></body>').indexOf('callout')
    ).toBeGreaterThan(-1);

    expect(
      process('<td><formula>test</formula><p>test</p></td>').indexOf('callout')
    ).toBeGreaterThan(-1);

    expect(
      process('<td>test <formula>test</formula></td>').indexOf('callout_inline')
    ).toBeGreaterThan(-1);
  });

  test('should properly identify and convert latex formulas', () => {
    let s = process('<body><formula>$$\\frac{2}{3}$$</formula></body>');
    expect(s.indexOf('subtype="latex"')).toBeGreaterThan(-1);
    expect(s.indexOf('src="\\frac{2}{3}"')).toBeGreaterThan(-1);

    s = process('<body><formula>\\[\\frac{2}{3}\\]</formula></body>');
    expect(s.indexOf('subtype="latex"')).toBeGreaterThan(-1);
    expect(s.indexOf('src="\\frac{2}{3}"')).toBeGreaterThan(-1);

    s = process('<body><formula>\\(\\frac{2}{3}\\)</formula></body>');
    expect(s.indexOf('subtype="latex"')).toBeGreaterThan(-1);
    expect(s.indexOf('src="\\frac{2}{3}"')).toBeGreaterThan(-1);
  });

  test('should properly identify and convert mathml formulas', () => {
    let s = process(
      '<body><formula><m:math><m:row/></m:math></formula></body>'
    );
    expect(s.indexOf('subtype="mathml"')).toBeGreaterThan(-1);
    expect(
      s.indexOf('src="&lt;m:math&gt;&lt;m:row/&gt;&lt;/m:math&gt;"')
    ).toBeGreaterThan(-1);

    // Ensure it handles math without namespace
    s = process('<body><formula><math><row/></math></formula></body>');
    expect(s.indexOf('subtype="mathml"')).toBeGreaterThan(-1);
    expect(
      s.indexOf('src="&lt;math&gt;&lt;row/&gt;&lt;/math&gt;"')
    ).toBeGreaterThan(-1);

    // Ensure it strips out extra mixed text
    s = process(
      '<body><formula>Good <math><row/></math> Luck</formula></body>'
    );
    expect(s.indexOf('subtype="mathml"')).toBeGreaterThan(-1);
    expect(
      s.indexOf('src="&lt;math&gt;&lt;row/&gt;&lt;/math&gt;"')
    ).toBeGreaterThan(-1);

    // Ensure it strips out any math beyond the first one
    s = process(
      '<body><formula>Good <math><row/></math><math><row/></math> Luck</formula></body>'
    );
    expect(s.indexOf('subtype="mathml"')).toBeGreaterThan(-1);
    expect(
      s.indexOf('src="&lt;math&gt;&lt;row/&gt;&lt;/math&gt;"')
    ).toBeGreaterThan(-1);
  });

  test('should properly identify and convert richtext formulas', () => {
    const s = process('<body><formula>plain text</formula></body>');
    expect(s.indexOf('<callout><p>plain text</p></callout>')).toBeGreaterThan(
      -1
    );
  });

  test('should reparent standalone math', () => {
    let s = process('<body><p><m:math><m:row/></m:math></p></body>');
    expect(s.indexOf('formula_inline')).toBeGreaterThan(-1);
    expect(s.indexOf('subtype="mathml"')).toBeGreaterThan(-1);
    expect(
      s.indexOf('src="&lt;m:math&gt;&lt;m:row/&gt;&lt;/m:math&gt;"')
    ).toBeGreaterThan(-1);

    s = process('<body><p><math><row/></math></p></body>');
    expect(s.indexOf('formula_inline')).toBeGreaterThan(-1);
    expect(s.indexOf('subtype="mathml"')).toBeGreaterThan(-1);
    expect(
      s.indexOf('src="&lt;math&gt;&lt;row/&gt;&lt;/math&gt;"')
    ).toBeGreaterThan(-1);
  });
});
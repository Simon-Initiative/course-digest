import {
  processCodeblock,
  standardContentManipulations,
} from '../../src/resources/common';
import * as cheerio from 'cheerio';
import { toJSON } from '../../src/utils/xml';

describe('cdata and codeblocks', () => {
  test('should strip the element', () => {
    const content =
      '<codeblock syntax="java"><![CDATA[' + 'a\nb]]></codeblock>';

    const $ = cheerio.load(content, {
      normalizeWhitespace: false,
      xmlMode: true,
    });

    processCodeblock($);

    expect($.xml()).toEqual(
      '<codeblock syntax="java">' +
        '<code_line><![CDATA[a]]></code_line><code_line><![CDATA[b]]></code_line>' +
        '</codeblock>'
    );
  });

  test('should convert root images to block imgs', async () => {
    const content = '<image src="../webcontent/proof_prem.gif"/>';

    const $ = cheerio.load(content, {
      normalizeWhitespace: true,
      xmlMode: true,
    });

    standardContentManipulations($);

    const result: any = await toJSON($.xml());
    const img = result.children[0];
    expect(img.type).toBe('img');
  });

  test('should convert nested images to inline imgs', async () => {
    const content1 = '<p><image src="../webcontent/proof_prem.gif"/></p>';
    const content2 = '<a><image src="../webcontent/proof_prem.gif"/></a>';

    const $1 = cheerio.load(content1, {
      normalizeWhitespace: true,
      xmlMode: true,
    });
    const $2 = cheerio.load(content2, {
      normalizeWhitespace: true,
      xmlMode: true,
    });

    standardContentManipulations($1);
    const p1: any = await toJSON($1.xml());
    const img1 = p1.children[0].children[0];
    expect(img1.type).toBe('img_inline');

    standardContentManipulations($2);
    const p2: any = await toJSON($1.xml());
    const img2 = p2.children[0].children[0];
    expect(img2.type).toBe('img_inline');
  });
});

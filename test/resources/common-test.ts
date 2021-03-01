import { processCodeblock } from '../../src/resources/common';

const cheerio = require('cheerio');

describe('cdata and codeblocks', () => {

  test('should strip the element', () => {

    const content = 
      '<codeblock syntax="java"><![CDATA[' + 
        'a\nb\nc]]></codeblock>';

    const $ = cheerio.load(content, {
      normalizeWhitespace: false,
      xmlMode: true,
    });

    processCodeblock($);

    expect($.xml()).toEqual('<codeblock syntax="java">' + 
      '<code_line>a</code_line><code_line>b</code_line><code_line>c</code_line>' + 
      '</codeblock>');

  });
});

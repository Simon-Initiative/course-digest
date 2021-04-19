import { processCodeblock, standardContentManipulations } from '../../src/resources/common';
const fs = require('fs');
const cheerio = require('cheerio');
import { convertImageCodingActivities } from '../../src/resources/image';

describe('cdata and codeblocks', () => {

  test('should strip the element', () => {

    const content = fs.readFileSync('./test/resources/file.xml', 'utf-8', 'r+');

    const $ = cheerio.load(content, {
      normalizeWhitespace: false,
      xmlMode: true,
    });

    processCodeblock($);


    standardContentManipulations($);


    

    const found = [];
    convertImageCodingActivities($, found);

    console.log(found.length);

  });
});

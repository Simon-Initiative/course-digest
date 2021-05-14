import { WorkbookPage } from '../src/resources/workbook';
import * as DOM from '../src/utils/dom';

const cheerio = require('cheerio');

const fs = require('fs');
const tmp = require('tmp');

describe('conversion to Torus resources', () => {
  test('should create a code block with code_lines', () => {

    const item = new WorkbookPage();
    const file = './test/codeblock.xml';
    let $ = DOM.read(file, { normalizeWhitespace: false });
    item.restructurePreservingWhitespace($);

    const tmpobj = tmp.fileSync();
    fs.writeFileSync(tmpobj.name, $.html()); 
    
    $ = DOM.read(tmpobj.name);  

    item.restructure($);
    
    const xml = $.html();
    return item.translate(xml, $)
    .then(results => {
      console.log(JSON.stringify((results[0] as any).content, undefined, 2));
      expect(results.length).toEqual(1);
    })
    
  });

});

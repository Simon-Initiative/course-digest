import { WorkbookPage } from '../src/resources/workbook';
import { Other } from '../src/resources/other';

const cheerio = require('cheerio');

describe('check resource DTD version', () => {
  test('should print unsupported version message', () => {
    new WorkbookPage(null, true)
      .convert('./test/content/x-oli-workbook_page/old_dtd.xml')
      .then((results) => {
        expect(results.length).toEqual(1);
        expect(results[0] instanceof Other);
      });
  });
});

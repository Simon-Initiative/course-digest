import { WorkbookPage } from '../src/resources/workbook';
import { Other } from '../src/resources/other';

describe('check resource DTD version', () => {
  test('should print unsupported version message', () => {
    new WorkbookPage('./test/content/x-oli-workbook_page/old_dtd.xml', true)
      .convert()
      .then((results) => {
        expect(results.length).toEqual(1);
        expect(results[0] instanceof Other);
      });
  });
});

import { WorkbookPage } from 'src/resources/workbook';
import { Other } from 'src/resources/other';
import { MediaSummary } from 'src/media';
import { ProjectSummary } from 'src/project';

const mediaSummary: MediaSummary = {
  mediaItems: {},
  missing: [],
  urlPrefix: '',
  downloadRemote: false,
  flattenedNames: {},
};

const projectSummary = new ProjectSummary('', '', '', mediaSummary);

describe('check resource DTD version', () => {
  test('should print unsupported version message', () => {
    new WorkbookPage('./test/content/x-oli-workbook_page/old_dtd.xml', true)
      .convert(projectSummary)
      .then((results) => {
        expect(results.length).toEqual(1);
        expect(results[0] instanceof Other);
      });
  });
});

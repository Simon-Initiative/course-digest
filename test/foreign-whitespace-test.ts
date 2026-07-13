import { MediaSummary } from 'src/media';
import { ProjectSummary } from 'src/project';
import { WorkbookPage } from 'src/resources/workbook';

const mediaSummary: MediaSummary = {
  mediaItems: {},
  missing: [],
  urlPrefix: '',
  downloadRemote: false,
  flattenedNames: {},
};

const projectSummary = new ProjectSummary('', '', '', mediaSummary);

describe('foreign text whitespace', () => {
  test('should preserve whitespace at foreign element boundaries', async () => {
    const results: any = await new WorkbookPage(
      './test/content/x-oli-workbook_page/foreign-whitespace.xml',
      true
    ).convert(projectSummary);

    const paragraph = results[0].content.model[0].children[0];
    const foreignText = paragraph.children.map(
      (foreign: any) => foreign.children[0].text
    );

    expect(foreignText).toEqual(['Il est grand. ', ' Il ', 'est ', ' grand.']);
  });
});

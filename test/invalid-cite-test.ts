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

describe('invalid citations', () => {
  test('should strip cite wrappers while preserving their content', async () => {
    const results: any = await new WorkbookPage(
      './test/content/x-oli-workbook_page/invalid-cite.xml',
      true
    ).convert(projectSummary);

    const paragraph = results[0].content.model[0].children[0];

    expect(paragraph.children).toEqual([
      { text: 'Before Map by ' },
      { text: 'Babsy', strong: true },
      { text: ' after.' },
    ]);
    expect(JSON.stringify(paragraph)).not.toContain('"type":"cite"');
  });
});

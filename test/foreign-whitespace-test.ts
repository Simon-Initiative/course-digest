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

    const [boundaryParagraph, blankForeignParagraph] =
      results[0].content.model[0].children;
    const foreignText = boundaryParagraph.children.map(
      (foreign: any) => foreign.children[0].text
    );

    expect(foreignText).toEqual(['Il est grand. ', ' Il ', 'est ', ' grand.']);
    expect(blankForeignParagraph.children).toEqual([
      {
        type: 'foreign',
        children: [{ text: 'ellui', strong: true }],
        'xml:lang': 'fr',
      },
      { text: ' as ' },
      {
        type: 'foreign',
        children: [{ text: 'iels', strong: true }],
        'xml:lang': 'fr',
      },
      { text: ' ' },
      {
        type: 'foreign',
        children: [{ text: 'elleux', strong: true }],
        'xml:lang': 'fr',
      },
    ]);
  });
});

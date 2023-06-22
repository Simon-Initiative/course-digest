import cheerio from 'cheerio';
import { removeDoubleGroupHeaders } from 'src/resources/workbook';
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

describe('removeDoubleGroupHeaders', () => {
  it('should remove inline-level purposes that match the group-level purpose', () => {
    const $ = cheerio.load(
      `
      <group purpose="purpose1">
        <body>
            <wb:inline purpose="purpose1"></wb:inline>
        </body>
      </group>
    `,
      {
        normalizeWhitespace: false,
        xmlMode: true,
      }
    );
    removeDoubleGroupHeaders($);
    const inline = $('wb\\:inline');
    expect(inline.attr('purpose')).toBeUndefined(); // Avoids MER-2182
  });

  it('should not remove inline-level purposes that do not match the group-level purpose', () => {
    const $ = cheerio.load(
      `
      <group purpose="purpose1">
        <body>
            <wb:inline purpose="purpose2"></wb:inline>
        </body>
      </group>
    `,
      {
        normalizeWhitespace: false,
        xmlMode: true,
      }
    );
    removeDoubleGroupHeaders($);
    const inline = $('wb\\:inline');
    expect(inline.attr('purpose')).toBe('purpose2');
  });

  it('should not remove group-level purposes', () => {
    const $ = cheerio.load(
      `
      <group purpose="purpose1">
        <body>
            <wb:inline></wb:inline>
        </body>
      </group>
    `,
      {
        normalizeWhitespace: false,
        xmlMode: true,
      }
    );
    removeDoubleGroupHeaders($);
    const group = $('group');
    expect(group.attr('purpose')).toBe('purpose1');
    const inline = $('wb\\:inline');
    expect(inline.attr('purpose')).toBeUndefined();
  });

  it('should remove inline-level purposes when processing a full workbook page', () => {
    return new WorkbookPage(
      './test/content/x-oli-workbook_page/double-section.xml',
      true
    )
      .convert(projectSummary)
      .then((r: any) => {
        const group = r[0].content.model[1];
        expect(group.type).toBe('group');
        expect(group.purpose).toBe('learnbydoing');
        const activityPlaceholder = group.children[1];
        expect(activityPlaceholder.type).toBe('activity_placeholder');
        expect(activityPlaceholder.purpose).toBeUndefined();
      });
  });
});

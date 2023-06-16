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

describe('rename links', () => {
  let results: any = {};

  beforeAll(async () => {
    return new WorkbookPage(
      './test/content/x-oli-workbook_page/links-test.xml',
      true
    )
      .convert(projectSummary)
      .then((r) => {
        results = r;
      });
  });

  test('should rename xref and activity_link to a', () => {
    const content = results[0].content.model[0].children;
    const [p1, p2, img] = content;
    const caption = img.caption;
    expect(p1.children[1].type).toEqual('a'); // activity_link gets renamed to a
    expect(p2.children[1].type).toEqual('a'); // xref gets renamed to a
    expect(p2.children[3].type).toEqual('a'); // xref gets renamed to a
    expect(caption[1].type).toEqual('a'); // xref gets renamed to a
  });

  test('should not have page attributes', () => {
    const content = results[0].content.model[0].children;
    const [p1, p2, img] = content;
    const caption = img.caption;
    expect(p1.children[1].page).toBeUndefined();
    expect(p2.children[1].page).toBeUndefined();
    expect(p2.children[3].page).toBeUndefined();
    expect(caption[1].page).toBeUndefined();
  });

  test('should store the ignored idref in anchor', () => {
    const content = results[0].content.model[0].children;
    const [, p2, img] = content;
    const caption = img.caption;
    expect(p2.children[1].anchor).toBe('link1id');
    expect(caption[1].anchor).toBe('link3id');
    expect(p2.children[3].anchor).toEqual('link2id');
  });

  test('should maintain idref in activity_links', () => {
    const content = results[0].content.model[0].children;
    const [p1] = content;
    expect(p1.children[1].idref).toEqual('Periodic_Table');
  });

  test('should move page to idref in xref', () => {
    const content = results[0].content.model[0].children;
    const [, p2, img] = content;
    const caption = img.caption;
    expect(p2.children[1].idref).toEqual('link1page'); // Make sure the page attribute got moved into idref
    expect(caption[1].idref).toEqual('link3page'); // Make sure the page attribute got moved into idref inside captions
  });

  test("should move current page to idref if there's no page attribute", () => {
    const content = results[0].content.model[0].children;
    const [, p2] = content;
    expect(p2.children[3].idref).toEqual('p1_changes_enthalpy'); // The current page should end up in idref if there is no page attribute
  });

  test('page should have all unresolved idrefs', () => {
    // Make sure it contains all the ids: 'link1page', 'link3page', 'Periodic_Table', 'link1page', 'p1_changes_enthalpy', 'link3page'
    expect(results[0].unresolvedReferences).toContain('link1page');
    expect(results[0].unresolvedReferences).toContain('link3page');
    expect(results[0].unresolvedReferences).toContain('Periodic_Table');
    expect(results[0].unresolvedReferences).toContain('link1page');
  });
});

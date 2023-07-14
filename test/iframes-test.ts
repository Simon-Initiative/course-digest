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

describe('iframes', () => {
  let results: any = {};

  beforeAll(async () => {
    return new WorkbookPage(
      './test/content/x-oli-workbook_page/iframes.xml',
      true
    )
      .convert(projectSummary)
      .then((r) => {
        results = r;
      });
  });

  test('should not import empty iframe captions', () => {
    const content = results[0].content.model[0].children;
    const [iframe1] = content;
    expect(iframe1.caption).toBeUndefined();
  });

  test('should import iframe caption as text', () => {
    const content = results[0].content.model[0].children;
    const [, iframe2] = content;

    expect(iframe2.caption).toEqual([
      {
        type: 'p',
        children: [{ text: 'Here is my caption' }],
      },
    ]);
  });

  test('should import iframe caption as rich text', () => {
    const content = results[0].content.model[0].children;
    const [, , iframe3] = content;

    expect(iframe3.caption).toEqual([
      {
        type: 'p',
        children: [
          { text: 'Here ' },
          {
            type: 'b',
            children: [{ text: 'is' }],
          },
          { text: ' my caption' },
        ],
      },
    ]);
  });

  test('should import iframe without dimensions', () => {
    const content = results[0].content.model[0].children;
    const [iframe1] = content;
    expect(iframe1.height).toBeUndefined();
    expect(iframe1.width).toBeUndefined();
  });

  test('should not import iframe default dimensions', () => {
    const content = results[0].content.model[0].children;
    const [, iframe2] = content;
    expect(iframe2.height).toBeUndefined();
    expect(iframe2.width).toBeUndefined();
  });

  test('should import iframe with pixel dimensions', () => {
    const content = results[0].content.model[0].children;
    const [, , iframe3] = content;
    expect(iframe3.height).toBe('600');
    expect(iframe3.width).toBe('1000');
  });

  test('should import iframe with only width dimension', () => {
    const content = results[0].content.model[0].children;
    const [, , , iframe4] = content;
    expect(iframe4.height).toBeUndefined();
    expect(iframe4.width).toBe('800');
  });

  test('should import iframe with percent width dimension', () => {
    const content = results[0].content.model[0].children;
    const [, , , , iframe5] = content;
    expect(iframe5.height).toBe('450');
    expect(iframe5.width).toBe('100%');
  });
});

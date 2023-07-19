import { MediaSummary } from 'src/media';
import { ProjectSummary } from 'src/project';
import { Formative } from 'src/resources/formative';
import { wrapInlinesWithParagraphs } from 'src/resources/questions/common';

const mediaSummary: MediaSummary = {
  mediaItems: {},
  missing: [],
  urlPrefix: '',
  downloadRemote: false,
  flattenedNames: {},
};

const projectSummary = new ProjectSummary('', '', '', mediaSummary);

describe('wrapInlinesWithParagraphs', () => {
  it('should return an empty array if the input is empty', () => {
    const input: any[] = [];
    const result = wrapInlinesWithParagraphs(input);
    expect(result).toEqual([]);
  });

  it('should wrap a single text node', () => {
    const input = [{ text: 'text' }];
    const result = wrapInlinesWithParagraphs(input);
    expect(result).toEqual([
      {
        type: 'p',
        children: [{ text: 'text' }],
      },
    ]);
  });

  it('should wrap multiple text nodes in single p', () => {
    const input = [{ text: 'text1' }, { text: 'text2' }];
    const result = wrapInlinesWithParagraphs(input);
    expect(result).toEqual([
      {
        type: 'p',
        children: [{ text: 'text1' }, { text: 'text2' }],
      },
    ]);
  });

  it('should wrap multiple text on either side of block', () => {
    const input = [
      { text: 'text1' },
      { text: 'text2' },
      { type: 'p' },
      { text: 'text3' },
      { text: 'text4' },
    ];
    const result = wrapInlinesWithParagraphs(input);
    expect(result).toEqual([
      {
        type: 'p',
        children: [{ text: 'text1' }, { text: 'text2' }],
      },
      { type: 'p' },
      {
        type: 'p',
        children: [{ text: 'text3' }, { text: 'text4' }],
      },
    ]);
  });

  it('should wrap other inlines', () => {
    const input = [
      { text: 'text1' },
      { type: 'img_inline', src: 'src' },
      { type: 'sup', children: [{ text: 'sup text' }] },
      { type: 'p' },
      { text: 'text3' },
      { text: 'text4' },
    ];
    const result = wrapInlinesWithParagraphs(input);
    expect(result).toEqual([
      {
        type: 'p',
        children: [
          { text: 'text1' },
          { type: 'img_inline', src: 'src' },
          { type: 'sup', children: [{ text: 'sup text' }] },
        ],
      },
      { type: 'p' },
      {
        type: 'p',
        children: [{ text: 'text3' }, { text: 'text4' }],
      },
    ]);
  });

  it('should wrap individual text nodes', () => {
    return new Formative(
      './test/content/x-oli-inline-assessment/feedback-formatting.xml',
      true
    )
      .convert(projectSummary)
      .then((r: any) => {
        console.info(
          r[0].content.authoring.parts[0].responses[0].feedback.content
        );
        expect(
          r[0].content.authoring.parts[0].responses[0].feedback.content.map(
            (f: any) => f.type
          )
        ).toEqual(['p', 'p', 'p']);
      });
  });
});

import { MediaSummary } from 'src/media';
import { ProjectSummary } from 'src/project';
import { Formative } from 'src/resources/formative';
import { removeRedundantInputRefs } from 'src/resources/questions/common';
const mediaSummary: MediaSummary = {
  mediaItems: {},
  missing: [],
  urlPrefix: '',
  downloadRemote: false,
  flattenedNames: {},
};

const projectSummary = new ProjectSummary('', '', '', mediaSummary);

describe('removeRedundantInputRefs', () => {
  it('should return the input unchanged if it is not an array', () => {
    const input: any = 'not an array';
    const result = removeRedundantInputRefs(input, 'redundantId');
    expect(result).toEqual('not an array');
  });

  it('should remove inputRefs with the specified input ID', () => {
    const input = [
      { type: 'input_ref', input: 'redundantId' },
      { type: 'input_ref', input: 'otherId' },
      { type: 'text', text: 'not an input_ref' },
    ];
    const result = removeRedundantInputRefs(input, 'redundantId');
    expect(result).toEqual([
      { type: 'input_ref', input: 'otherId' },
      { type: 'text', text: 'not an input_ref' },
    ]);
  });

  it('should recursively remove inputRefs with the specified input ID', () => {
    const input = [
      {
        type: 'parent',
        children: [
          { type: 'input_ref', input: 'redundantId' },
          { type: 'text', text: 'not an input_ref' },
        ],
      },
      { type: 'input_ref', input: 'otherId' },
    ];
    const result = removeRedundantInputRefs(input, 'redundantId');
    expect(result).toEqual([
      {
        type: 'parent',
        children: [{ type: 'text', text: 'not an input_ref' }],
      },
      { type: 'input_ref', input: 'otherId' },
    ]);
  });

  // NOTE! Do not auto-format this xml file. We want a version with no whitespace in it.
  it('importing multiple choice with redundant input ref', async () => {
    await new Formative(
      './test/content/x-oli-inline-assessment/multiple_choice_input_ref.xml',
      true
    )
      .convert(projectSummary)
      .then((results: any[]) => {
        const stem = results[0].content.stem;
        expect(stem.content.length).toEqual(2);
        expect(stem.content[0].type).toEqual('p');
        expect(stem.content[0].children.length).toEqual(1);
        expect(stem.content[1].type).toEqual('p');
        expect(stem.content[1].children.length).toEqual(1);
        expect(
          stem.content[1].children.find((c: any) => c.type === 'input_ref')
        ).toBeUndefined();
      });
  });
});

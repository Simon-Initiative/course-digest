import { MediaSummary } from 'src/media';
import { ProjectSummary } from 'src/project';
import { Formative } from 'src/resources/formative';
import { Pool } from 'src/resources/pool';
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

  it('importing numeric input with redundant input ref', async () => {
    /*
        Sometimes, we run into a multi-question that the item does not have an id, but there is an
        input ref that points at the choice value.  In this case, we can use the choice value as the
        input id. Example:

        <numeric id="q2_interp_zscore">
          <body>
              <p>A question goes here</p>
              <p>
                  <input_ref input="A" />
              </p>
          </body>          
          <input labels="false" shuffle="false">
              <choice value="A" />
          </input>
          ...         
        </numeric>
      */
    await new Pool(
      './test/content/x-oli-assessment2-pool/extra-input-ref.xml',
      true
    )
      .convert(projectSummary)
      .then((results: any[]) => {
        const stem = results[0].content.stem;

        expect(stem.content[0].type).toEqual('p');
        expect(stem.content[0].children.length).toEqual(1);
        expect(stem.content[1].type).toEqual('p');
        expect(stem.content[1].children.length).toEqual(1);

        expect(
          stem.content[2].children.find(
            (c: any) => c.type === 'input_ref' && c.input === 'A'
          )
        ).toBeDefined(); // Make sure it kept that input_ref

        expect(stem.content.length).toEqual(3); // Make sure it didn't append a new input_ref thinking it was missing.
      });
  });
});

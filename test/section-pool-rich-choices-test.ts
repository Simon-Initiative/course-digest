import { MediaSummary } from 'src/media';
import { ProjectSummary } from 'src/project';
import { Pool } from 'src/resources/pool';
import { Activity } from 'src/resources/resource';
import { getDescendants } from 'src/resources/questions/common';

const mediaSummary: MediaSummary = {
  mediaItems: {},
  missing: [],
  urlPrefix: '',
  downloadRemote: false,
  flattenedNames: {},
};

const projectSummary = new ProjectSummary('', '', '', mediaSummary);

describe('section-pool rich multiple-choice options', () => {
  test('renders table and image choices as a legend after labeled dropdowns', async () => {
    const converted = await new Pool(
      './test/content/x-oli-assessment2-pool/rich-choice-section-pool.xml',
      false
    ).convert(projectSummary);
    const activity = converted[0] as Activity;
    const model = activity.content as any;

    expect(model.authoring.parts.map((part: any) => part.id)).toEqual([
      'table_question',
      'plain_question',
      'image_question',
    ]);

    const tableInput = model.inputs.find(
      (input: any) => input.partId === 'table_question'
    );
    const imageInput = model.inputs.find(
      (input: any) => input.partId === 'image_question'
    );
    const plainInput = model.inputs.find(
      (input: any) => input.partId === 'plain_question'
    );
    expect(tableInput.shuffle).toBe('false');
    expect(imageInput.shuffle).toBe('false');
    expect(plainInput.shuffle).toBe('true');

    expect(
      tableInput.choiceIds.map(
        (id: string) =>
          model.choices.find((choice: any) => choice.id === id).content
      )
    ).toEqual([[{ text: 'A' }], [{ text: 'B' }]]);
    expect(
      imageInput.choiceIds.map(
        (id: string) =>
          model.choices.find((choice: any) => choice.id === id).content
      )
    ).toEqual([[{ text: 'A' }], [{ text: 'B' }]]);
    expect(
      plainInput.choiceIds.map(
        (id: string) =>
          model.choices.find((choice: any) => choice.id === id).content
      )
    ).toEqual([[{ text: 'Yes' }], [{ text: 'No' }]]);

    const legendAfter = (inputId: string) => {
      const inputIndex = model.stem.content.findIndex((node: any) =>
        getDescendants([node], 'input_ref').some((ref) => ref.id === inputId)
      );
      return model.stem.content[inputIndex + 1];
    };
    const tableLegend = legendAfter(tableInput.id);
    const imageLegend = legendAfter(imageInput.id);

    expect(tableLegend).toMatchObject({ type: 'ol', style: 'upper-latin' });
    expect(tableLegend.children).toHaveLength(2);
    expect(getDescendants(tableLegend.children, 'table')).toHaveLength(1);
    expect(tableLegend.children[1]).toEqual({
      type: 'li',
      children: [{ text: 'A plain alternative' }],
    });

    expect(imageLegend).toMatchObject({
      type: 'table',
      border: 'hidden',
      rowstyle: 'plain',
    });
    expect(imageLegend.children).toHaveLength(2);
    expect(imageLegend.children.map((row: any) => row.children[0])).toEqual([
      {
        type: 'td',
        align: 'right',
        children: [{ type: 'p', children: [{ text: 'A.' }] }],
      },
      {
        type: 'td',
        align: 'right',
        children: [{ type: 'p', children: [{ text: 'B.' }] }],
      },
    ]);
    expect(
      imageLegend.children.map((row: any) => row.children[1].align)
    ).toEqual(['left', 'left']);
    expect(
      getDescendants(imageLegend.children, 'img').map((image) => ({
        src: image.src,
        alt: image.alt,
        width: image.width,
      }))
    ).toEqual([
      {
        src: '../webcontent/first.png',
        alt: 'First diagram',
        width: '350',
      },
      {
        src: '../webcontent/second.png',
        alt: 'Second diagram',
        width: '350',
      },
    ]);

    // Torus authoring requires a terminal text block. Without this paragraph,
    // its normalizer splits a final image legend and restarts its A/B labels.
    expect(model.stem.content[model.stem.content.length - 1]).toEqual({
      type: 'p',
      children: [{ text: '' }],
    });

    expect(
      model.authoring.transformations.map(
        (transformation: any) => transformation.partId
      )
    ).toEqual(['plain_question']);
  });
});

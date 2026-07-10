import { MediaSummary } from 'src/media';
import { ProjectSummary } from 'src/project';
import { Formative } from 'src/resources/formative';
import { updateDerivativeReferences } from 'src/convert';
import { Page } from 'src/resources/resource';

const mediaSummary: MediaSummary = {
  mediaItems: {},
  missing: [],
  urlPrefix: '',
  downloadRemote: false,
  flattenedNames: {},
};

const projectSummary = new ProjectSummary('', '', '', mediaSummary);

describe('conversion to Torus resources', () => {
  test('should create a Torus Activity', async () => {
    await new Formative(
      './test/content/x-oli-inline-assessment/a_0cf7a2f6bb0d48cfb7202bf8794e18a4.xml',
      true
    )
      .convert(projectSummary)
      .then((results) => {
        expect(results.length).toEqual(1);
      });
  });

  test('should properly convert multi input numeric match values and scores', async () => {
    await new Formative(
      './test/content/x-oli-inline-assessment/num_sig_fig_digt.xml',
      true
    )
      .convert(projectSummary)
      .then((results) => {
        expect(results.length).toEqual(1);

        const pt3 = (results[0] as any).content.authoring.parts.find(
          ({ id }: any) => id === 'pt3'
        );

        const pt3CorrectResponse = pt3.responses.find(
          ({ legacyMatch }: any) => legacyMatch === '2.19e5'
        );

        expect(pt3CorrectResponse.rule).toEqual('input = {2.19e5}');
        expect(pt3CorrectResponse.score).toEqual(10);

        const pt5 = (results[0] as any).content.authoring.parts.find(
          ({ id }: any) => id === 'pt5'
        );

        const pt5CorrectResponse = pt5.responses.find(
          ({ legacyMatch }: any) => legacyMatch === '0.00311'
        );

        expect(pt5CorrectResponse.rule).toEqual('input = {0.00311}');
        expect(pt5CorrectResponse.score).toEqual(10);
      });
  });

  test('should trim assessment ids before deriving activities', async () => {
    const results = await new Formative(
      './test/content/x-oli-inline-assessment/trailing-assessment-id.xml',
      true
    ).convert(projectSummary);

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual(
      expect.objectContaining({
        id: 'assessment-with-whitespace-question-one',
        legacyId: 'assessment-with-whitespace',
        title: 'assessment-with-whitespace-question-one',
      })
    );

    const page = {
      type: 'Page',
      id: 'referencing-page',
      legacyPath: '',
      legacyId: 'referencing-page',
      title: 'Referencing page',
      tags: [],
      unresolvedReferences: ['assessment-with-whitespace'],
      warnings: [],
      content: {
        model: [
          {
            type: 'activity_placeholder',
            idref: 'assessment-with-whitespace',
          },
        ],
      },
      isGraded: false,
      isSurvey: false,
      collabSpace: {
        status: 'disabled',
        threaded: true,
        auto_accept: true,
        show_full_history: true,
        participation_min_posts: 0,
        participation_min_replies: 0,
      },
      objectives: [],
    } as Page;

    const [updatedPage] = updateDerivativeReferences([
      page,
      ...(results as any),
    ]);
    expect((updatedPage as Page).content.model).toEqual([
      expect.objectContaining({
        type: 'group',
        children: [
          expect.objectContaining({
            type: 'activity-reference',
            activity_id: 'assessment-with-whitespace-question-one',
          }),
        ],
      }),
    ]);
  });
});

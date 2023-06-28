import { MediaSummary } from 'src/media';
import { ProjectSummary } from 'src/project';
import { Formative } from 'src/resources/formative';

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
});

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
  test('should create a Torus Activity', () => {
    new Formative(
      './test/content/x-oli-inline-assessment/a_0cf7a2f6bb0d48cfb7202bf8794e18a4.xml',
      true
    )
      .convert(projectSummary)
      .then((results) => {
        expect(results.length).toEqual(1);
      });
  });
});

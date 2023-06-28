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

describe('custom DND should convert correctly', () => {
  test('should create 4 parts', () => {
    new Formative(
      './test/content/x-oli-inline-assessment/custom_dnd_4_parts.xml',
      true
    )
      .convert(projectSummary)
      .then((results: any) => {
        expect(results.length).toEqual(1);
        expect(results[0].content.authoring.parts.length).toEqual(4);
      });
  });
});

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

describe('missing part id', () => {
  it('should handle assessment with a missing part id in short answer', async () => {
    await new Formative(
      './test/content/x-oli-inline-assessment/no-part-id.xml',
      true
    )
      .convert(projectSummary)
      .then((results: any[]) => {
        const part = results[0].content.authoring.parts[0];
        expect(part.id).toBeDefined();
      });
  });
});

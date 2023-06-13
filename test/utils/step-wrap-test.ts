import { MediaSummary } from 'src/media';
import { ProjectSummary } from 'src/project';
import { Summative } from 'src/resources/summative';

const mediaSummary: MediaSummary = {
  mediaItems: {},
  missing: [],
  urlPrefix: '',
  downloadRemote: false,
  flattenedNames: {},
};

const projectSummary = new ProjectSummary('', '', '', mediaSummary);

describe('multi input stem handling', () => {
  test('should wrap raw text in stems', async () => {
    await new Summative(
      './test/content/x-oli-assessment2-pool/po7_orbital_dia_UA_pool.xml',
      true
    )
      .convert(projectSummary)
      .then((results) => {
        const activities = results.filter(
          (a: any) => a.id === 'po7_orbital_dia_UA_pool-po7_v1_orbital_dia'
        );
        for (const activity of activities) {
          const stem = (activity as any).content.stem;

          const textNodes = stem.content.filter((child: any) =>
            child.hasOwnProperty('text')
          );

          expect(textNodes.length).toBe(0);
        }
      });
  });
});

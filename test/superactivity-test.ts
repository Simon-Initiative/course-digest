import { updateDerivativeReferences } from 'src/convert';
import { MediaSummary } from 'src/media';
import { ProjectSummary } from 'src/project';
import { Activity, Page, TorusResource } from 'src/resources/resource';
import { Superactivity } from 'src/resources/superactivity';

const mediaSummary: MediaSummary = {
  mediaItems: {},
  missing: [],
  urlPrefix: '',
  downloadRemote: false,
  flattenedNames: {},
};

const projectSummary = new ProjectSummary('', '', '', mediaSummary);

describe('legacy linked activities', () => {
  test('creates a scored wrapper page while preserving activity provenance', async () => {
    const converted = await new Superactivity(
      './test/content/x-oli-linked-activity/improvement.xml',
      false
    ).convert(projectSummary);

    expect(converted).toHaveLength(2);

    const resources = converted.filter(
      (resource): resource is TorusResource => typeof resource !== 'string'
    );
    const wrapper = resources.find((resource) => resource.type === 'Page') as
      | Page
      | undefined;
    const activity = resources.find(
      (resource) => resource.type === 'Activity'
    ) as Activity | undefined;

    expect(wrapper).toEqual(
      expect.objectContaining({
        id: 'improvement',
        legacyId: 'improvement',
        title: 'Iterative Improvement',
        isGraded: true,
      })
    );
    expect(activity).toEqual(
      expect.objectContaining({
        legacyId: 'improvement',
        title: 'Iterative Improvement',
        subType: 'oli_embedded',
      })
    );

    const resolved = updateDerivativeReferences(resources);
    const resolvedWrapper = resolved.find(
      (resource) => resource.type === 'Page'
    ) as Page;

    expect(resolvedWrapper.content.model).toEqual([
      expect.objectContaining({
        type: 'group',
        children: [
          expect.objectContaining({
            type: 'activity-reference',
            activity_id: activity?.id,
          }),
        ],
      }),
    ]);
  });
});

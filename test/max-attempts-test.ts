import { convert } from 'src/convert';
import { MediaSummary } from 'src/media';
import { ProjectSummary } from 'src/project';
import {
  Page,
  parseLegacyMaxAttempts,
  parseLegacyRecommendedAttempts,
} from 'src/resources/resource';
import { Superactivity } from 'src/resources/superactivity';

const mediaSummary: MediaSummary = {
  mediaItems: {},
  missing: [],
  urlPrefix: '',
  downloadRemote: false,
  flattenedNames: {},
};

const projectSummary = new ProjectSummary(
  'test/course_packages/migration-4sdfykby_v_1_0-echo',
  '',
  '',
  mediaSummary
);

describe('assessment attempt settings', () => {
  test('passes through max_attempts from a legacy assessment', async () => {
    const resources = await convert(
      projectSummary,
      'test/course_packages/migration-4sdfykby_v_1_0-echo/content/x-oli-assessment2/newc72f87db5a5543b5ae8582d2d4cd34a7.xml',
      false
    );
    const page = resources.find(
      (resource) => typeof resource !== 'string' && resource.type === 'Page'
    ) as Page;

    expect(page.maxAttempts).toBe(3);
    expect(page.recommendedAttempts).toBe(3);
  });

  test('passes through max_attempts to a synthesized superactivity wrapper', async () => {
    const resources = await new Superactivity(
      './test/content/x-oli-linked-activity/improvement.xml',
      true
    ).convert(projectSummary);
    const page = resources.find(
      (resource) => typeof resource !== 'string' && resource.type === 'Page'
    ) as Page;

    expect(page.maxAttempts).toBe(10);
  });

  test.each(['unlimited', '-1'])(
    'normalizes legacy unlimited value %s to the Torus sentinel',
    (max_attempts) => {
      expect(parseLegacyMaxAttempts({ max_attempts })).toBe(0);
    }
  );

  test.each([undefined, '', 'many', '1.5', '-2'])(
    'omits absent or invalid legacy value %s',
    (max_attempts) => {
      expect(parseLegacyMaxAttempts({ max_attempts })).toBeUndefined();
    }
  );

  test.each([
    ['0', 0],
    ['1', 1],
    ['100', 100],
  ])('passes through recommended_attempts value %s', (value, expected) => {
    expect(
      parseLegacyRecommendedAttempts({ recommended_attempts: value })
    ).toBe(expected);
  });

  test.each([undefined, '', 'unlimited', '1.5', '-1'])(
    'omits absent or invalid recommended_attempts value %s',
    (recommended_attempts) => {
      expect(
        parseLegacyRecommendedAttempts({ recommended_attempts })
      ).toBeUndefined();
    }
  );
});

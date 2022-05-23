import * as path from 'path';
import { convertAction } from '../src/index';
import { Hierarchy } from '../src/resources/resource';

// migration-4sdfykby_v_1_0-echo is an echo course downloaded from svn.
// Though the .svn repo is not committed to VCS, the intent is that any updates
// make to the echo course can be easily pulled down here and echo will remain
// the authoring tool and source of truth for this example course content.
//
// echo: https://echo.oli.cmu.edu/#migration-4sdfykby-1.0?organization=migration-4sdfykby-1.0_default
// svn:  https://svn.oli.cmu.edu/svn/content/editor/projects/echo-oli-cmu-edu/migration-4sdfykby/branches/v_1_0-echo

it('should convert example course to valid course digest', async () => {
  const packageDirectory = path.join(
    __dirname,
    'course_packages',
    'migration-4sdfykby_v_1_0-echo'
  );

  const specificOrgId = 'migration-4sdfykby-1.0_default';
  const specificOrg = path.join(
    __dirname,
    'course_packages',
    'migration-4sdfykby_v_1_0-echo',
    'organizations',
    'default',
    'organization.xml'
  );

  const { hierarchy, finalResources } = await convertAction({
    operation: null,
    mediaManifest: null,
    outputDir: null,
    inputDir: packageDirectory,
    specificOrg,
    specificOrgId,
    mediaUrlPrefix: 'https://example-url-prefix',
  });

  expect(hierarchy as Hierarchy).toEqual(
    expect.objectContaining({
      type: 'Hierarchy',
      children: expect.arrayContaining([
        expect.objectContaining({
          type: 'description',
          children: expect.any(Array),
        }),
        expect.objectContaining({
          type: 'audience',
          children: expect.any(Array),
        }),
        expect.objectContaining({
          type: 'labels',
          children: expect.any(Array),
          sequence: 'Sequence',
          unit: 'Unit',
          module: 'Module',
          section: 'Section',
        }),
        expect.objectContaining({
          type: 'container',
          children: expect.any(Array),
          id: 'lesson1',
          title: 'Lesson 1',
        }),
      ]),
    })
  );

  expect(finalResources).toContainEqual(
    expect.objectContaining({
      type: 'Page',
      id: 'welcome',
      title: 'Welcome!',
      tags: [],
      unresolvedReferences: [
        'newca1a54a0f56a4d429f5aff2c515cab08',
        'newc72f87db5a5543b5ae8582d2d4cd34a7',
      ],
      content: expect.objectContaining({ model: expect.any(Array) }),
      isGraded: false,
      objectives: [
        'c47ac29051ed427984e2b6f76d09fa8e-dd83841bc84045138faf6f3b7868c6dc',
      ],
    })
  );

  expect(finalResources).toContainEqual(
    expect.objectContaining({
      type: 'Page',
      id: 'newe6ddd6fec8f54749a037ef13abd8df93',
      originalFile: '',
      title: 'Graded Assessment',
      tags: [],
      unresolvedReferences: [],
      content: expect.objectContaining({ model: expect.any(Array) }),
      isGraded: true,
      objectives: [undefined],
    })
  );

  expect(finalResources).toContainEqual(
    expect.objectContaining({
      type: 'Activity',
      id: 'newe6ddd6fec8f54749a037ef13abd8df93-newe6ddd6fec8f54749a037ef13abd8df93_1a',
      originalFile: '',
      title: '',
      tags: [],
      unresolvedReferences: [],
      content: {
        stem: expect.any(Object),
        choices: expect.any(Array),
        authoring: expect.any(Object),
      },
      objectives: { '1': [] },
      legacyId: 'newe6ddd6fec8f54749a037ef13abd8df93',
      subType: 'oli_multiple_choice',
    })
  );

  expect(finalResources).toContainEqual(
    expect.objectContaining({
      type: 'Activity',
      id: 'newe6ddd6fec8f54749a037ef13abd8df93-dd4cf0fba08646cba219f424f2c6058c',
      originalFile: '',
      title: '',
      tags: [],
      unresolvedReferences: [],
      content: {
        stem: expect.any(Object),
        choices: expect.any(Array),
        authoring: expect.any(Object),
      },
      objectives: { '1': [] },
      legacyId: 'newe6ddd6fec8f54749a037ef13abd8df93',
      subType: 'oli_multiple_choice',
    })
  );

  expect(finalResources).toContainEqual(
    expect.objectContaining({
      type: 'Activity',
      id: 'newe6ddd6fec8f54749a037ef13abd8df93-bab083e445df49b48d2af9a98e93a0c0',
      originalFile: '',
      title: '',
      tags: [],
      unresolvedReferences: [],
      content: {
        stem: expect.any(Object),
        choices: expect.any(Array),
        authoring: expect.any(Object),
      },
      objectives: { '1': [] },
      legacyId: 'newe6ddd6fec8f54749a037ef13abd8df93',
      subType: 'oli_multiple_choice',
    })
  );

  expect(finalResources).toContainEqual(
    expect.objectContaining({
      type: 'Objective',
      id: 'c47ac29051ed427984e2b6f76d09fa8e',
      parentId: 'dd83841bc84045138faf6f3b7868c6dc',
      originalFile: '',
      title: 'Default objective',
      tags: [],
      unresolvedReferences: [],
      content: {},
      objectives: [],
    })
  );

  expect(finalResources).toContainEqual(
    expect.objectContaining({
      type: 'Objective',
      id: 'cd6bb81e2b0f4705ac48346f36bfda52',
      originalFile: '',
      title: 'Default skill',
      tags: [],
      unresolvedReferences: [],
      children: [],
      content: {},
      objectives: [],
    })
  );

  expect(finalResources).toContainEqual(
    expect.objectContaining({
      type: 'Objective',
      id: 'cd6bb81e2b0f4705ac48346f36bfda52',
      originalFile: '',
      title: 'Default skill',
      tags: [],
      unresolvedReferences: [],
      children: [],
      content: {},
      objectives: [],
    })
  );

  expect(finalResources).toContainEqual(
    expect.objectContaining({
      type: 'Activity',
      id: 'newca1a54a0f56a4d429f5aff2c515cab08-newca1a54a0f56a4d429f5aff2c515cab08_1a',
      originalFile: '',
      title: '',
      tags: [],
      unresolvedReferences: [],
      content: {
        stem: expect.any(Object),
        choices: expect.any(Array),
        authoring: expect.any(Object),
      },
      objectives: { '1': [] },
      legacyId: 'newca1a54a0f56a4d429f5aff2c515cab08',
      subType: 'oli_multiple_choice',
    })
  );

  expect(finalResources).toContainEqual(
    expect.objectContaining({
      type: 'Activity',
      id: 'newca1a54a0f56a4d429f5aff2c515cab08-aa22bef84d16434088919ecf4eedb11e',
      originalFile: '',
      title: '',
      tags: [],
      unresolvedReferences: [],
      content: {
        stem: expect.any(Object),
        choices: expect.any(Array),
        authoring: expect.any(Object),
      },
      objectives: { '1': [] },
      legacyId: 'newca1a54a0f56a4d429f5aff2c515cab08',
      subType: 'oli_ordering',
    })
  );
});

it('should convert content with purpose to groups', async () => {
  const packageDirectory = path.join(
    __dirname,
    'course_packages',
    'migration-4sdfykby_v_1_0-echo'
  );

  const specificOrgId = 'migration-4sdfykby-1.0_default';
  const specificOrg = path.join(
    __dirname,
    'course_packages',
    'migration-4sdfykby_v_1_0-echo',
    'organizations',
    'default',
    'organization.xml'
  );

  const { finalResources } = await convertAction({
    operation: null,
    mediaManifest: null,
    outputDir: null,
    inputDir: packageDirectory,
    specificOrg,
    specificOrgId,
    mediaUrlPrefix: 'https://torus-media-dev.s3.amazonaws.com/media',
  });

  expect(finalResources).toContainEqual(
    expect.objectContaining({
      id: 'welcome',
      content: expect.objectContaining({
        model: expect.arrayContaining([
          expect.objectContaining({
            type: 'group',
            id: expect.any(String),
            layout: 'vertical',
            purpose: 'example',
            children: expect.arrayContaining([
              expect.objectContaining({
                type: 'content',
                id: expect.any(String),
                children: expect.arrayContaining([
                  expect.objectContaining({
                    type: 'h2',
                    children: expect.arrayContaining([
                      expect.objectContaining({ text: 'Example Title' }),
                    ]),
                  }),
                  expect.objectContaining({
                    type: 'p',
                    children: expect.arrayContaining([
                      expect.objectContaining({ text: 'This is an example' }),
                    ]),
                  }),
                ]),
              }),
            ]),
          }),
        ]),
      }),
    })
  );

  expect(finalResources).toContainEqual(
    expect.objectContaining({
      id: 'newe6ddd6fec8f54749a037ef13abd8df93',
      content: expect.objectContaining({
        model: expect.arrayContaining([
          expect.objectContaining({
            type: 'content',
            id: expect.any(String),
            children: expect.arrayContaining([
              expect.objectContaining({
                type: 'p',
                children: expect.arrayContaining([
                  expect.objectContaining({
                    text: 'THIS IS EXAMPLE SUPPORTING CONTENT. PLEASE EDIT OR DELETE IT.',
                    strong: true,
                  }),
                ]),
              }),
              expect.objectContaining({
                type: 'p',
                children: expect.arrayContaining([
                  expect.objectContaining({
                    text: 'Review the Policy Statement, Privileges and Responsibilities and Misuse and Inappropriate Behavior sections of the Computing Policy, then answer the following questions.',
                  }),
                ]),
              }),
            ]),
          }),
          expect.objectContaining({
            type: 'activity-reference',
            activity_id:
              'newe6ddd6fec8f54749a037ef13abd8df93-newe6ddd6fec8f54749a037ef13abd8df93_1a',
          }),
          expect.objectContaining({
            type: 'break',
            id: expect.any(String),
          }),
          expect.objectContaining({
            type: 'content',
            id: expect.any(String),
            children: expect.arrayContaining([
              expect.objectContaining({
                type: 'p',
                children: expect.arrayContaining([
                  expect.objectContaining({
                    text: 'Page 2 content',
                  }),
                ]),
              }),
            ]),
          }),
          expect.objectContaining({
            type: 'activity-reference',
            activity_id:
              'newe6ddd6fec8f54749a037ef13abd8df93-dd4cf0fba08646cba219f424f2c6058c',
          }),
          expect.objectContaining({
            type: 'break',
            id: expect.any(String),
          }),
          expect.objectContaining({
            type: 'activity-reference',
            activity_id:
              'newe6ddd6fec8f54749a037ef13abd8df93-bab083e445df49b48d2af9a98e93a0c0',
          }),
        ]),
      }),
    })
  );
});

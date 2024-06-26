import * as path from 'path';
import { convertAction } from 'src/index';
import { Hierarchy } from 'src/resources/resource';

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

  // const specificOrgId = 'migration-4sdfykby-1.0_default';
  const specificOrg = 'default';

  const { projectSummary, hierarchy } = await convertAction({
    operation: 'convert',
    mediaManifest: '',
    outputDir: '',
    svnRoot: '',
    inputDir: packageDirectory,
    specificOrg,
    downloadRemote: false,
    mediaUrlPrefix: 'https://example-url-prefix',
    quiet: false,
    mergePathA: '',
    mergePathB: '',
    discussionsOn: false,
    webContentBundle: '',
  });

  expect(projectSummary.getAlternativesGroupsJSON()).toEqual({
    'statistics.package': [
      'Excel2019PC',
      'StatCrunch',
      'r',
      'minitab',
      'excel',
      'ti',
      'Excel2019Mac',
    ],
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
          title: ' Lesson 1 ',
        }),
      ]),
    })
  );
});

it('should convert content with purpose to groups', async () => {
  const packageDirectory = path.join(
    __dirname,
    'course_packages',
    'migration-4sdfykby_v_1_0-echo'
  );

  // const specificOrgId = 'migration-4sdfykby-1.0_default';
  const specificOrg = 'default';
  const { finalResources, mediaItems } = await convertAction({
    operation: 'convert',
    mediaManifest: '',
    outputDir: '',
    svnRoot: '',
    inputDir: packageDirectory,
    specificOrg,
    downloadRemote: false,
    mediaUrlPrefix: 'https://torus-media-dev.s3.amazonaws.com/media',
    quiet: false,
    mergePathA: '',
    mergePathB: '',
    discussionsOn: false,
    webContentBundle: '',
  });

  mediaItems.forEach((mediaItem) => {
    const { url } = mediaItem;
    if (url.startsWith('https://torus-media-dev.s3.amazonaws.com/media/')) {
      // Make sure we're doing a subdir/dir format with the md5 hash on all urls
      expect(url.substring(47, 49)).toEqual(url.substring(50, 52));
    }
  });

  const images = finalResources.find((r) => r.id === 'images') as any;
  expect(images).toBeDefined();
  expect(images?.content?.model[0].children[1].src).toEqual(
    'https://torus-media-dev.s3.amazonaws.com/media/48/487591d48552a1fea781e7437a88fd60/polar%20%26%20bear.jpg'
  );

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
                    type: 'h6',
                    children: expect.arrayContaining([
                      expect.objectContaining({ text: 'Example Title' }),
                    ]),
                  }),
                  expect.objectContaining({
                    type: 'p',
                    children: expect.arrayContaining([
                      expect.objectContaining({ text: 'This is an ' }),
                      expect.objectContaining({
                        type: 'cite',
                        children: [{ text: '[citation]' }],
                        id: 'Kluver_1939',
                        bibref: expect.any(String),
                      }),
                      expect.objectContaining({ text: ' example' }),
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
                    text: ' THIS IS EXAMPLE SUPPORTING CONTENT. PLEASE EDIT OR DELETE IT. ',
                    strong: true,
                  }),
                ]),
              }),
              expect.objectContaining({
                type: 'p',
                children: expect.arrayContaining([
                  expect.objectContaining({
                    text: ' Review the Policy Statement, Privileges and Responsibilities and Misuse and Inappropriate Behavior sections of the Computing Policy, then answer the following questions. ',
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
                    text: ' Page 2 content ',
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

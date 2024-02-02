import * as Media from 'src/media';
import { convert } from 'src/convert';
import { ProjectSummary } from 'src/project';

describe('convert workbook', () => {
  it('should translate to valid json', async () => {
    const file =
      'test/course_packages/migration-4sdfykby_v_1_0-echo/content/x-oli-workbook_page/welcome.xml';
    const mediaSummary: Media.MediaSummary = {
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

    const converted = await convert(projectSummary, file, false);

    expect(converted).toStrictEqual([
      {
        type: 'Page',
        id: 'welcome',
        legacyPath: expect.any(String),
        legacyId: expect.any(String),
        title: 'Welcome!',
        tags: [],
        warnings: [],
        unresolvedReferences: [
          'newca1a54a0f56a4d429f5aff2c515cab08',
          'newc72f87db5a5543b5ae8582d2d4cd34a7',
        ],
        collabSpace: expect.any(Object),
        content: {
          model: [
            {
              type: 'content',
              id: expect.any(String),
              selection: expect.any(Object),
              children: [
                {
                  type: 'p',
                  children: [
                    { text: '(This space intentionally left blank.)' },
                  ],
                  id: 'c970f9059f4f4ac3a0b5f417f1f82acf',
                },
              ],
            },
            {
              type: 'group',
              id: expect.any(String),
              layout: 'vertical',
              purpose: 'example',
              children: [
                {
                  type: 'content',
                  id: expect.any(String),
                  selection: {
                    anchor: { offset: 0, path: [0, 0] },
                    focus: { offset: 0, path: [1, 0] },
                  },
                  children: [
                    {
                      children: [{ text: 'Example Title' }],
                      type: 'p',
                    },
                    {
                      type: 'p',
                      children: [
                        { text: 'This is an ' },
                        {
                          type: 'cite',
                          children: [{ text: '[citation]' }],
                          id: 'Kluver_1939',
                          bibref: expect.any(String),
                        },
                        { text: ' example' },
                      ],
                      id: 'e1f96ce25cc14278ae759e14b08c44ff',
                    },
                  ],
                },
              ],
            },
            {
              type: 'activity_placeholder',
              children: [],
              idref: 'newca1a54a0f56a4d429f5aff2c515cab08',
              purpose: 'learnbydoing',
            },
            {
              type: 'content',
              id: expect.any(String),
              selection: {
                anchor: { offset: 0, path: [0, 0] },
                focus: { offset: 0, path: [1, 0] },
              },
              children: [
                {
                  type: 'page_link',
                  idref: 'newc72f87db5a5543b5ae8582d2d4cd34a7',
                  children: [{ text: ' ' }],
                  purpose: 'quiz',
                },
              ],
            },
            {
              type: 'group',
              id: expect.any(String),
              layout: 'vertical',
              purpose: 'none',
              children: [
                {
                  type: 'content',
                  children: [
                    {
                      type: 'p',
                      children: [
                        {
                          text: 'References',
                          strong: true,
                        },
                      ],
                    },
                    {
                      type: 'p',
                      children: [
                        {
                          text: expect.any(String),
                        },
                      ],
                    },
                    {
                      type: 'p',
                      children: [
                        {
                          text: '"The amygdala and the emotions." In Anatomy of the Mind (chap. 9) ',
                        },
                        {
                          type: 'cite',
                          children: [
                            {
                              text: '[citation]',
                            },
                          ],
                          id: expect.any(String),
                          bibref: expect.any(String),
                        },
                      ],
                    },
                    {
                      type: 'p',
                      children: [
                        {
                          text: 'Long-term potentiation in the amygdala: A cellular mechanism of fear learning and memory ',
                        },
                        {
                          type: 'cite',
                          children: [
                            {
                              text: '[citation]',
                            },
                          ],
                          id: expect.any(String),
                          bibref: expect.any(String),
                        },
                      ],
                    },
                  ],
                },
              ],
              audience: 'instructor',
            },
          ],
          bibrefs: [expect.any(String), expect.any(String), expect.any(String)],
        },
        isGraded: false,
        isSurvey: false,
        objectives: ['c47ac29051ed427984e2b6f76d09fa8e'],
      },
      {
        type: 'Bibentry',
        id: expect.any(String),
        legacyPath: expect.any(String),
        legacyId: expect.any(String),
        title:
          '"The amygdala and the emotions." In Anatomy of the Mind (chap. 9)',
        tags: [],
        unresolvedReferences: [],
        children: [],
        content: expect.any(Object),
        objectives: [],
        warnings: [],
      },
      {
        type: 'Bibentry',
        id: expect.any(String),
        legacyPath: expect.any(String),
        legacyId: expect.any(String),
        title:
          'Preliminary analysis of functions of the temporal lobes in monkeys',
        tags: [],
        unresolvedReferences: [],
        children: [],
        content: expect.any(Object),
        objectives: [],
        warnings: [],
      },
      {
        type: 'Bibentry',
        id: expect.any(String),
        legacyPath: expect.any(String),
        legacyId: expect.any(String),
        title:
          'Long-term potentiation in the amygdala: A cellular mechanism of fear learning and memory',
        tags: [],
        unresolvedReferences: [],
        children: [],
        content: expect.any(Object),
        objectives: [],
        warnings: [],
      },
    ]);
  });

  it('should translate a section with purpose to a group with purpose', async () => {
    const file =
      'test/course_packages/migration-4sdfykby_v_1_0-echo/content/x-oli-workbook_page/sections.xml';
    const mediaSummary: Media.MediaSummary = {
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

    const converted = await convert(projectSummary, file, false);

    expect(converted).toContainEqual(
      expect.objectContaining({
        type: 'Page',
        id: 'sections',
        content: expect.objectContaining({
          model: expect.arrayContaining([
            expect.objectContaining({
              type: 'content',
              id: expect.any(String),
              children: [
                {
                  type: 'p',
                  children: [
                    { text: ' ' },
                    {
                      text: 'The following series of activities incorporates the concepts from this module into a real-world scenario.',
                      em: true,
                    },
                    { text: ' ' },
                  ],
                },
              ],
            }),
            expect.objectContaining({
              type: 'group',
              children: [
                expect.objectContaining({
                  type: 'content',
                  id: expect.any(String),
                  children: [
                    {
                      type: 'h1',
                      children: [{ text: 'Question 1' }],
                    },
                  ],
                }),
                {
                  type: 'activity_placeholder',
                  children: [],
                  idref: 'weak_titration_lbd',
                },
              ],
              purpose: 'checkpoint',
              layout: 'vertical',
              id: expect.any(String),
            }),
          ]),
        }),
      })
    );
  });
});

import * as Media from 'src/media';
import { convert } from 'src/convert';

describe('convert workbook', () => {
  it('should translate to valid json', async () => {
    const file =
      'test/course_packages/migration-4sdfykby_v_1_0-echo/content/x-oli-workbook_page/welcome.xml';
    const mediaSummary: Media.MediaSummary = {
      mediaItems: {},
      missing: [],
      urlPrefix: '',
      flattenedNames: {},
    };

    const converted = await convert(mediaSummary, file, false);

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
          'newc72f87db5a5543b5ae8582d2d4cd34a7',
        ],
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
                  type: 'p',
                  children: [
                    {
                      type: 'a',
                      children: [{ text: 'Click to begin' }],
                      idref: 'newc72f87db5a5543b5ae8582d2d4cd34a7',
                    },
                  ],
                },
              ],
            },
          ],
          bibrefs: [expect.any(String)],
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
});

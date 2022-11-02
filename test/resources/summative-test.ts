import * as Media from 'src/media';
import { convert } from 'src/convert';

describe('convert summative', () => {
  it('should translate to valid json', async () => {
    const file =
      'test/course_packages/migration-4sdfykby_v_1_0-echo/content/x-oli-assessment2/newc72f87db5a5543b5ae8582d2d4cd34a7.xml';
    const mediaSummary: Media.MediaSummary = {
      mediaItems: {},
      missing: [],
      urlPrefix: '',
      downloadRemote: false,
      flattenedNames: {},
    };

    const converted = await convert(mediaSummary, file, false);

    expect(converted).toContainEqual(
      expect.objectContaining({
        type: 'Page',
        id: 'newc72f87db5a5543b5ae8582d2d4cd34a7',
        legacyPath: expect.any(String),
        legacyId: expect.any(String),
        title: 'Inline Summative Assessment',
        tags: [],
        unresolvedReferences: [],
        warnings: [],
        content: {
          model: [
            {
              type: 'content',
              id: expect.any(String),
              children: [
                {
                  type: 'p',
                  children: expect.arrayContaining([
                    {
                      text: 'THIS IS EXAMPLE SUPPORTING CONTENT. PLEASE EDIT OR DELETE IT.',
                      strong: true,
                    },
                  ]),
                  id: 'd052cd7721c249f3939fd19e4e0271cf',
                },
                {
                  type: 'p',
                  children: expect.arrayContaining([
                    {
                      text: 'Review the Policy Statement, Privileges and Responsibilities and Misuse and Inappropriate Behavior sections of the Computing Policy, then answer the following questions.',
                    },
                  ]),
                  id: 'ea8acc135ecc4b74a9f3b903f54388f1',
                },
              ],
              page: 'b749f85cbddc4660a195fef26fb87422',
            },
            {
              type: 'activity-reference',
              id: expect.any(String),
              activity_id:
                'newc72f87db5a5543b5ae8582d2d4cd34a7-newc72f87db5a5543b5ae8582d2d4cd34a7_1a',
              page: 'b749f85cbddc4660a195fef26fb87422',
            },
            {
              activity_id:
                'newc72f87db5a5543b5ae8582d2d4cd34a7-add_subtratAndmult_div_pool_v1',
              id: expect.any(String),
              page: 'b749f85cbddc4660a195fef26fb87422',
              type: 'activity-reference',
            },
            { type: 'break', id: expect.any(String) },
            {
              type: 'activity-reference',
              id: expect.any(String),
              activity_id:
                'newc72f87db5a5543b5ae8582d2d4cd34a7-e652695935d04ce089f473330345ecf5',
              page: 'e34a049fc4d54f118a914c39d58937e9',
            },
          ],
        },
        isGraded: true,
        isSurvey: false,
        objectives: expect.any(Array),
      })
    );

    expect(converted).toContainEqual(
      expect.objectContaining({
        type: 'TemporaryContent',
        id: expect.any(String),
        legacyPath: expect.any(String),
        title: '',
        tags: [],
        unresolvedReferences: [],
        warnings: [],
        content: {
          type: 'content',
          id: expect.any(String),
          children: [
            {
              type: 'p',
              children: expect.arrayContaining([
                {
                  text: 'THIS IS EXAMPLE SUPPORTING CONTENT. PLEASE EDIT OR DELETE IT.',
                  strong: true,
                },
              ]),
              id: 'd052cd7721c249f3939fd19e4e0271cf',
            },
            {
              type: 'p',
              children: expect.arrayContaining([
                {
                  text: 'Review the Policy Statement, Privileges and Responsibilities and Misuse and Inappropriate Behavior sections of the Computing Policy, then answer the following questions.',
                },
              ]),
              id: 'ea8acc135ecc4b74a9f3b903f54388f1',
            },
          ],
          page: 'b749f85cbddc4660a195fef26fb87422',
        },
        objectives: [],
        legacyId: 'newc72f87db5a5543b5ae8582d2d4cd34a7',
      })
    );

    expect(converted).toContainEqual(
      expect.objectContaining({
        type: 'Activity',
        id: 'newc72f87db5a5543b5ae8582d2d4cd34a7-newc72f87db5a5543b5ae8582d2d4cd34a7_1a',
        legacyPath: expect.any(String),
        title: '',
        tags: [],
        unresolvedReferences: [],
        warnings: [],
        content: {
          stem: {
            content: {
              model: [
                {
                  type: 'p',
                  children: expect.arrayContaining([
                    {
                      text: 'THIS IS AN EXAMPLE MULTIPLE CHOICE QUESTION. PLEASE EDIT OR DELETE IT.',
                      strong: true,
                    },
                  ]),
                  id: 'f4ce7ca7312d41a4a8861473a4aa85bd',
                },
                {
                  type: 'p',
                  children: expect.arrayContaining([
                    {
                      text: 'Albert sees that his girlfriend has written her password on a note beside her computer; he logs in and sends a joke email to one of her friends. This action is: ',
                    },
                  ]),
                  id: 'b86fe531f3924139980084844fc8adaa',
                },
              ],
            },
          },
          choices: [
            {
              content: {
                model: [{ type: 'p', children: [{ text: 'Acceptable' }] }],
              },
              id: 'yes',
            },
            {
              content: {
                model: [{ type: 'p', children: [{ text: 'Unacceptable' }] }],
              },
              id: 'no',
            },
          ],
          authoring: {
            version: 2,
            parts: [
              {
                id: expect.any(String),
                responses: [
                  {
                    id: expect.any(String),
                    score: 1,
                    rule: 'input like {no}',
                    legacyMatch: 'no',
                    feedback: {
                      id: expect.any(String),
                      content: {
                        model: [
                          {
                            type: 'p',
                            children: [
                              {
                                text: "Correct; this is a pretty clear violation of the policy, including using another person's account and impersonating another individual.",
                              },
                            ],
                            id: 'f277ed5de9c949138801d812b4a9cc3a',
                          },
                        ],
                      },
                    },
                  },
                  {
                    id: expect.any(String),
                    score: 0,
                    rule: 'input like {.*}',
                    legacyMatch: 'yes',
                    feedback: {
                      id: expect.any(String),
                      content: {
                        model: [
                          {
                            type: 'p',
                            children: [
                              {
                                text: "Incorrect; using another student's password is not acceptable, even if it's left out in the open. Further, Albert has assumed his girlfriend's identity by using her account, which is also a violation of the Computing Policy.",
                              },
                            ],
                            id: 'b58e46d68e0140659b55ef63299b3a1d',
                          },
                        ],
                      },
                    },
                  },
                ],
                hints: [
                  {
                    id: expect.any(String),
                    content: {
                      model: [{ type: 'p', children: [{ text: '' }] }],
                    },
                  },
                  {
                    id: expect.any(String),
                    content: {
                      model: [{ type: 'p', children: [{ text: '' }] }],
                    },
                  },
                  {
                    id: expect.any(String),
                    content: {
                      model: [{ type: 'p', children: [{ text: '' }] }],
                    },
                  },
                ],
                scoringStrategy: 'average',
                targeted: [],
                objectives: [],
                explanation: null,
              },
            ],
            transformations: [
              { id: expect.any(String), path: 'choices', operation: 'shuffle' },
            ],
            previewText: '',
            targeted: [],
          },
        },
        objectives: expect.any(Object),
        legacyId: 'newc72f87db5a5543b5ae8582d2d4cd34a7',
        subType: 'oli_multiple_choice',
        imageReferences: [],
      })
    );

    expect(converted).toContainEqual(
      expect.objectContaining({
        type: 'Break',
        id: expect.any(String),
        legacyId: 'newc72f87db5a5543b5ae8582d2d4cd34a7',
      })
    );

    expect(converted).toContainEqual(
      expect.objectContaining({
        type: 'Activity',
        id: 'newc72f87db5a5543b5ae8582d2d4cd34a7-e652695935d04ce089f473330345ecf5',
        legacyPath: expect.any(String),
        title: '',
        tags: [],
        unresolvedReferences: [],
        content: {
          stem: {
            content: {
              model: [
                {
                  type: 'p',
                  children: [{ text: 'MCQ page 2' }],
                  id: 'd3786bde78b943a9a4404313d0a8400d',
                },
              ],
            },
          },
          choices: [
            {
              content: {
                model: [{ type: 'p', children: [{ text: 'choice 1' }] }],
              },
              id: 'f3d408f2b88c4e15891a3da9d4848b91',
            },
            {
              content: {
                model: [{ type: 'p', children: [{ text: 'choice 2' }] }],
              },
              id: 'dd1a0ca00db246d3adafbb4b025ba017',
            },
          ],
          authoring: {
            version: 2,
            parts: [
              {
                id: expect.any(String),
                responses: [
                  {
                    id: expect.any(String),
                    score: 1,
                    rule: 'input like {f3d408f2b88c4e15891a3da9d4848b91}',
                    legacyMatch: 'f3d408f2b88c4e15891a3da9d4848b91',
                    feedback: {
                      id: expect.any(String),
                      content: {
                        model: [
                          {
                            type: 'p',
                            children: [{ type: 'text', text: ' ' }],
                            id: 'c9d611862b9f4d7f9fa7d554373bf9aa',
                          },
                        ],
                      },
                    },
                  },
                  {
                    id: expect.any(String),
                    score: 0,
                    rule: 'input like {.*}',
                    legacyMatch: 'dd1a0ca00db246d3adafbb4b025ba017',
                    feedback: {
                      id: expect.any(String),
                      content: {
                        model: [
                          {
                            type: 'p',
                            children: [{ type: 'text', text: ' ' }],
                            id: 'e047a90c8651468bb8c09e6b99f8d681',
                          },
                        ],
                      },
                    },
                  },
                ],
                hints: [
                  {
                    id: expect.any(String),
                    content: {
                      model: [{ type: 'p', children: [{ text: '' }] }],
                    },
                  },
                  {
                    id: expect.any(String),
                    content: {
                      model: [{ type: 'p', children: [{ text: '' }] }],
                    },
                  },
                  {
                    id: expect.any(String),
                    content: {
                      model: [{ type: 'p', children: [{ text: '' }] }],
                    },
                  },
                ],
                scoringStrategy: 'average',
                targeted: [],
                objectives: [],
                explanation: null,
              },
            ],
            transformations: [
              { id: expect.any(String), path: 'choices', operation: 'shuffle' },
            ],
            previewText: '',
            targeted: [],
          },
        },
        objectives: expect.any(Object),
        legacyId: 'newc72f87db5a5543b5ae8582d2d4cd34a7',
        subType: 'oli_multiple_choice',
        imageReferences: [],
        warnings: [],
      })
    );
  });

  it('should convert fill_in_the_blank with multiple feedbacks to parts with explanation', async () => {
    const file =
      'test/course_packages/migration-4sdfykby_v_1_0-echo/content/x-oli-assessment2/newc72f87db5a5543b5ae8582d2d4cd34a7.xml';
    const mediaSummary: Media.MediaSummary = {
      mediaItems: {},
      missing: [],
      urlPrefix: '',
      downloadRemote: false,
      flattenedNames: {},
    };

    const converted = await convert(mediaSummary, file, false);

    expect(converted).toContainEqual(
      expect.objectContaining({
        type: 'Activity',
        id: 'newc72f87db5a5543b5ae8582d2d4cd34a7-add_subtratAndmult_div_pool_v1',
        content: expect.objectContaining({
          authoring: expect.objectContaining({
            parts: [
              expect.objectContaining({
                id: 'one',
                explanation: {
                  id: expect.any(String),
                  content: [
                    {
                      type: 'p',
                      children: [
                        { text: 'Incorrect. The correct answer is 392 cm ' },
                        { text: '3', sup: true },
                        {
                          text: '. For multiplication, round the product to the least number of significant figures in the three values (three sig. figs. in 6.27). ',
                        },
                      ],
                    },
                  ],
                },
              }),
              expect.objectContaining({
                id: 'two',
                explanation: {
                  id: expect.any(String),
                  content: [
                    {
                      type: 'p',
                      children: [
                        {
                          text: 'Incorrect. The correct answer is 15.52 g. For addition, round the product to the least precise of the three values (10.03 is to the hundredths place).',
                        },
                      ],
                    },
                  ],
                },
              }),
              expect.objectContaining({
                id: 'three',
                explanation: {
                  id: expect.any(String),
                  content: [
                    {
                      type: 'p',
                      children: [
                        {
                          text: 'Incorrect. The correct answer is 1.6. Based on the order of operations, first add the values in the parentheses and consider where the least precise place is for that value (but do not round yet). Then do the division and round off to the least number of significant figures.',
                        },
                      ],
                    },
                  ],
                },
              }),
            ],
          }),
        }),
        objectives: expect.any(Object),
        legacyId: 'newc72f87db5a5543b5ae8582d2d4cd34a7',
        legacyPath:
          'test/course_packages/migration-4sdfykby_v_1_0-echo/content/x-oli-assessment2/newc72f87db5a5543b5ae8582d2d4cd34a7.xml',
        subType: 'oli_multi_input',
        imageReferences: [],
      })
    );
  });

  it('converts multi input ranges with correct operator', async () => {
    const file =
      'test/course_packages/migration-4sdfykby_v_1_0-echo/content/x-oli-assessment2/newe6ddd6fec8f54749a037ef13abd8df93.xml';
    const mediaSummary: Media.MediaSummary = {
      mediaItems: {},
      missing: [],
      urlPrefix: '',
      downloadRemote: false,
      flattenedNames: {},
    };

    const converted = await convert(mediaSummary, file, false);

    expect(converted).toContainEqual(
      expect.objectContaining({
        type: 'Activity',
        id: 'newe6ddd6fec8f54749a037ef13abd8df93-f183bbb3a6134611840042c6bf3c168e',
        subType: 'oli_multi_input',
        content: expect.objectContaining({
          inputs: [
            {
              inputType: 'numeric',
              id: 'f88e94a8ec9145beb832e773ac6bfc79',
              partId: 'cc5855a41c294080ac063e54b654cf72',
            },
          ],
          authoring: expect.objectContaining({
            targeted: [],
            parts: expect.arrayContaining([
              expect.objectContaining({
                id: 'cc5855a41c294080ac063e54b654cf72',
                responses: [
                  {
                    id: expect.any(String),
                    score: 1,
                    rule: 'input = {[2,5]}',
                    legacyMatch: '[2,5]',
                    feedback: {
                      id: expect.any(String),
                      content: {
                        id: expect.any(String),
                        model: [
                          {
                            type: 'p',
                            children: [
                              {
                                text: 'Correct!',
                              },
                            ],
                            id: 'cd83c39e3c21465399aba99e6889ce64',
                          },
                        ],
                      },
                    },
                  },
                  {
                    id: expect.any(String),
                    score: 0,
                    rule: 'input like {.*}',
                    legacyMatch: '.*',
                    feedback: {
                      id: expect.any(String),
                      content: {
                        id: expect.any(String),
                        model: [
                          {
                            type: 'p',
                            children: [
                              {
                                text: 'Incorrect.',
                              },
                            ],
                            id: 'b9e0de8754f74e3c96cc3ecb1645d695',
                          },
                        ],
                      },
                    },
                  },
                ],
              }),
            ]),
            transformations: [],
            previewText: '',
          }),
        }),
      })
    );
  });
});

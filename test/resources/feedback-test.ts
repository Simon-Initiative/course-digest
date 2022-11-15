import { convertToFormative } from '../../src/resources/feedback';
import * as DOM from '../../src/utils/dom';
import * as Media from 'src/media';
import { convert } from 'src/convert';

describe('convertToFormative', () => {
  test('should convert the feedback model to formative', () => {
    const $ = DOM.read(
      'test/course_packages/migration-4sdfykby_v_1_0-echo/content/x-oli-feedback/pre_course_student_survey.xml'
    );

    convertToFormative($);

    expect($('assessment title').text()).toBe('Pre-Course Student Survey');

    // there should be 5 questions total under a single page in the assessment
    expect($('assessment page question').length).toBe(5);

    const questions = $('assessment page question');

    // first likert_series transformed to likert_scale question
    expect($(questions[0]).attr('id')).toBeDefined();
    expect($('body', questions[0]).text()).toContain(
      'PartI: A list of opposing words appears below. Rate how well these words describe your feelings about chemistry.'
    );

    const likert_scale_1_labels = $('likert_scale label', questions[0]);
    expect($(likert_scale_1_labels[0]).text()).toEqual('hard');
    expect($(likert_scale_1_labels[1]).text()).toEqual('');
    expect($(likert_scale_1_labels[2]).text()).toEqual('');
    expect($(likert_scale_1_labels[3]).text()).toEqual('');
    expect($(likert_scale_1_labels[4]).text()).toEqual('');
    expect($(likert_scale_1_labels[5]).text()).toEqual('');
    expect($(likert_scale_1_labels[6]).text()).toEqual('easy');

    const likert_scale_1_items = $('item', questions[0]);
    expect($('p', likert_scale_1_items[0]).text()).toContain('Chemistry is...');

    // second likert_series transformed to likert_scale question
    expect($(questions[1]).attr('id')).toBeDefined();
    expect($('body', questions[1]).text()).toContain(
      'Indicate the extent to which you agree or disagree with each of the following statements.'
    );

    const likert_scale_2_labels = $('likert_scale label', questions[1]);
    expect($(likert_scale_2_labels[0]).text()).toEqual('strongly agree');
    expect($(likert_scale_2_labels[1]).text()).toEqual('agree');
    expect($(likert_scale_2_labels[2]).text()).toEqual('somewhat agree');
    expect($(likert_scale_2_labels[3]).text()).toEqual(
      'neither agree nor disagree'
    );
    expect($(likert_scale_2_labels[4]).text()).toEqual('somewhat disagree');
    expect($(likert_scale_2_labels[5]).text()).toEqual('disagree');
    expect($(likert_scale_2_labels[6]).text()).toEqual('strongly disagree');

    const likert_scale_2_items = $('item', questions[1]);
    expect($('p', likert_scale_2_items[0]).text()).toContain(
      'I feel like I "belong" in chemistry.'
    );
    expect($('p', likert_scale_2_items[1]).text()).toContain(
      'I feel welcomed in my chemistry class.'
    );
    expect($('p', likert_scale_2_items[2]).text()).toContain(
      'I do not have much in common with other students in my chemistry class.'
    );

    // third likert transformed to likert_scale question
    expect($(questions[2]).attr('id')).toBeDefined();
    expect($('body', questions[2]).text()).toContain(
      'On average, about how much time per week did you spend using the OLI materials?'
    );

    const likert_scale_3_labels = $('likert_scale label', questions[2]);
    expect($(likert_scale_3_labels[0]).text()).toEqual('1-2 hours');
    expect($(likert_scale_3_labels[1]).text()).toEqual('2-3 hours');
    expect($(likert_scale_3_labels[2]).text()).toEqual('3-4 hours');
    expect($(likert_scale_3_labels[3]).text()).toEqual('4-5 hours');
    expect($(likert_scale_3_labels[4]).text()).toEqual('5-6 hours');
    expect($(likert_scale_3_labels[5]).text()).toEqual('6+ hours');

    // fourth open_response transformed to short_answer
    expect($(questions[3]).attr('id')).toBeDefined();
    expect($(questions[3]).attr('required')).toBe('false');
    expect($('body', questions[3]).text()).toContain(
      'How do you currently describe your gender identity?'
    );

    expect($('short_answer', questions[3]).attr('id')).toBeDefined();

    const short_answer_parts = $('part', questions[3]);
    expect($('response', short_answer_parts[0]).attr('match')).toBe('*');
    expect($('response', short_answer_parts[0]).attr('score')).toBe('1');
    expect($('response', short_answer_parts[0]).attr('input')).toBeDefined();

    // fourth multiple_choice transformed to multiple_choice
    expect($(questions[4]).attr('id')).toBeDefined();
    expect($('body', questions[4]).text()).toContain(
      'Which categories describe you? Select all that apply to you: your racial or ethnic heritage?'
    );

    expect($('multiple_choice', questions[4]).attr('id')).toBeDefined();
    const multiple_choice_choices = $('multiple_choice choice', questions[4]);
    expect($(multiple_choice_choices[0]).text()).toEqual(
      ' American Indian or Alaska Native—For example, Navajo Nation, Blackfeet Tribe, Mayan, Aztec, Native Village of Barrow Inupiat Traditional Government, Nome Eskimo Community '
    );
    expect($(multiple_choice_choices[1]).text()).toEqual(
      'Asian—For example, Chinese, Filipino, Asian Indian, Vietnamese, Korean, Japanese'
    );
    expect($(multiple_choice_choices[2]).text()).toEqual(
      'Black or African American—For example, Jamaican, Haitian, Nigerian, Ethiopian, Somalian'
    );
    expect($(multiple_choice_choices[3]).text()).toEqual(
      'Hispanic, Latino or Spanish Origin—For example, Mexican or Mexican American, Puerto Rican, Cuban, Salvadoran, Dominican, Columbian '
    );
    expect($(multiple_choice_choices[4]).text()).toEqual(
      'Middle Eastern or North African—For example, Lebanese, Iranian, Egyptian, Syrian, Moroccan, Algerian'
    );
    expect($(multiple_choice_choices[5]).text()).toEqual(
      'Native Hawaiian or Other Pacific Islander—For example, Native Hawaiian, Samoan, Chamorro, Tongan, Fijian, Marshallese'
    );
    expect($(multiple_choice_choices[6]).text()).toEqual(
      'White—For example, German, Irish, English, Italian, Polish, French'
    );
    expect($(multiple_choice_choices[7]).text()).toEqual(
      'International student'
    );
    expect($(multiple_choice_choices[8]).text()).toEqual(
      'Some other race, ethnicity, or origin, please specify: ___________'
    );
    expect($(multiple_choice_choices[9]).text()).toEqual(
      ' I prefer not to answer '
    );

    const multiple_choice_parts = $('part', questions[4]);
    const multiple_choice_part_responses = $(
      'response',
      multiple_choice_parts[0]
    );

    expect($(multiple_choice_part_responses[0]).text()).toEqual('Correct');
    expect($(multiple_choice_part_responses[0]).attr('match')).toEqual('A');
    expect($(multiple_choice_part_responses[0]).attr('score')).toEqual('1');
    expect($(multiple_choice_part_responses[1]).text()).toEqual('Incorrect');
    expect($(multiple_choice_part_responses[1]).attr('match')).toEqual('B');
    expect($(multiple_choice_part_responses[1]).attr('score')).toEqual('0');
    expect($(multiple_choice_part_responses[2]).text()).toEqual('Incorrect');
    expect($(multiple_choice_part_responses[2]).attr('match')).toEqual('C');
    expect($(multiple_choice_part_responses[2]).attr('score')).toEqual('0');
    expect($(multiple_choice_part_responses[3]).text()).toEqual('Incorrect');
    expect($(multiple_choice_part_responses[3]).attr('match')).toEqual('D');
    expect($(multiple_choice_part_responses[3]).attr('score')).toEqual('0');
    expect($(multiple_choice_part_responses[4]).text()).toEqual('Incorrect');
    expect($(multiple_choice_part_responses[4]).attr('match')).toEqual('E');
    expect($(multiple_choice_part_responses[4]).attr('score')).toEqual('0');
    expect($(multiple_choice_part_responses[5]).text()).toEqual('Incorrect');
    expect($(multiple_choice_part_responses[5]).attr('match')).toEqual('F');
    expect($(multiple_choice_part_responses[5]).attr('score')).toEqual('0');
    expect($(multiple_choice_part_responses[6]).text()).toEqual('Incorrect');
    expect($(multiple_choice_part_responses[6]).attr('match')).toEqual('G');
    expect($(multiple_choice_part_responses[6]).attr('score')).toEqual('0');
    expect($(multiple_choice_part_responses[7]).text()).toEqual('Incorrect');
    expect($(multiple_choice_part_responses[7]).attr('match')).toEqual('H');
    expect($(multiple_choice_part_responses[7]).attr('score')).toEqual('0');
    expect($(multiple_choice_part_responses[8]).text()).toEqual('Incorrect');
    expect($(multiple_choice_part_responses[8]).attr('match')).toEqual('I');
    expect($(multiple_choice_part_responses[8]).attr('score')).toEqual('0');
    expect($(multiple_choice_part_responses[9]).text()).toEqual('Incorrect');
    expect($(multiple_choice_part_responses[9]).attr('match')).toEqual('J');
    expect($(multiple_choice_part_responses[9]).attr('score')).toEqual('0');
  });
});

describe('convert feedback', () => {
  it('should translate to valid json', async () => {
    const file =
      'test/course_packages/migration-4sdfykby_v_1_0-echo/content/x-oli-feedback/pre_course_student_survey.xml';
    const mediaSummary: Media.MediaSummary = {
      mediaItems: {},
      missing: [],
      urlPrefix: '',
      downloadRemote: false,
      flattenedNames: {},
    };

    const items = await convert(mediaSummary, file, false);

    const page = items[0];
    const activity2_likert = items[2];
    const activity3_likert = items[3];
    const activity4_single_response = items[4];
    const activity5_multiple_choice = items[5];

    expect(page).toEqual(
      expect.objectContaining({
        type: 'Page',
        id: 'pre_course_student_survey',
        legacyPath: expect.any(String),
        legacyId: expect.any(String),
        title: 'Pre-Course Student Survey',
        tags: [],
        unresolvedReferences: [],
        warnings: [],
        content: {
          model: [
            {
              type: 'survey',
              id: expect.any(String),
              children: [
                {
                  type: 'activity-reference',
                  activity_id: expect.stringContaining(
                    'pre_course_student_survey-'
                  ),
                  id: expect.any(String),
                  page: expect.any(String),
                },
                {
                  type: 'activity-reference',
                  activity_id: expect.stringContaining(
                    'pre_course_student_survey-'
                  ),
                  id: expect.any(String),
                  page: expect.any(String),
                },
                {
                  type: 'activity-reference',
                  activity_id: expect.stringContaining(
                    'pre_course_student_survey-'
                  ),
                  id: expect.any(String),
                  page: expect.any(String),
                },
                {
                  type: 'activity-reference',
                  activity_id: expect.stringContaining(
                    'pre_course_student_survey-'
                  ),
                  id: expect.any(String),
                  page: expect.any(String),
                },
                {
                  type: 'activity-reference',
                  activity_id: expect.stringContaining(
                    'pre_course_student_survey-'
                  ),
                  id: expect.any(String),
                  page: expect.any(String),
                },
              ],
            },
          ],
        },
        isGraded: false,
        isSurvey: true,
        objectives: [],
      })
    );

    expect(activity2_likert).toEqual(
      expect.objectContaining({
        type: 'Activity',
        id: expect.stringContaining('pre_course_student_survey-'),
        legacyPath: file,
        title: '',
        tags: [],
        warnings: [],
        unresolvedReferences: [],
        imageReferences: undefined,
        content: {
          stem: {
            content: [
              {
                type: 'p',
                children: [
                  {
                    text: 'Indicate the extent to which you agree or disagree with each of the following statements.',
                  },
                ],
              },
            ],
          },
          choices: [
            {
              content: [{ type: 'p', children: [{ text: 'strongly agree' }] }],
              id: '1',
            },
            {
              content: [{ type: 'p', children: [{ text: 'agree' }] }],
              id: '2',
            },
            {
              content: [{ type: 'p', children: [{ text: 'somewhat agree' }] }],
              id: '3',
            },
            {
              content: [
                {
                  type: 'p',
                  children: [{ text: 'neither agree nor disagree' }],
                },
              ],
              id: '4',
            },
            {
              content: [
                {
                  type: 'p',
                  children: [{ text: 'somewhat disagree' }],
                },
              ],
              id: '5',
            },
            {
              content: [{ type: 'p', children: [{ text: 'disagree' }] }],
              id: '6',
            },
            {
              content: [
                {
                  type: 'p',
                  children: [{ text: 'strongly disagree' }],
                },
              ],
              id: '7',
            },
          ],
          items: [
            {
              content: [
                {
                  type: 'p',
                  children: [{ text: 'I feel like I "belong" in chemistry.' }],
                },
              ],
              id: 'q4',
              required: 'true',
            },
            {
              content: [
                {
                  type: 'p',
                  children: [
                    { text: 'I feel welcomed in my chemistry class.' },
                  ],
                },
              ],
              id: 'q5',
              required: 'true',
            },
            {
              content: [
                {
                  type: 'p',
                  children: [
                    {
                      text: 'I do not have much in common with other students in my chemistry class.',
                    },
                  ],
                },
              ],
              id: 'q6',
              required: 'true',
            },
          ],
          orderDescending: false,
          authoring: {
            parts: [
              {
                gradingApproach: 'automatic',
                hints: [
                  {
                    id: expect.any(String),
                    content: [{ type: 'p', children: [{ text: '' }] }],
                  },
                  {
                    id: expect.any(String),
                    content: [{ type: 'p', children: [{ text: '' }] }],
                  },
                  {
                    id: expect.any(String),
                    content: [{ type: 'p', children: [{ text: '' }] }],
                  },
                ],
                id: 'q4',
                outOf: null,
                responses: [
                  {
                    id: expect.any(String),
                    score: 1,
                    rule: 'input like {1}',
                    feedback: {
                      id: expect.any(String),
                      content: [
                        { type: 'p', children: [{ text: 'Correct.' }] },
                      ],
                    },
                  },
                  {
                    id: expect.any(String),
                    score: 0,
                    rule: 'input like {.*}',
                    feedback: {
                      id: expect.any(String),
                      content: [
                        { type: 'p', children: [{ text: 'Incorrect.' }] },
                      ],
                    },
                  },
                ],
                scoringStrategy: 'average',
                objectives: expect.any(Array),
                targeted: expect.any(Array),
                explanation: null,
              },
              {
                gradingApproach: 'automatic',
                hints: [
                  {
                    id: expect.any(String),
                    content: [{ type: 'p', children: [{ text: '' }] }],
                  },
                  {
                    id: expect.any(String),
                    content: [{ type: 'p', children: [{ text: '' }] }],
                  },
                  {
                    id: expect.any(String),
                    content: [{ type: 'p', children: [{ text: '' }] }],
                  },
                ],
                id: 'q5',
                outOf: null,
                responses: [
                  {
                    id: expect.any(String),
                    score: 1,
                    rule: 'input like {1}',
                    feedback: {
                      id: expect.any(String),
                      content: [
                        { type: 'p', children: [{ text: 'Correct.' }] },
                      ],
                    },
                  },
                  {
                    id: expect.any(String),
                    score: 0,
                    rule: 'input like {.*}',
                    feedback: {
                      id: expect.any(String),
                      content: [
                        { type: 'p', children: [{ text: 'Incorrect.' }] },
                      ],
                    },
                  },
                ],
                scoringStrategy: 'average',
                objectives: expect.any(Array),
                targeted: expect.any(Array),
                explanation: null,
              },
              {
                gradingApproach: 'automatic',
                hints: [
                  {
                    id: expect.any(String),
                    content: [{ type: 'p', children: [{ text: '' }] }],
                  },
                  {
                    id: expect.any(String),
                    content: [{ type: 'p', children: [{ text: '' }] }],
                  },
                  {
                    id: expect.any(String),
                    content: [{ type: 'p', children: [{ text: '' }] }],
                  },
                ],
                id: 'q6',
                outOf: null,
                responses: [
                  {
                    id: expect.any(String),
                    score: 1,
                    rule: 'input like {1}',
                    feedback: {
                      id: expect.any(String),
                      content: [
                        { type: 'p', children: [{ text: 'Correct.' }] },
                      ],
                    },
                  },
                  {
                    id: expect.any(String),
                    score: 0,
                    rule: 'input like {.*}',
                    feedback: {
                      id: expect.any(String),
                      content: [
                        { type: 'p', children: [{ text: 'Incorrect.' }] },
                      ],
                    },
                  },
                ],
                scoringStrategy: 'average',
                objectives: expect.any(Array),
                targeted: expect.any(Array),
                explanation: null,
              },
            ],
            transformations: [],
            previewText: '',
            targeted: expect.any(Array),
          },
        },
        objectives: expect.any(Object),
        legacyId: 'pre_course_student_survey',
        subType: 'oli_likert',
      })
    );

    expect(activity3_likert).toEqual(
      expect.objectContaining({
        type: 'Activity',
        id: expect.stringContaining('pre_course_student_survey-'),
        legacyPath: file,
        title: '',
        tags: [],
        warnings: [],
        unresolvedReferences: [],
        imageReferences: undefined,
        content: {
          stem: {
            content: [
              {
                type: 'p',
                children: [
                  {
                    text: '',
                  },
                ],
              },
            ],
          },
          choices: [
            {
              content: [{ type: 'p', children: [{ text: '1-2 hours' }] }],
              id: '1',
            },
            {
              content: [{ type: 'p', children: [{ text: '2-3 hours' }] }],
              id: '2',
            },
            {
              content: [{ type: 'p', children: [{ text: '3-4 hours' }] }],
              id: '3',
            },
            {
              content: [{ type: 'p', children: [{ text: '4-5 hours' }] }],
              id: '4',
            },
            {
              content: [{ type: 'p', children: [{ text: '5-6 hours' }] }],
              id: '5',
            },
            {
              content: [{ type: 'p', children: [{ text: '6+ hours' }] }],
              id: '6',
            },
          ],
          items: [
            {
              content: [
                {
                  type: 'p',
                  children: [
                    {
                      text: 'On average, about how much time per week did you spend using the OLI materials? ',
                    },
                  ],
                  id: expect.any(String),
                },
                {
                  type: 'p',
                  children: [{ type: 'text', text: ' ' }],
                  id: expect.any(String),
                },
              ],
              id: expect.any(String),
              required: false,
            },
          ],
          orderDescending: false,
          authoring: {
            parts: [
              {
                gradingApproach: 'automatic',
                hints: [
                  {
                    id: expect.any(String),
                    content: [{ type: 'p', children: [{ text: '' }] }],
                  },
                  {
                    id: expect.any(String),
                    content: [{ type: 'p', children: [{ text: '' }] }],
                  },
                  {
                    id: expect.any(String),
                    content: [{ type: 'p', children: [{ text: '' }] }],
                  },
                ],
                id: expect.any(String),
                outOf: null,
                responses: [
                  {
                    id: expect.any(String),
                    score: 1,
                    rule: 'input like {1}',
                    feedback: {
                      id: expect.any(String),
                      content: [
                        { type: 'p', children: [{ text: 'Correct.' }] },
                      ],
                    },
                  },
                  {
                    id: expect.any(String),
                    score: 0,
                    rule: 'input like {.*}',
                    feedback: {
                      id: expect.any(String),
                      content: [
                        { type: 'p', children: [{ text: 'Incorrect.' }] },
                      ],
                    },
                  },
                ],
                scoringStrategy: 'average',
                objectives: expect.any(Array),
                targeted: expect.any(Array),
                explanation: null,
              },
            ],
            transformations: [],
            previewText: '',
            targeted: expect.any(Array),
          },
        },
        objectives: expect.any(Object),
        legacyId: 'pre_course_student_survey',
        subType: 'oli_likert',
      })
    );

    expect(activity4_single_response).toEqual(
      expect.objectContaining({
        type: 'Activity',
        id: 'pre_course_student_survey-gender',
        legacyPath: file,
        title: '',
        tags: [],
        unresolvedReferences: [],
        warnings: [],
        imageReferences: [],
        content: {
          stem: {
            content: [
              {
                type: 'p',
                children: [
                  {
                    text: 'How do you currently describe your gender identity?',
                  },
                ],
              },
            ],
          },
          inputType: 'text',
          submitAndCompare: false,
          authoring: {
            parts: [
              {
                id: expect.any(String),
                responses: [
                  {
                    id: expect.any(String),
                    score: 1,
                    rule: 'input like {.*}',
                    feedback: {
                      id: expect.any(String),
                      content: [{ type: 'p', children: [{ text: '' }] }],
                    },
                  },
                ],
                hints: [
                  {
                    id: expect.any(String),
                    content: [{ type: 'p', children: [{ text: '' }] }],
                  },
                  {
                    id: expect.any(String),
                    content: [{ type: 'p', children: [{ text: '' }] }],
                  },
                  {
                    id: expect.any(String),
                    content: [{ type: 'p', children: [{ text: '' }] }],
                  },
                ],
                objectives: [],
                scoringStrategy: 'average',
                explanation: null,
              },
            ],
            transformations: [],
            previewText: '',
          },
        },
        objectives: expect.any(Object),
        legacyId: 'pre_course_student_survey',
        subType: 'oli_short_answer',
      })
    );

    expect(activity5_multiple_choice).toEqual(
      expect.objectContaining({
        type: 'Activity',
        id: 'pre_course_student_survey-race',
        legacyPath: file,
        title: '',
        tags: [],
        warnings: [],
        unresolvedReferences: [],
        imageReferences: [],
        content: {
          stem: {
            content: [
              {
                type: 'p',
                children: [
                  {
                    text: 'Which categories describe you? Select all that apply to you: your racial or ethnic heritage?',
                  },
                ],
              },
            ],
          },
          choices: [
            {
              content: [
                {
                  type: 'p',
                  children: [
                    {
                      text: 'American Indian or Alaska Native—For example, Navajo Nation, Blackfeet Tribe, Mayan, Aztec, Native Village of Barrow Inupiat Traditional Government, Nome Eskimo Community',
                    },
                  ],
                },
              ],
              id: 'A',
            },
            {
              content: [
                {
                  type: 'p',
                  children: [
                    {
                      text: 'Asian—For example, Chinese, Filipino, Asian Indian, Vietnamese, Korean, Japanese',
                    },
                  ],
                },
              ],
              id: 'B',
            },
            {
              content: [
                {
                  type: 'p',
                  children: [
                    {
                      text: 'Black or African American—For example, Jamaican, Haitian, Nigerian, Ethiopian, Somalian',
                    },
                  ],
                },
              ],
              id: 'C',
            },
            {
              content: [
                {
                  type: 'p',
                  children: [
                    {
                      text: 'Hispanic, Latino or Spanish Origin—For example, Mexican or Mexican American, Puerto Rican, Cuban, Salvadoran, Dominican, Columbian',
                    },
                  ],
                },
              ],
              id: 'D',
            },
            {
              content: [
                {
                  type: 'p',
                  children: [
                    {
                      text: 'Middle Eastern or North African—For example, Lebanese, Iranian, Egyptian, Syrian, Moroccan, Algerian',
                    },
                  ],
                },
              ],
              id: 'E',
            },
            {
              content: [
                {
                  type: 'p',
                  children: [
                    {
                      text: 'Native Hawaiian or Other Pacific Islander—For example, Native Hawaiian, Samoan, Chamorro, Tongan, Fijian, Marshallese',
                    },
                  ],
                },
              ],
              id: 'F',
            },
            {
              content: [
                {
                  type: 'p',
                  children: [
                    {
                      text: 'White—For example, German, Irish, English, Italian, Polish, French',
                    },
                  ],
                },
              ],
              id: 'G',
            },
            {
              content: [
                {
                  type: 'p',
                  children: [{ text: 'International student' }],
                },
              ],
              id: 'H',
            },
            {
              content: [
                {
                  type: 'p',
                  children: [
                    {
                      text: 'Some other race, ethnicity, or origin, please specify: ___________',
                    },
                  ],
                },
              ],
              id: 'I',
            },
            {
              content: [
                {
                  type: 'p',
                  children: [{ text: 'I prefer not to answer' }],
                },
              ],
              id: 'J',
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
                    rule: 'input like {A}',
                    legacyMatch: 'A',
                    feedback: {
                      id: expect.any(String),
                      content: [{ type: 'p', children: [{ text: 'Correct' }] }],
                    },
                  },
                  {
                    id: expect.any(String),
                    score: 0,
                    rule: 'input like {B}',
                    legacyMatch: 'B',
                    feedback: {
                      id: expect.any(String),
                      content: [
                        {
                          type: 'p',
                          children: [{ text: 'Incorrect' }],
                        },
                      ],
                    },
                  },
                  {
                    id: expect.any(String),
                    score: 0,
                    rule: 'input like {C}',
                    legacyMatch: 'C',
                    feedback: {
                      id: expect.any(String),
                      content: [
                        {
                          type: 'p',
                          children: [{ text: 'Incorrect' }],
                        },
                      ],
                    },
                  },
                  {
                    id: expect.any(String),
                    score: 0,
                    rule: 'input like {D}',
                    legacyMatch: 'D',
                    feedback: {
                      id: expect.any(String),
                      content: [
                        {
                          type: 'p',
                          children: [{ text: 'Incorrect' }],
                        },
                      ],
                    },
                  },
                  {
                    id: expect.any(String),
                    score: 0,
                    rule: 'input like {E}',
                    legacyMatch: 'E',
                    feedback: {
                      id: expect.any(String),
                      content: [
                        {
                          type: 'p',
                          children: [{ text: 'Incorrect' }],
                        },
                      ],
                    },
                  },
                  {
                    id: expect.any(String),
                    score: 0,
                    rule: 'input like {F}',
                    legacyMatch: 'F',
                    feedback: {
                      id: expect.any(String),
                      content: [
                        {
                          type: 'p',
                          children: [{ text: 'Incorrect' }],
                        },
                      ],
                    },
                  },
                  {
                    id: expect.any(String),
                    score: 0,
                    rule: 'input like {G}',
                    legacyMatch: 'G',
                    feedback: {
                      id: expect.any(String),
                      content: [
                        {
                          type: 'p',
                          children: [{ text: 'Incorrect' }],
                        },
                      ],
                    },
                  },
                  {
                    id: expect.any(String),
                    score: 0,
                    rule: 'input like {H}',
                    legacyMatch: 'H',
                    feedback: {
                      id: expect.any(String),
                      content: [
                        {
                          type: 'p',
                          children: [{ text: 'Incorrect' }],
                        },
                      ],
                    },
                  },
                  {
                    id: expect.any(String),
                    score: 0,
                    rule: 'input like {I}',
                    legacyMatch: 'I',
                    feedback: {
                      id: expect.any(String),
                      content: [
                        {
                          type: 'p',
                          children: [{ text: 'Incorrect' }],
                        },
                      ],
                    },
                  },
                  {
                    id: expect.any(String),
                    score: 0,
                    rule: 'input like {J}',
                    legacyMatch: 'J',
                    feedback: {
                      id: expect.any(String),
                      content: [
                        {
                          type: 'p',
                          children: [{ text: 'Incorrect' }],
                        },
                      ],
                    },
                  },
                  {
                    id: expect.any(String),
                    score: 0,
                    rule: 'input like {.*}',
                    feedback: {
                      id: expect.any(String),
                      content: [
                        {
                          type: 'p',
                          children: [{ text: 'Incorrect.' }],
                        },
                      ],
                    },
                  },
                ],
                hints: [
                  {
                    id: expect.any(String),
                    content: [{ type: 'p', children: [{ text: '' }] }],
                  },
                  {
                    id: expect.any(String),
                    content: [{ type: 'p', children: [{ text: '' }] }],
                  },
                  {
                    id: expect.any(String),
                    content: [{ type: 'p', children: [{ text: '' }] }],
                  },
                ],
                scoringStrategy: 'average',
                targeted: expect.any(Array),
                objectives: [],
                explanation: null,
              },
            ],
            transformations: [],
            previewText: '',
            targeted: expect.any(Array),
          },
        },
        objectives: expect.any(Object),
        legacyId: 'pre_course_student_survey',
        subType: 'oli_multiple_choice',
      })
    );
  });
});

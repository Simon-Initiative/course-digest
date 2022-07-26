import { convertToFormative } from '../../src/resources/feedback';
import * as DOM from '../../src/utils/dom';

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
    expect($('body', likert_scale_1_items[0]).text()).toContain(
      'Chemistry is...'
    );

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
    expect($('body', likert_scale_2_items[0]).text()).toContain(
      'I feel like I "belong" in chemistry.'
    );
    expect($('body', likert_scale_2_items[1]).text()).toContain(
      'I feel welcomed in my chemistry class.'
    );
    expect($('body', likert_scale_2_items[2]).text()).toContain(
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

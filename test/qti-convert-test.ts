import { ProjectSummary } from 'src/project';
import { processQtiFolder } from 'src/qti';
import { getDescendants } from 'src/resources/questions/common';
import { isActivity } from 'src/resources/resource';
import { toPlainText } from 'src/utils/common';

describe('QTI conversion', () => {

  // Test conversion of QTI package containing basic question types
  it('should convert sample QTI folder to set of activities', async () => {
    // Test on already-unzipped QTI package folder containing one sample
    // assessment edited to contain one of each supported question type
    const resources = await processQtiFolder(
      './test/qti/Mod2ReadingQuiz',
      {} as ProjectSummary
    );
    const activities = resources.filter(isActivity);

    expect(activities.length).toEqual(5);

    // Spot check activities and their models
    const [act1, act2, act3, act4, act5] = activities;
    const [m1, m2, m3, m4, m5] = activities.map((a) => a.content as any);

    // Multiple Choice
    expect(act1.subType).toEqual('oli_multiple_choice');
    expect(toPlainText(m1.stem.content)).toEqual('1.000 mm = ________');
    expect(m1.choices.length).toEqual(4);
    const correctId = m1.choices[1].id;
    expect(m1.authoring.parts[0].responses.length).toEqual(2);
    const correctResponse1 = m1.authoring.parts[0].responses[0];
    expect(correctResponse1.rule).toEqual(`input like {${correctId}}`);
    expect(correctResponse1.score).toEqual(1);

    // CATA
    expect(act2.subType).toEqual('oli_check_all_that_apply');
    const choices = m2.choices.map((c: any) => c.id);
    expect(choices.length).toEqual(4);
    //     check involved rule for CATA correctness
    const cataRule = m2.authoring.parts[0].responses[0].rule;
    expect(cataRule).toEqual(
      `(!(input like {${choices[2]}})) && ((!(input like {${choices[1]}})) && (input like {${choices[3]}} && (input like {${choices[0]}})))`
    );

    // short answer numeric with dynamic variables
    expect(act3.subType).toEqual('oli_short_answer');
    expect(toPlainText(m3.stem.content)).toContain('@@x@@');
    expect(toPlainText(m3.stem.content)).toContain('@@y@@');
    expect(m3.authoring.transformations.length).toEqual(1);
    expect(m3.authoring.transformations[0].operation).toEqual(
      'variable_substitution'
    );
    expect(m3.authoring.transformations[0].data[0].expression).toEqual(
      expect.stringContaining('const x = OLI.random(30.0, 40.0, 1);')
    );
    expect(m3.authoring.parts[0].responses[0].rule).toEqual(
      'input = {@@answer@@}'
    );

    // dropdown question
    expect(act4.subType).toEqual('oli_multi_input');
    //    make sure we defined input and inserted inputref
    expect(m4.inputs.length).toEqual(1);
    expect(m4.inputs[0].id).toEqual('a');
    const inputRefs = getDescendants(m4.stem.content, 'input_ref');
    expect(inputRefs.length).toEqual(1);
    expect(inputRefs[0].id).toEqual('a');

    // short answer numeric
    expect(act5.subType).toEqual('oli_short_answer');
    //   handles special case: answer with equal upper and lower bounds
    expect(m5.authoring.parts[0].responses[0].rule).toEqual('input = {500.0}');
  });

  
});

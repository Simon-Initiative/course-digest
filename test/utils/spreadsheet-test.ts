import * as Magic from 'src/utils/spreadsheet';

describe('magic spreadsheet processing', () => {
  test('should process full chemistry workbook', () => {
    const result = Magic.process('./test/utils/chemistry.xlsx');

    expect(result?.skills.length).toEqual(239);
    expect(result?.objectives.length).toBeGreaterThan(82);
    expect(result?.attachments.length).toEqual(3786);

    const firstSkill = result?.skills[0] as Magic.SpreadsheetSkill;
    expect(firstSkill.id).toEqual('solid_liquid_gas');
    expect(firstSkill.title).toEqual(
      'Distinguish between solid, liquids, and gases.'
    );
    expect(firstSkill.parameters).toEqual({
      p: 0.7,
      gamma0: 0.8,
      gamma1: 0.9,
      lambda0: 1,
    });

    const specificAttachment = result
      ?.attachments[25] as Magic.SpreadsheetAttachment;
    expect(specificAttachment.resourceId).toEqual('prop_matter_pooled_quiz');
    expect(specificAttachment.questionId).toEqual(
      'solid_liquid_gasAndplasma_pool_v1'
    );
    expect(specificAttachment.partId).toEqual('one');
    expect(specificAttachment.skillIds).toEqual(['solid_liquid_gas', 'plasma']);

    const specificObjective = result?.objectives.find(
      (o) => o.id === 'describe_matter'
    ) as Magic.SpreadsheetObjective;
    expect(specificObjective.title).toEqual(
      'Describe the four states of matter.'
    );
    expect(specificObjective.parameters).toEqual({
      lowOpportunity: false,
      minPractice: 2,
      lowCutoff: 1.5,
      moderateCutoff: 2.5,
    });

    expect(specificObjective.skillIds).toEqual([
      'solid_liquid_gas',
      'plasma',
      'conservation_matter',
    ]);
  });

  test('should fail when encountering a badly formed workbook', () => {
    expect(Magic.process('./test/utils/bad.xlsx')).toBeNull();
  });
});

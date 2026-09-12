import * as XLSX from 'xlsx';
import * as tmp from 'tmp';
import { applyMagicSpreadsheet } from 'src/convert';
import { MediaSummary } from 'src/media';
import { ProjectSummary } from 'src/project';
import { Pool } from 'src/resources/pool';
import { Activity, TorusResource } from 'src/resources/resource';

const mediaSummary: MediaSummary = {
  mediaItems: {},
  missing: [],
  urlPrefix: '',
  downloadRemote: false,
  flattenedNames: {},
};

const projectSummary = new ProjectSummary('', '', '', mediaSummary);

const skill = (id: string): TorusResource =>
  ({
    type: 'Objective',
    id,
    legacyPath: '',
    legacyId: id,
    originalId: id,
    originalType: 'skill',
    parameters: {},
    title: id,
    tags: [],
    unresolvedReferences: [],
    content: {},
    objectives: [],
    warnings: [],
  } as TorusResource);

const activity = (
  id: string,
  legacyId: string,
  partIds: string[],
  tags: string[] = []
): Activity => ({
  type: 'Activity',
  id,
  legacyPath: '',
  legacyId,
  title: id,
  tags,
  unresolvedReferences: [],
  warnings: [],
  subType: 'oli_multiple_choice',
  content: {},
  objectives: partIds.reduce((all: Record<string, string[]>, partId) => {
    all[partId] = [];
    return all;
  }, {}) as any,
});

const spreadsheet = (
  attachments: Array<[string, string | null, string | null, string]>
) => {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet([
      ['Skill', 'Title', 'p', 'gamma0', 'gamma1', 'lambda0'],
      ...attachments.map(([, , , skillId]) => [
        skillId,
        skillId,
        0.7,
        0.8,
        0.9,
        1,
      ]),
    ]),
    'Skills'
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet([
      ['test', '1'],
      ['Resource', 'Problem', 'Step', 'Skill1'],
      ...attachments,
    ]),
    'Problems'
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet([['test', '1'], ['Learning Objective']]),
    'LOs'
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet([['Learning Objective', 'Title']]),
    'LO Ref'
  );

  const file = tmp.fileSync({ postfix: '.xlsx' });
  XLSX.writeFile(workbook, file.name);
  return file;
};

describe('magic spreadsheet activity resolution', () => {
  test('uses legacy question ids as synthesized section-pool part ids', async () => {
    const converted = await new Pool(
      './test/content/x-oli-assessment2-pool/section-pool.xml',
      false
    ).convert(projectSummary);
    const pooled = converted[0] as Activity;

    expect(pooled.legacyId).toEqual('section_pool');
    expect(
      (pooled.content as any).authoring.parts.map((part: any) => part.id)
    ).toEqual(['legacy_q1', 'legacy_q2']);

    const file = spreadsheet([
      ['section_pool', 'legacy_q2', 'p1', 'second_skill'],
    ]);
    applyMagicSpreadsheet(
      [...(converted as TorusResource[]), skill('second_skill')],
      file.name
    );
    file.removeCallback();

    expect(pooled.objectives).toEqual({
      legacy_q1: [],
      legacy_q2: ['second_skill'],
    });
  });

  test('never resolves a question by an unscoped global suffix', () => {
    const intended = activity('pool-question_set', 'pool', ['other_part']);
    const unrelated = activity('unrelated-legacy_q1', 'unrelated', ['p1']);
    const file = spreadsheet([['pool', 'legacy_q1', 'p1', 'pool_skill']]);

    applyMagicSpreadsheet(
      [intended, unrelated, skill('pool_skill')],
      file.name
    );
    file.removeCallback();

    expect(intended.objectives).toEqual({ other_part: [] });
    expect(unrelated.objectives).toEqual({ p1: [] });
  });

  test('resolves question and part ordinals only within the named resource', () => {
    const first = activity(
      'argument_resource-first_question',
      'argument_resource',
      ['first_named_part']
    );
    const second = activity(
      'argument_resource-second_question',
      'argument_resource',
      ['premise', 'conclusion']
    );
    const file = spreadsheet([
      ['argument_resource', 'q2', 'p2', 'argument_skill'],
    ]);

    applyMagicSpreadsheet([first, second, skill('argument_skill')], file.name);
    file.removeCallback();

    expect(first.objectives).toEqual({ first_named_part: [] });
    expect(second.objectives).toEqual({
      premise: [],
      conclusion: ['argument_skill'],
    });
  });

  test('retains the French 1 resource-scoped ordinal repair', () => {
    const first = activity('french_activity-q12', 'french_activity', ['p1']);
    const second = activity('french_activity-q13', 'french_activity', ['p1']);
    const file = spreadsheet([
      ['french_activity', 'french_activity_q2', null, 'french_skill'],
    ]);

    applyMagicSpreadsheet([first, second, skill('french_skill')], file.name);
    file.removeCallback();

    expect(first.objectives).toEqual({ p1: [] });
    expect(second.objectives).toEqual({ p1: ['french_skill'] });
  });

  test('matches an embedded French 1 pool question within that pool', () => {
    const pooled = activity(
      'legacy_pool-q1',
      'legacy_pool',
      ['p1'],
      ['legacy_pool']
    );
    const file = spreadsheet([
      ['containing_test', 'legacy_pool_q1', null, 'pool_skill'],
    ]);

    applyMagicSpreadsheet([pooled, skill('pool_skill')], file.name);
    file.removeCallback();

    expect(pooled.objectives).toEqual({ p1: ['pool_skill'] });
  });

  test('matches a unique complete legacy question id across a containing test', () => {
    const pooled = activity(
      'source_pool-source_pool_q3',
      'source_pool',
      ['p1'],
      ['source_pool']
    );
    const file = spreadsheet([
      ['containing_test', 'source_pool_q3', null, 'pool_skill'],
    ]);

    applyMagicSpreadsheet([pooled, skill('pool_skill')], file.name);
    file.removeCallback();

    expect(pooled.objectives).toEqual({ p1: ['pool_skill'] });
  });
});

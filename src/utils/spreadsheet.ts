export type SpreadsheetSkill = {
  id: string;
  title: string;
  parameters: Record<string, number | boolean>;
};

export type SpreadsheetObjective = {
  id: string;
  title: string;
  parameters: Record<string, number | boolean>;
  skillIds: string[];
};

export type SpreadsheetAttachment = {
  resourceId: string;
  questionId: string;
  partId: string | null;
  skillIds: string[];
};

export type MagicSpreadsheet = {
  skills: SpreadsheetSkill[];
  objectives: SpreadsheetObjective[];
  attachments: SpreadsheetAttachment[];
};

import * as XLSX from 'xlsx';

// Processes the 'Magic Spreadsheet' - an Excel sheet that defines the learning
// model to a course external to the XML.  This spreadsheet has a defined structure of
// four named sheets:
//
// 'Skills' - a listing of all of the skills and their details
// 'Problems' - a definition of the mapping of skills to questions/parts
// 'LOs' - a definition of which LOs a skill belongs to
// 'LO Ref' - details of LOs
export function process(file: string): MagicSpreadsheet | null {
  const workbook = XLSX.readFile(file);
  if (isValid(workbook)) {
    return {
      skills: extractSkills(workbook),
      objectives: extractObjectives(workbook),
      attachments: extractAttachments(workbook),
    };
  }
  return null;
}

function extractSkills(wb: XLSX.WorkBook): SpreadsheetSkill[] {
  const sheet = wb.Sheets['Skills'];
  const skills: SpreadsheetSkill[] = [];

  try {
    let row = 2;
    while (true) {
      if (sheet['A' + row] === undefined) break;
      skills.push({
        id: sheet['A' + row].v,
        title: sheet['B' + row].v,
        parameters: {
          p: sheet['C' + row].v,
          gamma0: sheet['D' + row].v,
          gamma1: sheet['E' + row].v,
          lambda0: sheet['F' + row].v,
        },
      });
      row++;
    }
  } catch (e) {
    console.log('error encountered in extracting skills: ' + e);
  }
  return skills;
}

function extractObjectives(wb: XLSX.WorkBook): SpreadsheetObjective[] {
  const objectivesById = extractLORefs(wb);
  const withSkillsById = extractLOs(wb, objectivesById);
  return Object.values(withSkillsById);
}

function extractLORefs(
  wb: XLSX.WorkBook
): Record<string, SpreadsheetObjective> {
  const sheet = wb.Sheets['LO Ref'];
  const all: Record<string, SpreadsheetObjective> = {};

  try {
    let row = 2;
    while (true) {
      if (sheet['A' + row] === undefined) break;
      const id = sheet['A' + row].v;

      all[id] = {
        id,
        title: sheet['B' + row].v,
        parameters: {
          lowOpportunity: false,
          minPractice: 2,
          mediumMastery: 3.5,
          highMastery: 7.0,
        },
        skillIds: [],
      };

      row++;
    }
  } catch (e) {
    console.log('error encountered in extracting LO Refs: ' + e);
  }
  return all;
}

function extractLOs(
  wb: XLSX.WorkBook,
  all: Record<string, SpreadsheetObjective>
): Record<string, SpreadsheetObjective> {
  const sheet = wb.Sheets['LOs'];
  try {
    let row = 3;
    while (true) {
      if (sheet['A' + row] === undefined) break;
      const id = sheet['A' + row].v;

      if (all[id] === undefined) {
        // This handles the case where an objective is referenced *only* in the LOs sheet and
        // not in the LO Ref sheet.  That means we will not have a title for this objective. Hopefully,
        // this is an objective defined in the XML of the course.
        all[id] = {
          id,
          title: 'Missing title',
          parameters: {
            lowOpportunity: false,
            minPractice: 2,
            mediumMastery: 3.5,
            highMastery: 7.0,
          },
          skillIds: [],
        };
      }

      all[id].parameters = {
        lowOpportunity: sheet['B' + row].v !== 'N',
        minPractice: sheet['C' + row].v,
        mediumMastery: sheet['D' + row].v,
        highMastery: sheet['E' + row].v,
      };
      all[id].skillIds = ['F', 'G', 'H', 'I', 'J', 'K']
        .map((col: string) => sheet[col + row])
        .filter((s) => s !== undefined)
        .map((s) => s.v);
      row++;
    }
  } catch (e) {
    console.log('error encountered in extracting LO Refs: ' + e);
  }
  return all;
}

function extractAttachments(wb: XLSX.WorkBook): SpreadsheetAttachment[] {
  const sheet = wb.Sheets['Problems'];
  const all: SpreadsheetAttachment[] = [];

  try {
    let row = 3;
    while (true) {
      if (sheet['A' + row] === undefined) break;
      all.push({
        resourceId: sheet['A' + row].v,
        questionId: sheet['B' + row].v,
        partId: sheet['C' + row] === undefined ? null : sheet['C' + row].v,
        skillIds: ['D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M']
          .map((col: string) => sheet[col + row])
          .filter((s) => s !== undefined)
          .map((s) => s.v),
      });
      row++;
    }
  } catch (e) {
    console.log('error encountered in extracting attachments: ' + e);
  }
  return all;
}

function isValid(wb: XLSX.WorkBook) {
  return (
    wb.Sheets['Skills'] &&
    wb.Sheets['Problems'] &&
    wb.Sheets['LOs'] &&
    wb.Sheets['LO Ref']
  );
}

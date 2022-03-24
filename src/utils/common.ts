export type ItemReference = {
  id: string;
};

export type MissingResource = {
  type: 'MissingResource';
  id: string;
};

export function replaceAll(s: string, t: string, w: string) {
  const re = new RegExp(t, 'g');
  return s.replace(re, w);
}

// Take an array of functions that return promises and
// execute them serially, resolving an array of their
// resolutions
export const executeSerially = (funcs: any) =>
  funcs.reduce(
    (promise: any, func: any) =>
      promise.then((result: any) =>
        func().then(Array.prototype.concat.bind(result))
      ),
    Promise.resolve([])
  );

export enum LegacyTypes {
  package = 'x-oli-package',
  workbook_page = 'x-oli-workbook_page',
  assessment2 = 'x-oli-assessment2',
  inline = 'x-oli-inline-assessment',
  feedback = 'x-oli-feedback',
  embed_activity = 'x-oli-embed-activity',
  organization = 'x-oli-organization',
  learning_objective = 'x-oli-objective',
  learning_objectives = 'x-oli-learning_objectives',
  skill = 'x-oli-skill',
  skills_model = 'x-oli-skills_model',
  webcontent = 'x-oli-webcontent',
  assessment2_pool = 'x-oli-assessment2-pool',
}

export function guid() {
  return `${Math.floor(Math.random() * Math.floor(Math.pow(2, 32) - 1))}`;
}

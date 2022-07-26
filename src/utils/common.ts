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

export function decodeEntities(encodedString: string) {
  const translate_re = /&(nbsp|amp|quot|lt|gt);/g;
  const translate = {
    nbsp: ' ',
    amp: '&',
    quot: '"',
    lt: '<',
    gt: '>',
  };
  return encodedString
    .replace(translate_re, (match, entity) => {
      return (translate as any)[entity];
    })
    .replace(/&#(\d+);/gi, function (match, numStr) {
      const num = parseInt(numStr, 10);
      return String.fromCharCode(num);
    });
}

/**
 * Returns the given value if it is not null or undefined. Otherwise, it returns
 * the default value. The return value will always be a defined value of the type given
 * @param value
 * @param defaultValue
 */
export const valueOr = <T>(value: T | null | undefined, defaultValue: T): T =>
  value === null || value === undefined ? defaultValue : value;

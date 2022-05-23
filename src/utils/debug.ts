import * as util from 'util';

export const inspect = (...args: any[]) =>
  console.log(util.inspect(args, { showHidden: true, depth: null }));

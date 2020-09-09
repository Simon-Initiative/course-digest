
export type ItemReference = {
  id: string,
};

// Take an array of functions that return promises and
// execute them serially, resolving an array of their
// resolutions
export const executeSerially = (funcs: any) =>
  funcs.reduce(
    (promise: any, func: any) =>
      promise.then((result: any) =>
      func().then(Array.prototype.concat.bind(result))),
    Promise.resolve([]));

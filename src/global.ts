import { inspect as utilInspect, InspectOptions } from 'util';

// expose globally accessible inspect function for console log debugging
declare global {
  function inspect(object: any): void;
}

global.inspect = (object: any, options: InspectOptions = { depth: null }) =>
  console.log(utilInspect(object, options));

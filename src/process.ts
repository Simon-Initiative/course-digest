import { TorusResource } from './resources/resource';
import { executeSerially } from './utils/common';
import { ResourceMap } from './utils/resource_mapping';

// Recursive helper to process a collection of resources.
// Resources can reference other resources in a chain (e.g. Workbook page ->
// Assessment -> Pool) so this function operates on resource conversion
// asynchronously, in batches, and then recursively follows
// references that it finds in each batch.  We need to be careful
// to avoid circular references and processing duplicates so we track the references
// that we have seen along the way.
function innerProcess<T>(
  processFunc: (file: string) => Promise<T | string>,
  resolve: any, reject: any,
  itemReferences: string[],
  resourceMap: ResourceMap,
  seenReferences: { [index: string] : boolean },
  all: TorusResource[]) {

  const doSummary = (ref: string) => {
    const path = resourceMap[ref];
    seenReferences[ref] = true;

    if (path !== undefined) {
      return () => processFunc(path);
    }
    return () => Promise.resolve({ type: 'MissingResource', id: ref });
  };

  const summarizers = itemReferences.map((ref: string) => doSummary(ref));

  executeSerially(summarizers)
  .then((results: TorusResource[]) => {

    // From this round of results, collect any new references that
    // we need to follow
    const toFollow: string[] = [];
    results.forEach((r: TorusResource) => {
      all.push(r);

      if (r.type === 'Summary') {
        const ids = (r as any).found();
        ids.forEach((i: any) => {
          if (seenReferences[i.id] === undefined) {
            toFollow.push(i.id);
            seenReferences[i.id] = true;
          }
        });
        
      } else {
      
        if (r.unresolvedReferences !== undefined) {
          console.log('Unresolved');
          console.log(r.unresolvedReferences);
          r.unresolvedReferences.forEach((ref: string) => {
            if (seenReferences[ref] === undefined) {
              toFollow.push(ref);
              seenReferences[ref] = true;
            }
          });
        }
      }
    });

    // See if we are done or if there is another round of references
    // to process
    if (toFollow.length === 0) {
      resolve(all);
    } else {
      innerProcess(processFunc, resolve, reject, toFollow, resourceMap, seenReferences, all);
    }

  });
}

export function processResources<T>(
  processFunc: (file: string) => Promise<T | string>,
  itemReferences: string[], resourceMap: ResourceMap) : Promise<TorusResource[]> {

  return new Promise((resolve, reject) => {
    innerProcess(processFunc, resolve, reject, itemReferences, resourceMap, {}, []);
  });

}
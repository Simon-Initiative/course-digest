import { TorusResource } from './resources/resource';
import { executeSerially, ItemReference } from './utils/common';
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
  itemReferences: ItemReference[],
  resourceMap: ResourceMap,
  seenReferences: { [index: string] : boolean },
  all: TorusResource[]) {

  const doSummary = (ref: ItemReference) => {
    const path = resourceMap[ref.id];
    seenReferences[ref.id] = true;

    if (path !== undefined) {
      return () => processFunc(path);
    }
    return () => Promise.resolve({ type: 'MissingResource', id: ref.id });
  };

  const summarizers = itemReferences.map((ref: ItemReference) => doSummary(ref));

  executeSerially(summarizers)
  .then((results: TorusResource[]) => {

    // From this round of results, collect any new references that
    // we need to follow
    const toFollow: ItemReference[] = [];
    results.forEach((r: TorusResource) => {
      all.push(r);

      if ((r as any).found !== undefined) {
        (r as any).found().forEach((ref: ItemReference) => {
          const id = ref.id;
          if (seenReferences[id] === undefined) {
            toFollow.push(ref);
            seenReferences[id] = true;
          }
        });
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
  itemReferences: ItemReference[], resourceMap: ResourceMap) : Promise<TorusResource[]> {

  return new Promise((resolve, reject) => {
    innerProcess(processFunc, resolve, reject, itemReferences, resourceMap, {}, []);
  });

}
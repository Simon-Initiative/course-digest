import { Summary, ResourceType } from './resources/resource';
import { determineResourceType, create } from './resources/create';

export function summarize(file: string): Promise<Summary | string> {

  return new Promise((resolve, reject) => {
    determineResourceType(file)
    .then((t: ResourceType) => {
      resolve(create(t).summarize(file));
    });
  });
}

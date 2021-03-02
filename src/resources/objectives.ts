import * as Histogram from '../utils/histogram';
import { ItemReference } from '../utils/common';
import { Resource, TorusResource, Summary } from './resource';
import * as XML from '../utils/xml';

export class Objectives extends Resource {

  restructure($: any) : any {

  }

  translate(xml: string, $: any) : Promise<(TorusResource | string)[]> {

    const objectives : TorusResource[] = [];

    $('objective').each((i: any, elem: any) => {
      const id = $(elem).attr('id');
      const title = $(elem).text().trim();

      objectives.push({
        type: 'Objective',
        id,
        originalFile: '',
        title,
        tags: [],
        unresolvedReferences: [],
        content: {},
        objectives: [],
      } as TorusResource);
    });

    return Promise.resolve(objectives as TorusResource[]);
    
  }

  summarize(file: string): Promise<string | Summary> {

    const foundIds: ItemReference[] = [];
    const summary : Summary = {
      type: 'Summary',
      subType: 'Objectives',
      elementHistogram: Histogram.create(),
      id: '',
      found: () => foundIds,
    };

    return new Promise((resolve, reject) => {

      XML.visit(file, (tag: string, attrs: Object) => {

        Histogram.update(summary.elementHistogram, tag, attrs);

      })
      .then((result) => {
        resolve(summary);
      })
      .catch(err => reject(err));
    });
  }

}


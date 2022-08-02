import * as Histogram from 'src/utils/histogram';
import { ItemReference } from 'src/utils/common';
import { Resource, TorusResource, Summary } from './resource';
import * as XML from 'src/utils/xml';

export class Objectives extends Resource {
  restructure(_$: any): any {
    return;
  }

  translate(xml: string, $: any): Promise<(TorusResource | string)[]> {
    const objectives: TorusResource[] = [];
    const map: any = {};

    let parentId = '';

    $('objectives').each((i: any, elem: any) => {
      parentId = $(elem).attr('id');
    });

    $('objective').each((i: any, elem: any) => {
      const id = $(elem).attr('id');
      const title = $(elem).text().trim();

      const o = {
        type: 'Objective',
        id,
        parentId,
        originalFile: '',
        title,
        tags: [],
        unresolvedReferences: [],
        content: {},
        objectives: [],
      } as TorusResource;

      // parentId is necessary because it makes the id truly global
      map[`${o.id}-${parentId}`] = o;

      objectives.push(o);
    });

    $('skillref').each((i: any, elem: any) => {
      const id = $(elem).attr('idref');
      const actualParent = $(elem).parent().attr('idref') + '-' + parentId;
      const o = map[actualParent];
      o.objectives.push(id);
    });

    return Promise.resolve(objectives as TorusResource[]);
  }

  summarize(): Promise<string | Summary> {
    const foundIds: ItemReference[] = [];
    const summary: Summary = {
      type: 'Summary',
      subType: 'Objectives',
      elementHistogram: Histogram.create(),
      id: '',
      found: () => foundIds,
    };

    return new Promise((resolve, reject) => {
      XML.visit(this.file, (tag: string, attrs: Record<string, unknown>) => {
        Histogram.update(summary.elementHistogram, tag, attrs);
      })
        .then((_result) => {
          resolve(summary);
        })
        .catch((err) => reject(err));
    });
  }
}

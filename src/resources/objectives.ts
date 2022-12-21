import * as Histogram from 'src/utils/histogram';
import { ItemReference } from 'src/utils/common';
import { Resource, TorusResource, Summary } from './resource';
import * as XML from 'src/utils/xml';

function attr($: any, e: any, name: string, defaultValue: any) {
  if ($(e).attr(name) !== undefined && $(e).attr(name) !== null) {
    $(e).attr(name);
  }
  return defaultValue;
}

export function defaultParameters() {
  return {
    category: null,
    process: null,
    lowOppportunity: false,
    minPractice: 2,
    mediumMastery: 3.5,
    highMastery: 7
  };
}

export function createObjective(file: string, id: string, parentId: string | null, title: string, parameters: any) {
  return {
    type: 'Objective',
    id,
    parentId,
    originalType: 'objective',
    parameters,
    legacyPath: file,
    legacyId: id,
    title,
    tags: [],
    unresolvedReferences: [],
    content: {},
    objectives: [],
    warnings: [],
  } as TorusResource;
}

export class Objectives extends Resource {
  translate($: any): Promise<(TorusResource | string)[]> {
    const objectives: TorusResource[] = [];
    const map: any = {};

    let parentId = '';

    $('objectives').each((i: any, elem: any) => {
      parentId = $(elem).attr('id');
    });

    $('objective').each((i: any, elem: any) => {
      const id = $(elem).attr('id');
      const title = $(elem).text().trim();

      const o = createObjective(this.file, id, parentId, title, {
        category: attr($, elem, 'category', null),
        process: attr($, elem, 'process', null),
        lowOppportunity: attr($, elem, 'low_opportunity', false),
        minPractice: attr($, elem, 'min_practice', 2),
        mediumMastery: attr($, elem, 'medium_mastery', 3.5),
        highMastery: attr($, elem, 'high_mastery', 7),
      });

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

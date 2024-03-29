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

export class Skills extends Resource {
  translate($: any): Promise<(TorusResource | string)[]> {
    const objectives: TorusResource[] = [];
    let parentId = '';
    $('skills').each((i: any, elem: any) => {
      parentId = $(elem).attr('id');
    });

    $('skill').each((i: any, elem: any) => {
      const id = $(elem).attr('id');
      const title = $(elem).text().trim();

      const o = {
        type: 'Objective',
        id,
        parentId,
        originalType: 'skill',
        parameters: {
          p: attr($, elem, 'p', 0.7),
          gamma0: attr($, elem, 'gamma0', 0.7),
          gamma1: attr($, elem, 'gamma1', 0.7),
          lambda0: attr($, elem, 'lambda0', 1.0),
        },
        legacyPath: this.file,
        legacyId: id,
        title,
        tags: [],
        unresolvedReferences: [],
        children: [],
        content: {},
        objectives: [],
        warnings: [],
      } as TorusResource;

      objectives.push(o);
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

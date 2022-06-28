import { visit } from '../utils/xml';
import * as Histogram from '../utils/histogram';
import { Resource, TorusResource, Summary } from './resource';
import * as Formative from './formative';
import * as Summative from './summative';
import * as XML from '../utils/xml';
import { processCodeblock, processVariables } from './common';

export class Pool extends Resource {
  restructurePreservingWhitespace($: any): any {
    processCodeblock($);
    processVariables($);
  }

  restructure($: any): any {
    Summative.convertToFormative($);
    Formative.performRestructure($);
  }

  translate(xml: string, _$: any): Promise<(TorusResource | string)[]> {
    return new Promise((resolve, _reject) => {
      XML.toJSON(xml, { p: true, em: true, li: true, td: true }).then(
        (r: any) => {
          const items: any = [];

          const legacyId = r.children[0].id;
          r.children.forEach((item: any) => {
            if (item.type === 'pool') {
              const tagId = item.id;

              item.children.forEach((c: any) => {
                if (c.type !== 'title' && c.type !== 'content') {
                  const subType = Formative.determineSubType(c);
                  const pooledActivity = Formative.toActivity(
                    c,
                    subType,
                    legacyId
                  );
                  pooledActivity.tags = [tagId];
                  pooledActivity.scope = 'banked';
                  items.push(pooledActivity);
                }
              });
            }
          });

          resolve(items);
        }
      );
    });
  }
  summarize(file: string): Promise<string | Summary> {
    const summary: Summary = {
      type: 'Summary',
      subType: 'SummativePool',
      elementHistogram: Histogram.create(),
      id: '',
      found: () => [],
    };

    return new Promise((resolve, reject) => {
      visit(file, (tag: string, attrs: Record<string, unknown>) => {
        Histogram.update(summary.elementHistogram, tag, attrs);

        if (tag === 'pool') {
          summary.id = (attrs as any)['id'];
        }
      })
        .then((_result) => {
          resolve(summary);
        })
        .catch((err) => reject(err));
    });
  }
}

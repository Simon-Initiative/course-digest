import { visit } from 'src/utils/xml';
import * as Histogram from 'src/utils/histogram';
import { Resource, TorusResource, Summary } from './resource';
import * as Formative from './formative';
import * as Summative from './summative';
import * as XML from 'src/utils/xml';
import { processCodeblock, processVariables } from './common';
import { ProjectSummary } from 'src/project';

export class Pool extends Resource {
  restructurePreservingWhitespace($: any): any {
    processCodeblock($);
    processVariables($);
  }

  restructure($: any): any {
    Summative.convertToFormative($);
    Formative.performRestructure($);
  }

  translate(
    $: any,
    projectSummary: ProjectSummary
  ): Promise<(TorusResource | string)[]> {
    this.restructure($);
    const xml = $.html();
    return new Promise((resolve, _reject) => {
      XML.toJSON(xml, projectSummary, {
        p: true,
        em: true,
        li: true,
        td: true,
      }).then((r: any) => {
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
                  legacyId,
                  this.file,
                  []
                );
                pooledActivity.tags = [tagId];
                pooledActivity.scope = 'banked';
                items.push(pooledActivity);
              }
            });
          }
        });

        resolve(items);
      });
    });
  }
  summarize(): Promise<string | Summary> {
    const summary: Summary = {
      type: 'Summary',
      subType: 'SummativePool',
      elementHistogram: Histogram.create(),
      id: '',
      found: () => [],
    };

    return new Promise((resolve, reject) => {
      visit(this.file, (tag: string, attrs: Record<string, unknown>) => {
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

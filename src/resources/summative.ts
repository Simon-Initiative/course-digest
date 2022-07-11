import { visit } from '../utils/xml';
import * as Histogram from '../utils/histogram';
import { ItemReference } from '../utils/common';
import { Resource, TorusResource, Summary, Page } from './resource';
import { processCodeblock } from './common';
import * as Formative from './formative';
import * as DOM from '../utils/dom';
import * as XML from '../utils/xml';

export function convertToFormative($: any) {
  $('multiple_choice').each((i: any, item: any) => {
    DOM.moveAttrToChildren($, item, 'select', 'input');
    DOM.moveAttrToChildren($, item, 'shuffle', 'input');
  });

  $('text').each((i: any, item: any) => {
    // have to move all "whitespace" and "case_sensitive" down to inputs
    DOM.moveAttrToChildren($, item, 'whitespace', 'input');
    DOM.moveAttrToChildren($, item, 'case_sensitive', 'input');
  });

  DOM.rename($, 'multiple_choice input', 'mc_temp');
  DOM.rename($, 'ordering input', 'o_temp');
  DOM.rename($, 'short_answer input', 'sa_temp');
  DOM.rename($, 'fill_in_the_blank input', 'f_temp');
  DOM.rename($, 'numeric input', 'n_temp');
  DOM.rename($, 'text input', 't_temp');
  DOM.rename($, 'essay input', 'e_temp');
  DOM.rename($, 'image_hotspot input', 'i_temp');

  DOM.rename($, 'multiple_choice', 'question');
  DOM.rename($, 'ordering', 'question');
  DOM.rename($, 'short_answer', 'question');
  DOM.rename($, 'fill_in_the_blank', 'question');
  DOM.rename($, 'numeric', 'question');
  DOM.rename($, 'text', 'question');
  DOM.rename($, 'essay', 'question');
  DOM.rename($, 'image_hotspot', 'question');

  DOM.rename($, 'mc_temp', 'multiple_choice');
  DOM.rename($, 'o_temp', 'ordering');
  DOM.rename($, 'sa_temp', 'short_answer');
  DOM.rename($, 'f_temp', 'fill_in_the_blank');
  DOM.rename($, 'n_temp', 'numeric');
  DOM.rename($, 't_temp', 'text');
  DOM.rename($, 'e_temp', 'short_answer');
  DOM.rename($, 'i_temp', 'image_hotspot');
}

export class Summative extends Resource {
  restructurePreservingWhitespace($: any): any {
    processCodeblock($);
  }

  restructure($: any): any {
    // We simplify the handling of the differing Summative and Formative models
    // by converting the more restrictive Summative to the more flexible Formative
    // model.  This alllows then one set of restructuring code to exist.
    convertToFormative($);
    Formative.performRestructure($);
  }

  translate(xml: string, $: any): Promise<(TorusResource | string)[]> {
    const page: Page = {
      type: 'Page',
      id: '',
      originalFile: '',
      title: '',
      tags: [],
      unresolvedReferences: [],
      content: {},
      isGraded: true,
      objectives: [],
    };

    $('activity_placeholder').each((i: any, elem: any) => {
      page.unresolvedReferences.push($(elem).attr('idref'));
    });

    $('a').each((i: any, elem: any) => {
      const idref = $(elem).attr('idref');
      if (idref !== undefined && idref !== null) {
        page.unresolvedReferences.push(idref);
      }
    });

    return new Promise((resolve, _reject) => {
      XML.toJSON(xml, { p: true, em: true, li: true, td: true }).then(
        (r: any) => {
          const legacyId = r.children[0].id;

          const { model, items, unresolvedReferences, title } =
            Formative.processAssessmentModel(legacyId, r.children[0].children);

          page.id = r.children[0].id;
          page.objectives = r.children[0].children[0].children.map(
            (o: any) => o.idref
          );
          page.content = { model };
          page.isGraded = true;
          page.title = title;
          page.unresolvedReferences = unresolvedReferences;

          resolve([page, ...items]);
        }
      );
    });
  }

  summarize(): Promise<string | Summary> {
    const foundIds: ItemReference[] = [];
    const summary: Summary = {
      type: 'Summary',
      subType: 'Summative',
      elementHistogram: Histogram.create(),
      id: '',
      found: () => foundIds,
    };

    return new Promise((resolve, reject) => {
      visit(this.file, (tag: string, attrs: Record<string, unknown>) => {
        Histogram.update(summary.elementHistogram, tag, attrs);

        if (tag === 'assessment') {
          summary.id = (attrs as any)['id'];
        }
        if (tag === 'poolref') {
          foundIds.push({ id: (attrs as any)['idref'] });
        }
      })
        .then((_result) => {
          resolve(summary);
        })
        .catch((err) => reject(err));
    });
  }
}

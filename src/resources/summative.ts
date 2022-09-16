import { visit } from 'src/utils/xml';
import * as Histogram from 'src/utils/histogram';
import { ItemReference } from 'src/utils/common';
import { Resource, TorusResource, Summary, Page } from './resource';
import { processCodeblock, flagStandardContentWarnigns } from './common';
import * as Formative from './formative';
import * as DOM from 'src/utils/dom';
import * as XML from 'src/utils/xml';

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

  // For these three types, add an attr to preserve their original types, as there can
  // be cases where will not have a input level element
  $('fill_in_the_blank').each((i: any, item: any) =>
    $(item).attr('originalType', 'fill_in_the_blank')
  );
  $('numeric').each((i: any, item: any) =>
    $(item).attr('originalType', 'numeric')
  );
  $('text').each((i: any, item: any) => $(item).attr('originalType', 'text'));

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

  flagContentWarnigns($: any, page: Page) {
    flagStandardContentWarnigns($, page);
  }

  restructure($: any): any {
    // We simplify the handling of the differing Summative and Formative models
    // by converting the more restrictive Summative to the more flexible Formative
    // model.  This allows then one set of restructuring code to exist.
    convertToFormative($);
    Formative.performRestructure($);
  }

  translate($: any): Promise<(TorusResource | string)[]> {
    const page: Page = {
      type: 'Page',
      id: '',
      legacyPath: this.file,
      legacyId: '',
      title: '',
      tags: [],
      unresolvedReferences: [],
      content: {},
      isGraded: true,
      isSurvey: false,
      objectives: [],
      warnings: [],
    };

    this.flagContentWarnigns($, page);
    this.restructure($);
    const xml = $.html();

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
            Formative.processAssessmentModel(
              legacyId,
              r.children[0].children,
              this.file
            );

          page.id = r.children[0].id;
          page.legacyId = r.children[0].id;
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

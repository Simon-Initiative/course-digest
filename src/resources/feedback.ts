import { visit } from 'src/utils/xml';
import * as Histogram from 'src/utils/histogram';
import { Resource, TorusResource, Summary } from './resource';
import * as DOM from '../utils/dom';
import * as XML from '../utils/xml';
import { guid } from 'src/utils/common';
import * as Formative from './formative';
import { valueOr } from 'src/utils/common';

export function convertToFormative($: cheerio.Root) {
  $('multiple_choice').each((_i, item: cheerio.TagElement) => {
    const question_id = valueOr($(item).attr('id'), guid());

    // gather all choices and wrap in multiple choice tag
    $(item).append(`<multiple_choice id="${guid()}"></multiple_choice>`);
    $('choice', item).each((i: number, el) => {
      const value = $(el).attr('id') as string;
      $(el).attr('value', value);
      $(el).removeAttr('id');

      $('multiple_choice', item).append($(el));
    });

    // generate missing part and responses, expected for all torus activities
    // for feedback multiple choice, we set the first choice as correct
    const buildParagraph = (text = '') => $(`<p id="${guid()}">${text}</p>`);
    const responses = $('choice', item)
      .map((i: number, c: cheerio.Element) => {
        const first = i === 0;
        return $(
          `<response match="${$(c).attr('value')}" score="${
            first ? '1' : '0'
          }"></response>`
        ).append($(buildParagraph(first ? 'Correct' : 'Incorrect')));
      })
      .toArray()
      .join('');

    $(item).append($(`<part id="${guid()}"></part>`).append(responses));

    $('prompt', item).each((i, p: cheerio.TagElement) => (p.tagName = 'body'));

    // rename this outer tag to question
    item.tagName = 'question';

    // ensure this question has an id
    $(item).attr('id', question_id);
  });

  $('open_response').each((_i, item: cheerio.TagElement) => {
    const question_id = valueOr($(item).attr('id'), guid());
    const short_answer_id = guid();
    $(item).append(`<short_answer id="${short_answer_id}"></short_answer>`);
    $(item).append(
      $(`<part id="${guid()}"></part>`).append(
        $(`<response match="*" score="1" input="${short_answer_id}"/>`)
      )
    );

    $('prompt', item).each((i, p: cheerio.TagElement) => (p.tagName = 'body'));

    item.tagName = 'question';

    // ensure this question has an id
    $(item).attr('id', question_id);
  });

  $('likert,likert_series').each((_i, item: cheerio.TagElement) => {
    const question_id = valueOr($(item).attr('id'), guid());

    $('prompt', item).each((i, p: cheerio.TagElement) => (p.tagName = 'body'));

    item.tagName = 'question';

    // ensure this question has an id
    $(item).attr('id', question_id);
  });

  DOM.rename($, 'questions', 'page');
  $('page').attr('id', guid());

  DOM.remove($, 'feedback description');
  DOM.rename($, 'feedback', 'assessment');
}

export class Feedback extends Resource {
  restructure($: any): any {
    // We simplify the handling of Feedback by converting it to the Formative
    // model.  This allows then one set of restructuring code to exist.
    convertToFormative($);
    Formative.performRestructure($);
  }

  translate(
    xml: string,
    _$: cheerio.Root
  ): Promise<(TorusResource | string)[]> {
    return new Promise((resolve, _reject) =>
      XML.toJSON(xml, { p: true, em: true, li: true, td: true }).then(
        (r: any) => {
          const legacyId = r.children[0].id;
          const { items } = Formative.processAssessmentModel(
            legacyId,
            r.children[0].children
          );

          resolve(items);
        }
      )
    );
  }

  summarize(): Promise<string | Summary> {
    const summary: Summary = {
      type: 'Summary',
      subType: 'Feedback',
      elementHistogram: Histogram.create(),
      id: '',
      found: () => [],
    };

    return new Promise((resolve, reject) => {
      visit(this.file, (tag: string, attrs: Record<string, unknown>) => {
        Histogram.update(summary.elementHistogram, tag, attrs);
        if (tag === 'feedback') {
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

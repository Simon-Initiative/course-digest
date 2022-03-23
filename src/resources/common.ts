import { ItemReference } from '../utils/common';
import * as Histogram from '../utils/histogram';
import * as DOM from '../utils/dom';

export interface HasReferences {
  found: () => ItemReference[];
}

export interface HasHistogram {
  elementHistogram: Histogram.ElementHistogram;
}

export function processCodeblock($: any) {
  $('codeblock').each((i: any, item: any) => {
    const h = $(item).html();
    if (h.startsWith('<![CDATA[') && h.endsWith(']]>')) {
      const html = h
        .substring(9, h.length - 3)
        .split('\n')
        .map((r: any) => '<code_line><![CDATA[' + r + ']]></code_line>')
        .reduce((s: string, e: string) => s + e);

      $(item).html(html);
    } else {
      const html = h
        .split('\n')
        .map((r: any) => '<code_line>' + r + '</code_line>')
        .reduce((s: string, e: string) => s + e);

      $(item).html(html);
    }
  });
}

export function standardContentManipulations($: any) {
  // Convert all inline markup elements to <em> tags, this
  // greatly simplifies downstream conversionto JSON
  $('var').each((i: any, item: any) => $(item).attr('style', 'code'));
  $('term').each((i: any, item: any) => $(item).attr('style', 'code'));
  $('sub').each((i: any, item: any) => $(item).attr('style', 'sub'));
  $('sup').each((i: any, item: any) => $(item).attr('style', 'sup'));
  DOM.rename($, 'var', 'em');
  DOM.rename($, 'term', 'em');
  DOM.rename($, 'sub', 'em');
  DOM.rename($, 'sup', 'em');

  // <code> is a mixed element, we only want to translate the inline <code>
  // instances to <em> elements.  The block level <code> will get converted
  // to Torus code model elements.
  ['p', 'li', 'td', 'choice', 'hint', 'feedback'].forEach((e) => {
    $(`${e} code`).each((i: any, item: any) => $(item).attr('style', 'code'));
    DOM.rename($, `${e} code`, 'em');
  });

  // Certain constructs have to be converted into an alternate
  // representation for how Torus supports them
  DOM.flattenNestedSections($);
  DOM.removeSelfClosing($);
  DOM.mergeCaptions($);
  DOM.rename($, 'image', 'img');
  DOM.rename($, 'codeblock', 'code');
  DOM.renameAttribute($, 'code', 'syntax', 'language');
  DOM.rename($, 'link', 'a');

  // Certain elements are not currently (and some may never be) supported
  // in Torus, so we remove them.  In this respect, OLI course conversion
  // is lossy wrt specific element constructs.
  $('popout').remove();
  $('sym').remove();
  $('p img').remove();
  $('link img').remove();
  $('applet').remove();
  $('director').remove();
  $('flash').remove();
  $('mathematica').remove();
  $('panopto').remove();
  $('unity').remove();
  $('video').remove();
  $('vimeo').remove();
  $('cite').remove();

  DOM.stripElement($, 'li p');
  DOM.stripElement($, 'p quote');
  DOM.stripElement($, 'p formula');
  DOM.stripElement($, 'materials material');
  DOM.stripElement($, 'materials');
  DOM.stripElement($, 'anchor');
  $('pullout title').remove();
  DOM.stripElement($, 'pullout');

  $('p title').remove();
  $('ol title').remove();
  $('ul title').remove();

  $('dl title').remove();
  DOM.rename($, 'dd', 'li');
  DOM.rename($, 'dt', 'li');
  DOM.rename($, 'dl', 'ul');

  DOM.rename($, 'quote', 'blockquote');
}

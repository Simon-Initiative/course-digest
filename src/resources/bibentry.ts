import { guid } from 'src/utils/common';
import * as path from 'path';
import Ajv from 'ajv';
import { TorusResource } from './resource';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const SaxonJS = require('saxon-js');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Cite = require('citation-js');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const cslSchema = require('./csl-data-schema.json');

const ajv = new Ajv({ removeAdditional: true, allowUnionTypes: true });
const validate = ajv.compile(cslSchema);

export function convertBibliographyEntries(
  $: any,
  found: Map<string, any>
): string {
  // Legacy rendered author fields as is, rather than treating as names to be parsed and rendered
  // in FamilyName, FirstInitial format. This allows for institutional authors like "Dept of Labor",
  // requring true proper names entered in format for bibliography. In bibTeX, the way to indicate
  // this is with double brackets, e.g. author={{Dept of Labor}}. To suppress name parsing in the
  // citation-js conversion to CSL-JSON, we add one pair of brackets here, relying on the conversion
  // to bibTex to wrap contents in another pair, so citation-js gets bibTex input as desired.
  $('bib\\:author, bib\\:editor').each((i: any, item: any) => {
    const author = $(item).text();
    $(item).text('{' + author + '}');
  });

  // Use XSL transformation to convert XML bibTeXML to textual bibTeX
  $('bib\\:entry').each((i: any, item: any) => {
    const id = $(item).attr('id');
    const content = `<bibtex:file xmlns:bibtex="http://bibtexml.sf.net/"><bibtex:entry id="${id}">${$(
      item
    )
      .html()
      .replaceAll('bib:', 'bibtex:')}</bibtex:entry></bibtex:file>`;

    const result = SaxonJS.transform({
      stylesheetFileName: path.resolve('assets/bibxml2bib.sef.json'),
      sourceText: content,
      destination: 'document',
    });
    const bibtexVal = SaxonJS.serialize(result.principalResult, {
      method: 'text',
    });

    // Use citation-js to convert bibTeX to CSL-JSON
    console.log('Converting reference. bibTex = ' + bibtexVal);
    // citation-js parser treats $ (used in some titles) as math delimiter, so escape it.
    const data = new Cite(bibtexVal.replaceAll('$', '\\$'));
    const cslData = data.get({
      format: 'string',
      type: 'json',
      style: 'csl',
      lang: 'en-US',
    });
    const cslJson: any[] = JSON.parse(cslData);
    const valid = validate(cslJson);
    if (!valid) {
      throw new Error(
        'Could not process bibliography entry ' +
          id +
          ' :errors: ' +
          validate.errors
      );
    }
    console.log(JSON.stringify(cslJson, null, 2));

    const b = {
      type: 'Bibentry',
      id: guid(),
      legacyPath: '',
      legacyId: '',
      title: cslJson[0].title,
      tags: [],
      unresolvedReferences: [],
      children: [],
      content: { data: cslJson },
      objectives: [],
      warnings: [],
    } as TorusResource;

    found.set(cslJson[0].id, b);
  });

  return $.html();
}

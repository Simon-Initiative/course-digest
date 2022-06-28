import { guid } from '../utils/common';
import * as path from 'path';
import Ajv from 'ajv';
import { TorusResource } from './resource';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const SaxonJS = require('saxon-js')
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Cite = require('citation-js')
// eslint-disable-next-line @typescript-eslint/no-var-requires
const cslSchema = require('./csl-data-schema.json');

const ajv = new Ajv({ removeAdditional: true, allowUnionTypes: true });
const validate = ajv.compile(cslSchema);

export function convertBibliographyEntries($: any, found: Map<string, any>): string {
  $('bib\\:entry').each((i: any, item: any) => {
    const id = $(item).attr('id');
    const content = `<bibtex:file xmlns:bibtex="http://bibtexml.sf.net/"><bibtex:entry id="${id}">${$(item).html().replaceAll('bib:', 'bibtex:')}</bibtex:entry></bibtex:file>`;
    
    const result = SaxonJS.transform({
      stylesheetFileName: path.resolve('assets/bibxml2bib.sef.json'),
      sourceText: content,
      destination: "document"
    });
    const bibtexVal = SaxonJS.serialize(result.principalResult, {method: 'text'});
    
    const data = new Cite(bibtexVal)
    const cslData = data.get({
        format: 'string',
        type: 'json',
        style: 'csl',
        lang: 'en-US'
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

    const title = cslJson[0].title;

    const b = {
      type: 'Bibentry',
      id: guid(),
      originalFile: '',
      title,
      tags: [],
      unresolvedReferences: [],
      children: [],
      content: {data: cslJson},
      objectives: [],
    } as TorusResource;

    found.set(cslJson[0].id, b);
    // found.push(b);
  });

  return $.html();
}
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import { parseString } from 'xml2js';

const content = fs.readFileSync(
  './test/organizations/default/organization.xml',
  'utf-8'
);

const $ = cheerio.load(content, {
  normalizeWhitespace: true,
  xmlMode: true,
});

function flattenResourceRefs($) {
  const refs = $('item resourceref');

  refs.each((i, elem) => {
    const id = $(elem).attr('idref');
    $(elem).parent().replaceWith(`<page-ref idref="${id}"></page-ref>`);
  });
}

function mergeTitles($) {
  mergeTitle($, 'organization');
  mergeTitle($, 'sequence');
  mergeTitle($, 'unit');
  mergeTitle($, 'module');
  mergeTitle($, 'section');
}

function mergeTitle($, selector) {
  const items = $(selector);

  items.each((i, elem) => {
    const text = $(elem).children('title').text();
    $(elem).attr('title', text);
    $(elem).children().remove('title');
  });
}

flattenResourceRefs($);
mergeTitles($);

console.log($.root().html());

parseString(
  $.root().html(),
  {
    preserveChildrenOrder: true,
    childkey: 'children',
    explicitArray: true,
    explicitChildren: true,
  },
  (err, result) => {
    console.dir(result);
  }
);

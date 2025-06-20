import * as Common from './common';
import * as cheerio from 'cheerio';
import * as DOM from '../../utils/dom';
import { replaceAll } from '../../utils/common';
import { NonDirectImageReference } from '../resource';

export type CustomTagDetails = {
  question: any;
  height: string;
  width: string;
  layoutFile: string;
  type: 'custom' | 'other';
};

export type LayoutFile = {
  layoutStyles: string;
  initiators: string;
  targetArea: string;
  imageReferences: NonDirectImageReference[];
};

export function findCustomTag(
  question: any,
  stem = null
): CustomTagDetails | undefined {
  const s = stem === null ? Common.buildStem(question) : stem;

  const custom = (s.content as any[]).find((c) => c.type === 'javascript');
  if (custom !== undefined) {
    return {
      question: question,
      height: custom.height,
      width: custom.width,
      layoutFile: custom.layout,
      type: isCustomDnD(custom) ? 'custom' : 'other',
    };
  }
  return undefined;
}

export function process(multipart: any, baseFileName: string) {
  // extract layout info
  // strip custom tag
  // process layout files

  const customTag = findCustomTag(multipart, multipart.stem);
  const withoutCustomTag = stripCustomTag(multipart);
  return processLayout(
    withoutCustomTag,
    customTag as CustomTagDetails,
    baseFileName
  );
}

function processLayout(
  question: any,
  customTag: CustomTagDetails,
  baseFileName: string
) {
  const baseDir = baseFileName.substring(0, baseFileName.lastIndexOf('/') + 1);
  console.log('Converting dnd layout ' + customTag.layoutFile);

  const $ = DOM.read(baseDir + customTag.layoutFile, {
    normalizeWhitespace: false,
  });

  const layoutStyles = $('layoutStyles').first().html();
  const layoutStylesTrimmed = cutCDATA(cutStyleTags(layoutStyles as string));
  let stylesToUse = layoutStylesTrimmed;
  // if no custom styles in tag, include standard stylesheet
  if (stylesToUse.trim().length == 0) stylesToUse = TABLE_DND_CSS;

  const height = customTag.height;
  const width = customTag.width;

  let targetArea: string;
  let initiators: string;
  if (isXmlFormat($)) {
    // convert abstract XML format DND layout
    targetArea = convertTargetGroup($('targetGroup').first(), $);
    initiators = convertInitiatorGroup($('initiatorGroup').first(), $);
  } else {
    // HTML format: use directly, but ensure no self-closing tags
    targetArea = cleanHtml(cutCDATA($('targetArea').first().html() as string));
    initiators = cutCDATA($('initiators').first().html() as string);
  }

  const updated = Object.assign({}, question, {
    height,
    width,
    layoutStyles: fixStyles(stylesToUse, targetArea),
    targetArea: fixImages(targetArea),
    initiators: fixImages(initiators),
  });

  const imageReferences = findImageRefs(
    layoutStylesTrimmed,
    initiators,
    targetArea,
    baseDir + customTag.layoutFile
  );

  return [updated, imageReferences];
}

function cutStyleTags(layout: string) {
  if (layout === null) return '';
  let s = replaceAll(layout, '<style>', '');
  s = replaceAll(s, '<style type="text/css">', '');
  s = replaceAll(s, '< /style>', '');
  s = replaceAll(s, '</style>', '');
  s = replaceAll(s, '</style >', '');
  return s;
}
function cutCDATA(content: string) {
  let s = replaceAll(content, '<!\\[CDATA\\[', '');
  s = replaceAll(s, '\\]\\]>', '');
  return s;
}

// For converting abstract XML layout spec to HTML format using nested styled divs

function isXmlFormat($: cheerio.Root): boolean {
  // XML uses targetGroup tag, HTML uses targetArea
  return $('targetGroup').length != 0;
}

function convertTargetGroup(
  targetGroup: cheerio.Cheerio,
  $: cheerio.Root
): string {
  const rows = $(targetGroup)
    .children()
    .map((i: number, e: cheerio.Element) => convertRow($(e), $))
    .toArray()
    .join('');

  return '<div class="oli-dnd-table">\n' + rows + '</div>';
}

// Convert row element which may be <headerRow> or <contentRow>
function convertRow(row: cheerio.Cheerio, $: cheerio.Root): string {
  const isHeaderRow = ($(row)[0] as cheerio.TagElement).tagName == 'headerRow';
  return (
    ' <div class="dnd-row' +
    (isHeaderRow ? ' dnd-row-header' : '') +
    '">' +
    $(row)
      .children()
      .map((i, e) => convertCell($(e), $))
      .toArray()
      .join('') +
    '\n </div>\n'
  );
}

function convertCell(item: cheerio.Cheerio, $: cheerio.Root) {
  if ($(item).is('target'))
    return `\n  <div input_ref="${$(item).attr(
      'assessmentId'
    )}" class="dnd-cell target"></div>`;

  // else <text> element
  return `\n  <div class="dnd-cell">${$(item).html()?.trim()}</div>`;
}

function convertInitiatorGroup(
  initiatorGroup: cheerio.Cheerio,
  $: cheerio.Root
): string {
  return $(initiatorGroup)
    .children()
    .map(
      (i, e) =>
        ` <div input_val="${$(e).attr('assessmentId')}" class="initiator">\n` +
        $(e).html()?.trim() +
        '\n </div>\n'
    )
    .toArray()
    .join('');
}

// replace any self-closing tags, which don't work in the torus implementation
function cleanHtml(targetArea: any) {
  return cheerio
    .load(
      targetArea,
      Object.assign(
        {},
        {
          normalizeWhitespace: false,
          xmlMode: true,
          selfClosingTags: false,
        }
      )
    )
    .html();
}

// Legacy DNDs in one family of courses used element-id-qualified styles of the form
//    #dpch01_lbd08 .target { ... }
// These ids are not used in the torus implementation so these will not work as is.
// Rather than force authors to edit them all, we detect and strip ids.
// Note: match relies on presence of underscore to avoid matching color specs of
// form #ffe. This naming convention followed in instances we are dealing with.
function fixStyles(styles: string, targetHtml: string): string {
  // collect set of unique id tags of form #foo_lbd01 in stylesheet
  const regex = /#[A-Za-z0-9]+_[A-za-z0-9]+/g;
  return (
    Array.from(new Set(styles.match(regex)))
      // leave ids used as element ids in the target html
      .filter((id) => !targetHtml.includes(`id="${id.substr(1)}`))
      .reduce((acc, id) => replaceAll(acc, id, ''), styles)
      // also remove the "all: initial" style since it causes problems
      .replace('all: initial;', '')
  );
}

export function replaceImageRefsInStyles(
  styles: string,
  originalRef: string,
  url: string
) {
  return replaceAll(
    styles,
    'url\\("' + originalRef + '"\\)',
    'url(' + url + ')'
  );
}

export function findImageRefsInStyles(styles: string, layoutFilePath: string) {
  const styleLines = styles.split('\n');
  const base = layoutFilePath.slice(0, layoutFilePath.lastIndexOf('/') + 1);
  const re = /url\(\"(.*)\"\)?/;
  return styleLines
    .map(function (val) {
      const result = val.match(re);
      if (
        result !== null &&
        !(result[1].startsWith('https://') || result[1].startsWith('http://'))
      ) {
        return {
          originalReference: result[1],
          assetReference: base + result[1],
          location: 'styles',
        };
      } else {
        return null;
      }
    })
    .filter((s) => s !== null);
}

function findImageRefsInLayoutElement(
  location: 'initiators' | 'targetArea',
  elementHtml: string,
  layoutFilePath: string
) {
  const base = layoutFilePath.slice(0, layoutFilePath.lastIndexOf('/') + 1);
  const $ = cheerio.load(elementHtml);
  const refs: NonDirectImageReference[] = [];
  $('image,img').each((i: number, elem: cheerio.Element) => {
    const src = $(elem).attr('src');
    if (
      src !== undefined &&
      !(src.startsWith('https://') || src.startsWith('http://'))
    )
      refs.push({
        originalReference: src,
        assetReference: base + src,
        location: location,
      });
  });

  return refs;
}

// Ensure any images within layout elements are non-draggable. For image initiators, this is
// needed to prevent click-drag of image from pre-empting drag of containing div with id we need.
// Also desirable UI to block attempts to drag static images in target table, though not crucial.
function fixImages(elementHtml: string): string {
  const $ = cheerio.load(elementHtml);
  $('image,img').each((i: number, elem: cheerio.Element) => {
    $(elem).attr('draggable', 'false');
  });
  return $.html();
}

function findImageRefs(
  styles: string,
  initiators: string,
  targetArea: string,
  layoutFilePath: string
) {
  return (findImageRefsInStyles(styles, layoutFilePath) || []).concat(
    findImageRefsInLayoutElement('targetArea', targetArea, layoutFilePath),
    findImageRefsInLayoutElement('initiators', initiators, layoutFilePath)
  );
}

export function replaceImageRefsInLayoutElement(
  elementHtml: string,
  originalRef: string,
  url: string
) {
  return replaceAll(elementHtml, `src="${originalRef}"`, `src="${url}"`);
}

function stripCustomTag(question: any) {
  const content = question.stem.content.filter(
    (c: any) => c.type !== 'javascript'
  );
  const stem = Object.assign({}, question.stem, { content });
  return Object.assign({}, question, { stem });
}

export const isCustomDnD = (custom: any) =>
  // id field may be omitted
  custom.id?.toLowerCase() === 'dragdrop' ||
  (custom.src !== undefined && custom.src.toLowerCase().includes('dynadrop'));

export const isSupportedDynaDropSrcFile = (filepath: string) =>
  filepath.toLocaleLowerCase().includes('dynadrop'); // DynaDropHTML.js or DynaDrop.js

export const containsDynaDropTable = (custom: any) =>
  custom.src !== undefined && isSupportedDynaDropSrcFile(custom.src);

export const TABLE_DND_CSS = `.component table tbody tr td {
  vertical-align: top;
}

.component .oli-dnd-table {
  display: table;
}

.component .dnd-row {
  display: table-row
}

.component .dnd-row-header {
  font-weight: 600;
  background-color: #cacaca;
  text-align: center
}

.component .dnd-cell {
  display: table-cell;
  padding: 4px
}

.component .oli-dnd-table .dnd-cell.target {
  height: 30px;
  min-width: 100px;
  padding: 4px;
  border: 1px dashed #999;
}

.initiator {
  color: #58646c;
  border: 2px solid transparent;
  padding: 6px;
  display: inline-block;
  font-size: 14px;
  box-shadow: 2px 2px 10px 0 rgba(155, 165, 173, 1);
  border-radius: 5px;
  margin: 5px;
  background-color: #E7F4FE;
  cursor: grab;
  cursor: -webkit-grab;
  user-select: none
}

.initiator::before {
  content: "";
  display: inline-block;
  vertical-align: middle;
  margin-right: 4px;
  width: 12px;
  height: 24px;
  background-image: -webkit-repeating-radial-gradient(center center, rgba(0, 0, 0, .2), rgba(0, 0, 0, .3) 1px, transparent 1px, transparent 100%);
  background-repeat: repeat;
  background-size: 4px 4px
}

.initiator:active {
  cursor: grabbing;
  cursor: -webkit-grabbing
}`;

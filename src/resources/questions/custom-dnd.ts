import * as Common from './common';
import * as DOM from '../../utils/dom';
import { replaceAll } from '../../utils/common';

export type CustomTagDetails = {
  height: string;
  width: string;
  layoutFile: string;
  type: 'custom' | 'table' | 'other';
};

export type LayoutFile = {
  layoutStyles: string;
  initiators: string;
  targetArea: string;
  imageReferences: string[];
};

export function findCustomTag(
  question: any,
  stem = null
): CustomTagDetails | undefined {
  const s = stem === null ? Common.buildStem(question) : stem;

  const custom = (s.content.model as any[]).find(
    (c) => c.type === 'javascript'
  );
  if (custom !== undefined) {
    return {
      height: custom.height,
      width: custom.width,
      layoutFile: custom.layout,
      type: containsDynaDropTable(custom)
        ? 'table'
        : custom.id === 'dragDrop'
        ? 'custom'
        : 'other',
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

  const $ = DOM.read(baseDir + customTag.layoutFile, {
    normalizeWhitespace: false,
  });
  const layoutStyles = $('layoutStyles').first().html();

  const layoutStylesTrimmed = cutCDATA(cutStyleTags(layoutStyles as string));
  const imageReferences = locateImageReferences(
    layoutStylesTrimmed,
    baseDir + customTag.layoutFile
  );

  const height = customTag.height;
  const width = customTag.width;

  const updated = Object.assign({}, question, {
    height,
    width,
    layoutStyles: layoutStylesTrimmed,
    targetArea: cutCDATA($('targetArea').first().html() as string),
    initiators: cutCDATA($('initiators').first().html() as string),
  });

  return [updated, imageReferences];
}

function cutStyleTags(layout: string) {
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

export function replaceImageReferences(
  layout: string,
  originalRef: string,
  url: string
) {
  return replaceAll(
    layout,
    'url\\("' + originalRef + '"\\)',
    'url(' + url + ')'
  );
}

export function locateImageReferences(layout: string, layoutFilePath: string) {
  const styleLines = layout.split('\n');
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
        };
      } else {
        return null;
      }
    })
    .filter((s) => s !== null);
}

function stripCustomTag(question: any) {
  const content = Object.assign({}, question.stem.content, {
    model: question.stem.content.model.filter(
      (c: any) => c.type !== 'javascript'
    ),
  });
  const stem = Object.assign({}, question.stem, { content });
  return Object.assign({}, question, { stem });
}

export const OLD_DYNA_DROP_SRC_FILENAME = 'DynaDropHTML-1.0.js';
export const DYNA_DROP_SRC_FILENAME = 'DynaDropHTML.js';

export const isSupportedDynaDropSrcFile = (filepath: string) =>
  filepath.substr(filepath.length - DYNA_DROP_SRC_FILENAME.length) ===
    DYNA_DROP_SRC_FILENAME ||
  filepath.substr(filepath.length - OLD_DYNA_DROP_SRC_FILENAME.length) ===
    OLD_DYNA_DROP_SRC_FILENAME;

export const containsDynaDropTable = (custom: any) =>
  custom.src !== undefined && isSupportedDynaDropSrcFile(custom.src);

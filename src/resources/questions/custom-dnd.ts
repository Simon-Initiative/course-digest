import * as Common from './common';
import * as cheerio from 'cheerio';
import * as DOM from '../../utils/dom';
import { replaceAll } from '../../utils/common';

export type CustomTagDetails = {
  question: any;
  height: string;
  width: string;
  layoutFile: string;
  type: 'custom' | 'other';
  dynaRefMap: Map<string, string> | null;
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
    let inputRefsMap: Map<string, string> | null = null;
    if (containsDynaDropTable(custom) && stem !== null) {
      const inputRefs = question.authoring.parts
        .map((i: any) => {
          return i.responses
            .filter((c: any) => c.score === 1)
            .map((e: any) => {
              return e.rule.replace('input like {', '').replace('}', '');
            });
        })
        .flat();
      inputRefsMap = inputRefs.reduce(
        (acc: Map<string, string>, val: string) => {
          const v: string[] = val.split('_');
          acc.set(v[1], v[0]);
          return acc;
        },
        new Map()
      );
    }
    return {
      question: question,
      height: custom.height,
      width: custom.width,
      layoutFile: custom.layout,
      type: isCustomDnD(custom) ? 'custom' : 'other',
      dynaRefMap: inputRefsMap,
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

  if (customTag.dynaRefMap) {
    switchInitiatorsWithTargets(customTag, updated);
  }

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

function switchInitiatorsWithTargets(
  customTag: CustomTagDetails,
  updated: any
) {
  const $targets = cheerio.load(
    updated.targetArea,
    Object.assign(
      {},
      {
        normalizeWhitespace: true,
        xmlMode: true,
        selfClosingTags: false,
      },
      {}
    )
  );
  const refsFound: string[] = [];
  $targets('.target').map((i: any, x: any) => {
    const oldRef: string | undefined = $targets(x).attr('input_ref');
    const newRef: string | undefined = customTag.dynaRefMap?.get(
      oldRef as string
    );
    if (newRef) {
      refsFound.push(newRef);
      $targets(x).attr('input_ref', newRef);
    }
  });

  const $initiators = cheerio.load(
    updated.initiators,
    Object.assign(
      {},
      {
        normalizeWhitespace: true,
        xmlMode: true,
        selfClosingTags: false,
      },
      {}
    )
  );
  $initiators('.initiator').map((i: any, x: any) => {
    const oldVal: string | undefined = $initiators(x).attr('input_val');
    let newVal: string | undefined;
    customTag.dynaRefMap?.forEach((value: string, key: string) => {
      if (value === oldVal) {
        newVal = key;
      }
    });
    if (newVal) {
      $initiators(x).attr('input_val', newVal);
    } else {
      updated.inputs = updated.inputs.filter((i: any) => i.id !== oldVal);
      updated.authoring.parts = updated.authoring.parts.filter(
        (i: any) => i.id !== oldVal
      );
    }
  });
  updated.targetArea = $targets.html();
  updated.initiators = $initiators.html();
  updated.layoutStyles = TABLE_DND_CSS;
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

export const isCustomDnD = (custom: any) =>
  custom.id.toLowerCase() === 'dragdrop' ||
  (custom.src !== undefined && custom.src.toLowerCase().includes('dynadrop'));

export const isSupportedDynaDropSrcFile = (filepath: string) =>
  filepath.toLocaleLowerCase().includes('dynadrophtml');

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

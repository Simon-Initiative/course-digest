import * as path from 'path';
import * as fs from 'fs';
import * as mime from 'mime-types';
import * as md5File from 'md5-file';
import * as tmp from 'tmp';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const fetch = require('sync-fetch');
import { Activity, NonDirectImageReference } from './resources/resource';
import {
  replaceImageRefsInStyles,
  replaceImageRefsInLayoutElement,
  LayoutFile,
} from './resources/questions/custom-dnd';
import { pathToBundleUrl } from './resources/webcontent';
import { replaceAll } from './utils/common';

export interface MediaSummary {
  mediaItems: { [k: string]: MediaItem };
  missing: MediaItemReference[];
  urlPrefix: string;
  downloadRemote: boolean;
  flattenedNames: { [k: string]: string };
  webContentBundle?: WebContentBundle;
}

export interface FlattenResult {
  mediaItems: MediaItem[];
  missing: MediaItemReference[];
}

export interface MediaItemReference {
  filePath: string;
  assetReference: string;
  isLayoutRef?: boolean;
}

export interface MediaItem {
  file: string;
  name: string;
  flattenedName: string;
  url: string;
  mimeType: string;
  fileSize: number;
  md5: string;
  references: MediaItemReference[];
}

export interface ProcessedMediaItem {
  file: string;
  name: string;
  url: string;
  mimeType: string;
  fileSize: number;
  md5: string;
}

export interface WebContentBundle {
  name: string;
  url: string;
  items: ProcessedMediaItem[];
  totalSize: number;
}

export interface MediaManifest {
  type: 'MediaManifest';
  mediaItems: ProcessedMediaItem[];
  mediaItemsSize: number;
  webContentBundle?: WebContentBundle;
}

export type UploadResult = UploadSuccess | UploadFailure;

export interface UploadSuccess {
  type: 'UploadSuccess';
  mediaItem: MediaItem;
}

export interface UploadFailure {
  type: 'UploadFailure';
  mediaItem: MediaItem;
  error: string;
}

// Target = DOM Element that contains a media item reference to be rewritten
type Target = {
  elem: cheerio.Element;
  attr: TargetSpec['attr'];
  value: string;
};

type TargetSpec = {
  selector: string;
  attr: 'src' | 'href' | 'poster' | 'text' | 'style';
  valueFilter?: (value: string, elem: cheerio.Element) => boolean;
};

const TARGET_SPECS: TargetSpec[] = [
  { selector: 'pronunciation', attr: 'src' },
  { selector: 'conjugate', attr: 'src' },
  { selector: 'image', attr: 'src' },
  { selector: 'image_hotspot', attr: 'src' },
  { selector: 'audio', attr: 'src' },
  { selector: 'audio source', attr: 'src' },
  { selector: 'audio track', attr: 'src' },
  { selector: 'video', attr: 'src' },
  { selector: 'video', attr: 'poster' },
  { selector: 'video source', attr: 'src' },
  { selector: 'video track', attr: 'src' },
  { selector: 'm\\:math *[style]', attr: 'style' },
  // may use web bundle:
  { selector: 'iframe', attr: 'src' },
  { selector: 'link', attr: 'href' },
  // web bundle/superactivity assets
  { selector: 'embed_activity source', attr: 'text' },
  { selector: 'linked_activity source', attr: 'text' },
  { selector: 'asset, interface, dataset', attr: 'text' },
  { selector: 'applet param wb\\:path', attr: 'href' },
  // in case process HTML, not used in OLI xml
  { selector: 'script', attr: 'src' },
  { selector: 'img', attr: 'src' },
];

type TargetCollectionMode = 'all' | 'relative' | 'absolute';

const collectTargets = ($: any, mode: TargetCollectionMode): Target[] => {
  const targets: Target[] = [];

  TARGET_SPECS.forEach((spec) => {
    $(spec.selector).each((i: any, elem: any) => {
      let value: string | undefined;
      if (spec.attr === 'text') {
        value = $(elem).text();
      } else if (spec.attr === 'style') {
        const style = $(elem).attr('style');
        const urlMatch = style?.match(/url\('([^']+)'\)/);
        value = urlMatch ? urlMatch[1] : undefined;
      } else {
        value = $(elem).attr(spec.attr);
      }

      if (!value) return;
      if (mode === 'relative' && !isRelativeUrl(value)) return;
      if (mode === 'absolute' && isRelativeUrl(value)) return;

      targets.push({ elem, attr: spec.attr, value });
    });
  });

  return targets;
};

const groupTargetsByValue = (targets: Target[]) =>
  targets.reduce((acc, target) => {
    if (!acc[target.value]) {
      acc[target.value] = [];
    }
    acc[target.value].push(target);
    return acc;
  }, {} as Record<string, Target[]>);

// From a DOM object, find all media item references and replace
// returns true if any were modified
export function transformToFlatDirectory(
  filePath: string,
  $: any,
  mediaSummary: MediaSummary,
  projectDirectory: string
): boolean {
  let modified = false;

  // bit of restructuring that must happen *before* translating link urls
  handleScriptedImageLinks($);

  const isSuperactivityAsset = (e: cheerio.Element) =>
    ['asset', 'interface', 'dataset'].includes($(e)[0].name) ||
    ($(e)[0].name === 'source' &&
      ($(e).parent()[0].name === 'embed_activity' ||
        $(e).parent()[0].name === 'linked_activity'));

  const isWebBundleElement = (e: cheerio.Element) =>
    ['link', 'iframe', 'wb:path'].includes($(e)[0].name) ||
    isSuperactivityAsset(e);

  const targets = collectTargets($, 'relative');

  targets.forEach((target) => {
    const assetReference = target.value;
    const ref = { filePath, assetReference };
    const useWebBundleUrl =
      mediaSummary.webContentBundle?.name && isWebBundleElement(target.elem);
    const url =
      // For link, iframe and superactivity source and webcontent assets, use a
      // webBundle URL rather than a flattened media library URL when webBundle requested.
      useWebBundleUrl
        ? getWebBundleUrl(ref, projectDirectory, mediaSummary)
        : flatten(ref, mediaSummary);

    if (url !== null) {
      if (isSuperactivityAsset(target.elem)) {
        // superactivity assets take paths relative to the media base url
        const superMediaPath = useWebBundleUrl
          ? url.slice(
              url.lastIndexOf(
                `media/bundles/${mediaSummary.webContentBundle?.name}/`
              ) +
                15 +
                (mediaSummary.webContentBundle?.name?.length ?? 0)
            )
          : url.slice(url.lastIndexOf('media/') + 6);
        const query = assetReference.split('?')[1];
        $(target.elem).text(superMediaPath + (query ? `?${query}` : ''));
      } else if (target.attr === 'href') {
        $(target.elem).attr('href', url);
      } else if (target.attr === 'poster') {
        $(target.elem).attr('poster', url);
      } else if (target.attr === 'style') {
        $(target.elem).attr(
          'style',
          replaceAll(
            $(target.elem).attr('style'),
            escapeRegex(`url('${assetReference}')`),
            `url('${url}')`
          )
        );
      } else if (target.attr === 'text') {
        $(target.elem).text(url);
      } else {
        $(target.elem).attr('src', url);
      }
      modified = true;
    } else {
      console.log(
        `Referenced file not found: ${assetReference} elem=${$(
          target.elem
        ).prop('tagName')}`
      );
    }
  });

  return modified;
}

// At least one legacy course used this script-loaded form of image link
// This converts to popup showing referenced image
const handleScriptedImageLinks = ($: any) => {
  $('link[href^="javascript\\:loadImage"]').each((i: any, item: any) => {
    const href = $(item).attr('href');
    const match = href.match(/javascript:loadImage\(['"](.+)['"]\)/);
    if (match) {
      const arg = match[1];
      // found this needed in our cases. maybe fixing user error, but works.
      const imageRef = arg.startsWith('../..') ? arg.substr(3) : arg;
      const text = $(item).text();
      $(item).replaceWith(
        `<extra><anchor>${text}</anchor><image src="${imageRef}"></image></extra>`
      );
    }
  });
};

const escapeRegex = (s: string) => s.replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&');

/* Replaced by webBundle mechanism

// Handle local HTML files functioning as media by checking for references to other local files
// such as css and script. If any are found, generate a new HTML file in a temp directory with
// local references replaced by media library URLs.
// Returns: possibly new local asset reference to use for this html file.
export function handleHtmlMedia(
  htmlReference: string, // relative path from src file to HTML file
  filePath: string, // path of src file referencing the HTML file
  summary: MediaSummary
): string {
  const htmlPath = resolve({ assetReference: htmlReference, filePath });
  console.log('Converting HTML media ' + htmlPath);

  // !!! could check from summary if we have already converted this file

  // parse HTML file. Ensure no self-closing tags to avoid problems.
  const $ = DOM.read(htmlPath, {
    normalizeWhitespace: false,
    xmlMode: true,
    selfClosingTags: false,
  });

  // replace references within it as for other resource files. Requires code
  // to find local URL references in html elements as well as legacy XML elements.
  const modified = transformToFlatDirectory(htmlPath, $, summary);

  // write the modified file out into a local directory
  if (modified) {
    // put converted html files in tmp dir alongside project root
    const iContent = htmlPath.indexOf('/content/');
    const projectRootPath = htmlPath.substring(0, iContent);
    const tmpDirPath = projectRootPath + '-converted';

    // Use same subtree within tmp as in project content, so can match up w/source
    const contentRelativePath = htmlPath.substring(
      iContent + '/content/'.length
    );
    const filePath = tmpDirPath + '/' + contentRelativePath;
    const fileDirPath = filePath.substring(0, filePath.lastIndexOf('/'));
    if (!fs.existsSync(fileDirPath))
      fs.mkdirSync(fileDirPath, { recursive: true });

    fs.writeFileSync(filePath, $.html());

    // modify local html path to return
    htmlReference = filePath;
  }

  return htmlReference;
}
*/

export function downloadRemote(
  filePath: string,
  $: any,
  summary: MediaSummary
) {
  const targetsByValue = groupTargetsByValue(collectTargets($, 'absolute'));
  Object.keys(targetsByValue).forEach((assetReference: any) => {
    // Download the file into a temporary file
    const buffer = fetch(assetReference, {}).buffer();
    const tmpobj = tmp.fileSync();
    fs.writeFileSync(tmpobj.name, buffer);

    // Create a directory for this file based on md5

    const md5 = md5File.sync(tmpobj.name);
    const root = filePath.substring(0, filePath.lastIndexOf('/'));
    if (!fs.existsSync(root + '/' + md5)) {
      fs.mkdirSync(root + '/' + md5);
    }

    // Copy the file into that directory
    let name = assetReference.substring(assetReference.lastIndexOf('/') + 1);
    if (name.endsWith('#fixme')) {
      name = name.substring(0, name.length - 6);
    }
    const newLocalPath = root + '/' + md5 + '/' + name;
    if (!fs.existsSync(newLocalPath)) {
      fs.copyFileSync(tmpobj.name, newLocalPath);
    }

    // Store the new media item
    const subPath = md5.substring(0, 2);
    const encodedName = encodeURIComponent(name);
    const url = `${summary.urlPrefix}/${subPath}/${md5}/${encodedName}`;

    if (summary.mediaItems[newLocalPath] === undefined) {
      // See if we need to rename this file to avoid conflicts with an already
      // flattened file
      const flattenedName = name;

      summary.mediaItems[newLocalPath] = {
        file: newLocalPath,
        fileSize: getFilesizeInBytes(newLocalPath),
        name,
        flattenedName,
        md5,
        mimeType: mime.lookup(newLocalPath) || 'application/octet-stream',
        references: [],
        url,
      };
    }

    // Update the URL in the XML DOM
    if (url !== null) {
      targetsByValue[assetReference].forEach((target) => {
        const elem = target.elem;
        if (
          $(elem)[0].name === 'source' &&
          $(elem).parent()[0].name !== 'video'
        ) {
          $(elem).replaceWith(
            `<source>${url.slice(url.lastIndexOf('media/') + 6)}</source>`
          );
        } else if ($(elem)[0].name === 'asset') {
          const name = $(elem).attr('name');
          if (name) {
            $(elem).replaceWith(
              `<asset name="${name}">${url.slice(
                url.lastIndexOf('media/') + 6
              )}</asset>`
            );
          } else {
            $(elem).replaceWith(
              `<asset>${url.slice(url.lastIndexOf('media/') + 6)}</asset>`
            );
          }
        } else if ($(elem)[0].name === 'interface') {
          $(elem).replaceWith(
            `<interface>${url.slice(url.lastIndexOf('media/') + 6)}</interface>`
          );
        } else if ($(elem)[0].name === 'dataset') {
          const pkg = $(elem).attr('package');
          $(elem).replaceWith(
            `<dataset package="${pkg}">${url.slice(
              url.lastIndexOf('media/') + 6
            )}</dataset>`
          );
        } else if (target.attr === 'href') {
          $(elem).attr('href', url);
        } else if (target.attr === 'poster') {
          $(elem).attr('poster', url);
        } else if (target.attr === 'style') {
          $(elem).attr(
            'style',
            replaceAll(
              $(elem).attr('style'),
              escapeRegex(`url('${assetReference}')`),
              `url('${url}')`
            )
          );
        } else if (target.attr === 'text') {
          $(elem).text(url);
        } else {
          $(elem).attr('src', url);
        }
      });
    }
  });
}

export function transformToFlatDirectoryURLReferences(
  assetReferences: NonDirectImageReference[],
  activity: Activity,
  summary: MediaSummary
) {
  const content = activity.content as LayoutFile;
  let styles = content.layoutStyles;
  let initiators = content.initiators;
  let targetArea = content.targetArea;
  assetReferences.forEach((item: any) => {
    // Flatten this file reference into our single, virtual directory
    const { assetReference, originalReference, location } = item;
    const ref = { filePath: activity.legacyPath, assetReference };
    const url = flatten(ref, summary);

    // Update the URL in the XML DOM
    if (url !== null) {
      if (location === 'styles')
        styles = replaceImageRefsInStyles(styles, originalReference, url);
      else if (location === 'initiators') {
        initiators = replaceImageRefsInLayoutElement(
          initiators,
          originalReference,
          url
        );
      } else if (location === 'targetArea') {
        targetArea = replaceImageRefsInLayoutElement(
          targetArea,
          originalReference,
          url
        );
      }
    }
  });

  activity.content.layoutStyles = styles;
  activity.content.initiators = initiators;
  activity.content.targetArea = targetArea;
}

// Take one in the collection of media item references and derive reference to
// its location in the single flattened virtual directory being built up, being
// careful to account for the same name (but different file) in different directories.
// returns url, updating media summary
export function flatten(
  ref: MediaItemReference,
  summary: MediaSummary
): string | null {
  // console.log('flatten: ref=' + ref.assetReference + ' from ' + ref.filePath);
  const absolutePath = resolve(ref);
  return flattenPath(absolutePath, summary, ref);
}

export function flattenPath(
  absolutePath: string,
  summary: MediaSummary,
  ref: MediaItemReference
) {
  const decodedPath = decodeURIComponent(absolutePath);

  if (fs.existsSync(decodedPath) && !fs.lstatSync(decodedPath).isDirectory()) {
    const md5 = md5File.sync(decodedPath);

    const getName = (file: string) => file.substr(file.lastIndexOf('/') + 1);
    const subdir = md5.substring(0, 2);
    const toURL = (name: string) =>
      summary.urlPrefix +
      '/' +
      subdir +
      '/' +
      md5 +
      '/' +
      encodeURIComponent(name);

    const name = getName(decodedPath);

    // Is this the first time we have encountered this specific physical file
    if (summary.mediaItems[absolutePath] === undefined) {
      // See if we need to rename this file to avoid conflicts with an already
      // flattened file
      const flattenedName = summary.flattenedNames[name]
        ? generateNewName(name, summary.flattenedNames)
        : name;

      summary.mediaItems[absolutePath] = {
        file: decodedPath,
        fileSize: getFilesizeInBytes(decodedPath),
        name,
        flattenedName,
        md5,
        mimeType: mime.lookup(absolutePath) || 'application/octet-stream',
        references: [ref],
        url: toURL(flattenedName),
      };
    }
    summary.mediaItems[absolutePath].references.push(ref);
    return summary.mediaItems[absolutePath].url;
  }
  // console.log('flatten: file does not exist');
  summary.missing.push(ref);
  return null;
}

// like flatten but get gets URL into web bundle tree instead
export function getWebBundleUrl(
  ref: MediaItemReference,
  projectDirectory: string,
  mediaSummary: MediaSummary
): string | null {
  const absolutePath = resolve(ref);
  const decodedPath = decodeURIComponent(absolutePath);

  if (fs.existsSync(decodedPath)) {
    return pathToBundleUrl(decodedPath, projectDirectory, mediaSummary);
  }

  // else file not found:
  mediaSummary.missing.push(ref);
  return null;
}

function getFilesizeInBytes(filename: string) {
  const stats = fs.statSync(filename);
  const fileSizeInBytes = stats.size;
  return fileSizeInBytes;
}

function generateNewName(
  name: string,
  flattenedNames: { [k: string]: string }
) {
  const buildCandidateName =
    name.indexOf('.') >= 0
      ? (n: string, i: number): string => {
          const parts = n.split('.');
          return parts[0] + '_' + i + '.' + parts[1];
        }
      : (n: string, i: number): string => name + '_' + i;

  let i = 1;
  while (true) {
    const candidateName = buildCandidateName(name, i);
    if (flattenedNames[candidateName] === undefined) {
      return candidateName;
    }
    i++;
  }
}

// Turns a media asset reference that may be relative to a particular course
// XML document into a full path to file in project directory
export function resolve(reference: MediaItemReference): string {
  let dir = path.dirname(reference.filePath);

  // Ref of form 'webcontent/foo/bar' denotes file within top-level
  // webcontent directory so is relative to project content directory
  if (reference.assetReference.startsWith('webcontent')) {
    // Heuristic for finding path to project content directory assumes
    // no 'content' directory anywhere else within content tree
    dir =
      reference.filePath.slice(0, reference.filePath.lastIndexOf('/content/')) +
      '/content/';
  }

  const assetRef = removeQueryParams(reference.assetReference);

  return findInPackage(dir, assetRef, path.resolve(dir, assetRef));
}

export function removeQueryParams(ref: string): string {
  return ref.split('?')[0];
}

export function findInPackage(
  dir: string,
  reference: string,
  absolutePath: string
): string {
  const decodedPath = decodeURIComponent(absolutePath);

  if (!fs.existsSync(decodedPath)) {
    if (dir.endsWith('content/')) return absolutePath;
    const dirArray: string[] = dir.split('/');
    if (dirArray[dirArray.length - 1] === '') dirArray.pop();
    dirArray.pop();
    dir = dirArray.join('/') + '/';
    return findInPackage(dir, reference, path.resolve(dir, reference));
  }

  return absolutePath;
}

// Uploads a collection of media items to an S3 bucket, staging them for
// a Torus project ingestion
export function stage(
  mediaItems: MediaItem[],
  _remotePath: string,
  _progressCallback: (mediaItem: MediaItem) => void
): Promise<UploadResult[]> {
  return Promise.resolve(
    mediaItems.map((mediaItem) => ({ type: 'UploadSuccess', mediaItem }))
  );
}

const absUrlPrefix = new RegExp('^[a-z]+://', 'i');
const isRelativeUrl = (url: string): boolean => !url.trim().match(absUrlPrefix);

/*
function isLocalReference(src: string, filePath: string): boolean {
  return (
    src.startsWith('.') ||
    src.startsWith('webcontent') ||
    (isSuperactivity(filePath) && src.includes('webcontent'))
  );
}

function isSuperactivity(filePath: string): boolean {
  return (
    filePath.includes('x-oli-bio-simulator') ||
    filePath.includes('x-oli-chat') ||
    filePath.includes('x-oli-embed') ||
    filePath.includes('x-oli-linked-activity') ||
    filePath.includes('x-oli-lti') ||
    filePath.includes('x-oli-print-certificate') ||
    filePath.includes('x-oli-repl') ||
    filePath.includes('x-oli-supertutor') ||
    filePath.includes('x-cmu-') ||
    filePath.includes('x-pitt-')
  );
}
*/

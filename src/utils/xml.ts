// XML related utilities
import * as stream from 'stream';
import * as fs from 'fs';
import { decodeEntities } from './common';
import { decode } from 'html-entities';
import { parseMathJaxFormulas } from './mathjax-parser';
import { ProjectSummary } from 'src/project';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const xmlParser = require('./parser');

export type TagVisitor = (tag: string, attributes: unknown) => void;
export type ClosingTagVisitor = (tag: string) => void;

function getPastDocType(content: string): string {
  if (content.indexOf('DOCTYPE') !== -1) {
    return content.substr(content.indexOf('>', content.indexOf('DOCTYPE')) + 1);
  }
  return content;
}

export function isBlockElement(name: string) {
  const blocks = {
    p: true,
    img: true,
    youtube: true,
    audio: true,
    codeblock: true,
    video: true,
    iframe: true,
    formula: true,
    callout: true,
    h1: true,
    h2: true,
    h3: true,
    h4: true,
    h5: true,
    h6: true,
    ol: true,
    ul: true,
    table: true,
    dialog: true,
    definition: true,
    figure: true,
  };
  return (blocks as any)[name];
}

function inlineAttrName(attrs: Record<string, unknown>) {
  if (attrs['style'] === 'bold') {
    return 'strong';
  }
  if (attrs['style'] === 'italic') {
    return 'em';
  }
  if (attrs['style'] === 'code') {
    return 'code';
  } else if (attrs['style'] === 'sub') {
    return 'sub';
  } else if (attrs['style'] === 'sup') {
    return 'sup';
  } else {
    return 'strong';
  }
}

function inlinesToObject(inlines: any) {
  return inlines.reduce((m: any, style: any) => {
    m[style] = true;
    return m;
  }, {});
}

// Visit all tags and their attributes in an XML file in a top-down
// fashion.  This is promise based and resolves 'true' when the
// streaming of the file completes, and resolves a string error message
// if an error is encountered.  The 'visitor' callback function will be
// executed for every tag (element) encountered in the XML document.
export function visit(
  file: string,
  visitor: TagVisitor,
  closingTagVisitor?: ClosingTagVisitor
): Promise<true | string> {
  return new Promise((resolve, reject) => {
    const parser = new xmlParser();

    parser.on('opentag', (tag: string, attrs: any) => {
      if (tag !== null) {
        let cleanedTag = tag.trim();
        if (cleanedTag.endsWith('/')) {
          cleanedTag = cleanedTag.substr(0, cleanedTag.length - 1);
        }

        Object.keys(attrs).forEach((k) => {
          if (
            typeof (attrs as any)[k] === 'string' &&
            (attrs as any)[k].endsWith('/')
          ) {
            (attrs as any)[k] = (attrs as any)[k].substr(
              0,
              (attrs as any)[k].length - 1
            );
          }
        });

        visitor(cleanedTag, attrs);
      }
    });

    parser.on('closetag', (tag: string) => {
      if (closingTagVisitor !== undefined && tag !== null) {
        let cleanedTag = tag.trim();
        if (cleanedTag.endsWith('/')) {
          cleanedTag = cleanedTag.substr(0, cleanedTag.length - 1);
        }
      }
    });

    parser.on('finish', () => {
      resolve(true);
    });

    parser.on('error', (err: string) => {
      reject(err);
    });

    const content: string = fs.readFileSync(file, 'utf-8');
    const dtdRemoved = getPastDocType(content);

    const s = new stream.PassThrough();
    s.write(dtdRemoved);
    s.end();
    s.pipe(parser);
  });
}

function isInline(tag: string) {
  return tag === 'em';
}

export function replaceAll(s: string, t: string, w: string) {
  const re = new RegExp(t, 'g');
  return s.replace(re, w);
}

export function toJSON(
  xml: string,
  projectSummary: ProjectSummary,
  preserveMap = {}
): Promise<unknown> {
  const root: any = {};
  root.children = [];

  const stack = [root];

  const top = () => stack[stack.length - 1];
  const pop = () => stack.pop();
  const push = (o: any) => stack.push(o);

  const inlines: any = [];

  let currentAlternativesGroup: any = null;

  return new Promise((resolve, reject) => {
    const parser = new xmlParser(preserveMap);

    parser.on('opentag', (tag: string, attrs: any) => {
      const handleAlternatives = () => {
        if (tag === 'alternatives') {
          currentAlternativesGroup = top()['group'];
        }
      };

      if (tag !== null) {
        let cleanedTag = tag.trim();
        if (cleanedTag.endsWith('/')) {
          cleanedTag = cleanedTag.substr(0, cleanedTag.length - 1);
        }

        if (isInline(cleanedTag)) {
          inlines.push(inlineAttrName(attrs));
        } else {
          const object: any = { type: cleanedTag, children: [] };

          Object.keys(attrs).forEach((k) => {
            if (k !== '___selfClosing___' && (attrs as any)[k].endsWith('/')) {
              (attrs as any)[k] = (attrs as any)[k].substr(
                0,
                (attrs as any)[k].length - 1
              );
            }
          });
          Object.keys(attrs).forEach((k) => {
            object[k] = attrs[k];
            if (typeof attrs[k] === 'string') {
              const text = replaceAll(attrs[k], '&amp;', '&');
              object[k] = decode(text, { level: 'html5' });
            }
          });
          if (top() !== undefined) {
            top().children.push(object);
          }
          push(object);
        }

        handleAlternatives();
      }
    });

    parser.on('closetag', (tag: string) => {
      if (isInline(tag)) {
        inlines.pop();

        return;
      }

      const ensureDefaultText = (e: string, text: string) => {
        if (tag === e) {
          if (top() && top().children.length === 0) {
            top().children.push({ type: 'text', text });
          }
        }
      };

      const ensureNotEmpty = (e: string) => {
        if (tag === e) {
          if (top() && top().children.length === 0) {
            top().children.push({ type: 'text', text: ' ' });
          }
        }
      };

      const ensureParagraph = (e: string) => {
        if (tag === e) {
          if (top() && top().children.length > 0) {
            if (top().children.every((e: any) => e.text !== undefined)) {
              top().children = [{ type: 'p', children: top().children }];
            }
          }
        }
      };

      const getOneOfType = (children: any, type: string) => {
        const results = children.filter((t: any) => t.type === type);
        if (results.length > 0) {
          return results[0];
        }
        return null;
      };
      const getAllOfType = (children: any, type: string) => {
        return children.filter((t: any) => t.type === type);
      };

      const elevatePopoverContent = () => {
        if (tag === 'popup') {
          const anchor = getOneOfType(top().children, 'anchor');
          const meaning = getOneOfType(top().children, 'meaning');
          const pronunciation = getOneOfType(top().children, 'pronunciation');
          const translation = getOneOfType(top().children, 'translation');

          if (anchor !== null) {
            top().children = anchor.children;
            top().trigger = 'hover';

            if (pronunciation !== null) {
              top().audioSrc = pronunciation.src;
              top().audioType = pronunciation.contenttype;
            }

            if (meaning !== null) {
              const material = getOneOfType(meaning.children, 'material');
              top().content = material.children;
            } else if (translation !== null) {
              top().content = translation.children;
            } else {
              top().content = [{ type: 'text', text: ' ' }];
            }
          }
        }
      };

      const elevateCaption = (parent: string) => {
        if (tag === 'caption' && stack[stack.length - 2].type === parent) {
          if (stack.length > 1) {
            stack[stack.length - 2].caption = top().children;
            stack[stack.length - 2].children = [{ type: 'text', text: ' ' }];
          }
        }
      };

      const elevateTableCaption = () => {
        if (tag === 'caption' && stack[stack.length - 2].type === 'table') {
          if (stack.length > 1) {
            stack[stack.length - 2].caption = top().children;
            stack[stack.length - 2].children = stack[
              stack.length - 2
            ].children.filter((t: any) => t.type !== 'caption');
          }
        }
      };

      const unescapeFormulaSrc = () => {
        if (
          (tag === 'formula' || tag === 'formula_inline') &&
          top().subtype !== 'richtext'
        ) {
          top().src = decodeEntities(top().src);
        }
      };

      const unescapeVariableData = () => {
        if (tag === 'variable') {
          top().expression = decodeEntities(top().expression);
        }
      };

      const setTransformationData = () => {
        if (tag === 'transformation') {
          top().data = top().children;
          top().children = [];
        }
      };

      const setVideoAttributes = () => {
        if (tag === 'video') {
          if (typeof top().src === 'string') {
            top().src = [
              { type: 'source', url: top().src, contenttype: 'video/mp4' },
            ];
          } else {
            top().src = getAllOfType(top().children, 'source');
          }

          top().children = [{ text: ' ' }];
          if (top().width !== undefined) {
            top().width = parseInt(top().width);
          }
          if (top().height !== undefined) {
            top().height = parseInt(top().height);
          }
        }
      };

      const ensureTextDoesNotSurroundBlockElement = (e: string) => {
        if (tag === e) {
          if (top() && top().children.length === 3) {
            const first = top().children[0];
            const second = top().children[1];
            const third = top().children[2];

            if (
              first.text === ' ' &&
              third.text === ' ' &&
              isBlockElement(second.type)
            ) {
              top().children = [second];
            }
          }
        }
      };

      const ensureTextDoesNotLeadBlockElement = (e: string) => {
        if (tag === e) {
          if (top() && top().children.length >= 2) {
            const first = top().children[0];
            const second = top().children[1];

            if (first.text === ' ' && isBlockElement(second.type)) {
              top().children = top().children.slice(1);
            }
          }
        }
      };

      const convertTableAttrstoNumbers = () => {
        if (tag === 'td' || tag === 'th') {
          if (top().colspan !== undefined) {
            top().colspan = parseInt(top().colspan);
          }
          if (top().rowspan !== undefined) {
            top().rowspan = parseInt(top().rowspan);
          }
        }
      };

      const elevateDefinitionComponents = () => {
        if (tag === 'definition') {
          const pronunciation = getOneOfType(top().children, 'pronunciation');
          const translations = getAllOfType(top().children, 'translation');
          const meanings = getAllOfType(top().children, 'meaning');

          if (pronunciation !== null) {
            top().pronunciation = pronunciation;
          }
          top().meanings = meanings;
          top().translations = translations;
          top().children = [];
        }
      };

      const moveMediaItem = (kind: string) => {
        const item = getOneOfType(top().children, kind);
        if (item !== null) {
          // This repositions the media item as the sibling ahead of the
          // just parsed dialog
          if (stack.length > 1) {
            const previousParent = stack[stack.length - 2];
            previousParent.children.splice(
              previousParent.children.length - 1,
              0,
              item
            );
          }
        }
      };

      const elevateDialogComponents = () => {
        if (tag === 'dialog') {
          const speakers = getAllOfType(top().children, 'speaker');
          const lines = getAllOfType(top().children, 'dialog_line');

          speakers.forEach((s: any) => (s.children = []));

          moveMediaItem('audio');
          moveMediaItem('video');
          moveMediaItem('youtube');
          moveMediaItem('image');
          moveMediaItem('iframe');

          top().speakers = speakers;
          top().lines = lines;
          top().children = [];
        }
      };

      const defaultPronunciation = () => ({
        type: 'pronunciation',
        children: [{ type: 'p', children: [{ text: '' }] }],
      });

      const handleConjugation = () => {
        if (tag === 'conjugation') {
          // We have to set 'pronunciation' as a property
          // as well introduce 'table' as a property to hold all of the
          // 'tr' children

          const rows = getAllOfType(top().children, 'tr');
          const pronunciation = getOneOfType(top().children, 'pronunciation');

          top().pronunciation =
            pronunciation === null ? defaultPronunciation() : pronunciation;
          top().table = {
            type: 'table',
            caption: [{ type: 'p', children: [{ text: '' }] }],
            children: rows,
          };
          top().children = [];
        }
      };

      const handleCommandButton = () => {
        if (tag === 'command_button') {
          // We have to set 'pronunciation' as a property
          // as well introduce 'table' as a property to hold all of the
          // 'tr' children

          const messages = getAllOfType(top().children, 'message');

          top().message = messages[0].children[0].text;
          top().children = [{ text: top().title }];
        }
      };

      const renameCaptionForFigure = () => {
        if (tag === 'figure') {
          if (top().caption !== null && top().caption !== undefined) {
            top().title = top().caption;
            delete top().caption;
          }
        }
      };

      const handleDescriptionList = () => {
        if (tag === 'dl') {
          const title = getOneOfType(top().children, 'title');
          if (title !== null && title !== undefined) {
            top().title = title.children;
          }
          top().items = top().children.filter((c: any) => c.type !== 'title');
          top().children = [];
        }
      };

      const handleAlternatives = () => {
        if (tag === 'alternative') {
          if (currentAlternativesGroup) {
            projectSummary.addAlternativesGroupValue(
              currentAlternativesGroup,
              top()['value']
            );
          }
        } else if (tag === 'alternatives') {
          currentAlternativesGroup = null;
        }
      };

      const stringToBoolean = (element: string, attr: string) => {
        if (tag === element && top()[attr] !== undefined) {
          top()[attr] = top()[attr] === 'true' ? true : false;
        }
      };

      if (tag !== null) {
        ensureNotEmpty('p');
        ensureNotEmpty('th');
        ensureNotEmpty('td');
        ensureDefaultText('code_line', ' ');
        ensureDefaultText('h1', ' ');
        ensureDefaultText('h2', ' ');
        ensureDefaultText('h3', ' ');
        ensureDefaultText('h4', ' ');
        ensureDefaultText('h5', ' ');
        ensureDefaultText('h6', ' ');
        ensureNotEmpty('img');
        ensureNotEmpty('img_inline');
        ensureNotEmpty('iframe');
        ensureNotEmpty('youtube');
        ensureNotEmpty('audio');
        ensureNotEmpty('page_link');
        ensureNotEmpty('li');
        ensureNotEmpty('formula');
        ensureNotEmpty('callout');
        ensureNotEmpty('formula_inline');
        ensureNotEmpty('callout_inline');
        ensureTextDoesNotSurroundBlockElement('td');
        ensureTextDoesNotSurroundBlockElement('dd');
        ensureTextDoesNotSurroundBlockElement('dt');
        ensureTextDoesNotSurroundBlockElement('li');
        elevateCaption('img');
        elevateCaption('figure');
        elevateCaption('iframe');
        elevateCaption('youtube');
        elevateTableCaption();
        elevateCaption('audio');
        elevatePopoverContent();
        unescapeFormulaSrc();
        unescapeVariableData();
        setTransformationData();
        setVideoAttributes();
        convertTableAttrstoNumbers();
        elevateDefinitionComponents();
        elevateDialogComponents();
        ensureTextDoesNotSurroundBlockElement('figure');
        ensureTextDoesNotLeadBlockElement('figure');
        ensureTextDoesNotSurroundBlockElement('figure');
        renameCaptionForFigure();
        ensureNotEmpty('translation');
        ensureNotEmpty('pronunciation');
        ensureParagraph('translation');
        ensureParagraph('pronunciation');
        handleConjugation();
        handleCommandButton();
        handleDescriptionList();
        handleAlternatives();
        stringToBoolean('formula_inline', 'legacyBlockRendered');

        if (top() && top().children === undefined) {
          top().children = [];
        }

        pop();
      }
    });

    parser.on('text', (raw: string) => {
      // Cheerio will encode ampersands in non supported XML entities like &times; to be &amp;times;
      // So to handle these we first decode only ampersands, then feed that result through the
      // html-entities library's decode to handle all other HTML5 entities.'

      let text = replaceAll(raw, '&amp;', '&');
      text = decode(text, { level: 'html5' });

      const parsed = parseMathJaxFormulas(text);

      if (parsed) {
        const textAndFormulaNodes = parsed.map((n) =>
          // process any text nodes to add inline styles
          n.type === 'text'
            ? Object.assign({ text: n.text }, inlinesToObject(inlines))
            : {
                type: 'formula_inline',
                subtype: n.subtype,
                src: n.src,
                legacyBlockRendered: n.legacyBlockRendered,
              }
        );

        top().children = [...top().children, ...textAndFormulaNodes];
      } else {
        const textNode: any = Object.assign({ text }, inlinesToObject(inlines));

        top().children.push(textNode);
      }
    });
    parser.on('cdata', (cdata: string) => {
      const text = cdata;
      const object: any = Object.assign({}, { text }, inlinesToObject(inlines));
      top().children.push(object);
    });

    parser.on('finish', () => {
      resolve(root);
    });

    parser.on('error', (err: string) => {
      reject(err);
    });

    const dtdRemoved = getPastDocType(xml);

    const s = new stream.PassThrough();
    s.write(dtdRemoved);
    s.end();
    s.pipe(parser);
  });
}

export function rootTag(file: string): Promise<string> {
  return new Promise((resolve, _reject) => {
    const content: string = fs.readFileSync(file, 'utf-8');
    const dtd = content.substr(content.indexOf('<!DOCTYPE'));
    resolve(dtd.substr(0, dtd.indexOf('>') + 1));
  });
}

// XML related utilities
const stream = require('stream');
const Parser = require('node-xml-stream-parser');
const fs = require('fs');

export type TagVisitor = (tag: string, attributes: Object) => void;
export type ClosingTagVisitor = (tag: string) => void;

function getPastDocType(content: string) : string {
  if (content.indexOf('DOCTYPE') !== -1) {
    return content.substr(content.indexOf('>', content.indexOf('DOCTYPE')) + 1);
  }
  return content;
}

// Visit all tags and their attributes in an XML file in a top-down
// fashion.  This is promise based and resolves 'true' when the
// streaming of the file completes, and resolves a string error message
// if an error is encountered.  The 'visitor' callback function will be
// executed for every tag (element) encountered in the XML document.
export function visit(
  file: string, visitor: TagVisitor,
  closingTagVisitor? : ClosingTagVisitor) : Promise<true | string> {

  return new Promise((resolve, reject) => {

    const parser = new Parser();

    parser.on('opentag', (tag: string, attrs: Object) => {

      if (tag !== null) {

        let cleanedTag = tag.trim();
        if (cleanedTag.endsWith('/')) {
          cleanedTag = cleanedTag.substr(0, cleanedTag.length - 1);
        }

        Object.keys(attrs)
          .forEach((k) => {
            if ((attrs as any)[k].endsWith('/')) {
              (attrs as any)[k] = (attrs as any)[k].substr(0, (attrs as any)[k].length - 1);
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

    const content : string = fs.readFileSync(file, 'utf-8', 'r+');
    const dtdRemoved = getPastDocType(content);

    const s = new stream.PassThrough();
    s.write(dtdRemoved);
    s.end();
    s.pipe(parser);

  });
}

export function toJSON(xml: string) : Promise<Object> {

  const root : any = {};
  root.children = [];

  const stack = [root];

  const top = () => stack[stack.length - 1];
  const pop = () => stack.pop();
  const push = (o: any) => stack.push(o);

  return new Promise((resolve, reject) => {

    const parser = new Parser();

    parser.on('opentag', (tag: string, attrs: any) => {

      if (tag !== null) {
        let cleanedTag = tag.trim();
        if (cleanedTag.endsWith('/')) {
          cleanedTag = cleanedTag.substr(0, cleanedTag.length - 1);
        }

        const object : any = { type: cleanedTag, children: [] };

        Object.keys(attrs)
          .forEach((k) => {
            if (k !== '___selfClosing___' && (attrs as any)[k].endsWith('/')) {
              (attrs as any)[k] = (attrs as any)[k].substr(0, (attrs as any)[k].length - 1);
            }
          });
        Object.keys(attrs).forEach(k => object[k] = attrs[k]);

        top().children.push(object);
        push(object);
      }
    });

    parser.on('closetag', (tag: string) => {
      if (tag !== null) {
        pop();
      }
    });

    parser.on('text', (text: string) => {
      top().children.push({ type: 'text', text });
    });
    parser.on('cdata', (cdata: string) => {
      top().children.push({ type: 'text', cdata });
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

export function rootTag(file: string) : Promise<string> {

  return new Promise((resolve, reject) => {
    const content : string = fs.readFileSync(file, 'utf-8', 'r+');
    const dtd = content.substr(content.indexOf('<!DOCTYPE'));
    resolve(dtd.substr(0, dtd.indexOf('>') + 1));
  });
}

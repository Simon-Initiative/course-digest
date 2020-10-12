// XML related utilities

const Parser = require('node-xml-stream');
const fs = require('fs');

export type TagVisitor = (tag: string, attributes: Object) => void;
export type ClosingTagVisitor = (tag: string) => void;

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
    });

    parser.on('closetag', (tag: string) => {
      if (closingTagVisitor !== undefined) {
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

    const stream = fs.createReadStream(file);
    stream.pipe(parser);
  });
}

export function rootTag(file: string) : Promise<string> {

  return new Promise((resolve, reject) => {

    const parser = new Parser();

    parser.on('opentag', (tag: string, attrs: Object) => {
      resolve(tag);
    });

    parser.on('error', (err: string) => {
      reject(err);
    });

    const stream = fs.createReadStream(file);
    stream.pipe(parser);
  });
}

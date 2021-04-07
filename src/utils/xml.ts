// XML related utilities
const stream = require('stream');
const Parser = require('./parser.js');
const fs = require('fs');

export type TagVisitor = (tag: string, attributes: Object) => void;
export type ClosingTagVisitor = (tag: string) => void;

function getPastDocType(content: string) : string {
  if (content.indexOf('DOCTYPE') !== -1) {
    return content.substr(content.indexOf('>', content.indexOf('DOCTYPE')) + 1);
  }
  return content;
}

function inlineAttrName(attrs: any) {
  if (attrs['style'] === 'bold') {
    return 'bold';
  } else if (attrs['style'] === 'italic') {
    return 'italic';
  } else if (attrs['style'] === 'code') {
    return 'code';
  } else if (attrs['style'] === 'sub') {
    return 'sub';
  } else if (attrs['style'] === 'sup') {
    return 'sup';
  } else {
    return 'bold';
  }
}

function inlinesToObject(inlines: any) {
  return inlines.reduce(
    (m: any, style: any) => {
      m[style] = true;
      return m
    },
    {}
  )
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
            
            if (typeof (attrs as any)[k] === 'string' && (attrs as any)[k].endsWith('/')) {
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

function isInline(tag: string) {
  return tag === 'em';
}

function all(s: string, t: string) { 
  var re = new RegExp(t, 'g');
  return s.replace(re, '');
}

export function replaceAll(s: string, t: string, w: string) { 
  var re = new RegExp(t, 'g');
  return s.replace(re, w);
}

export function replaceUnicodeReferences(s: string) : string {

  return s.replace(/\&\#x.*;/g, (matched, index, original) => {
    const parsed = parseInt(matched.substring(3, matched.length - 1), 16);
    return String.fromCharCode(parsed);
  });
}

export function toJSON(xml: string, preserveMap = {}) : Promise<Object> {

  const root : any = {};
  root.children = [];

  const stack = [root];

  const top = () => stack[stack.length - 1];
  const pop = () => stack.pop();
  const push = (o: any) => stack.push(o);

  const inlines : any = [];

  return new Promise((resolve, reject) => {

    const parser = new Parser(preserveMap);

    parser.on('opentag', (tag: string, attrs: any) => {
      
      if (tag !== null) {
        let cleanedTag = tag.trim();
        if (cleanedTag.endsWith('/')) {
          cleanedTag = cleanedTag.substr(0, cleanedTag.length - 1);
        }

        if (isInline(cleanedTag)) {
          inlines.push(inlineAttrName(attrs));

        } else {
          const object : any = { type: cleanedTag, children: [] };

          Object.keys(attrs)
            .forEach((k) => {
              if (k !== '___selfClosing___' && (attrs as any)[k].endsWith('/')) {
                (attrs as any)[k] = (attrs as any)[k].substr(0, (attrs as any)[k].length - 1);
              }
            });
          Object.keys(attrs).forEach(k => {
            object[k] = typeof attrs[k] === 'string' ? replaceUnicodeReferences(attrs[k]) : attrs[k];
          });
          if (top() !== undefined) {
            
            top().children.push(object);
          }
          push(object);
        }

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
            top().children.push({ type: 'text', text});
          }
        }
      };

      const ensureNotEmpty = (e: string) => {
        if (tag === e) {
          if (top() && top().children.length === 0) {
            top().children.push({ type: 'text', text: ' '});
          }
        }
      };


      if (tag !== null) {

        ensureNotEmpty('p');
        ensureNotEmpty('th');
        ensureNotEmpty('td');
        ensureDefaultText('code_line', ' ');
        ensureDefaultText('h1', 'Section Header');
        ensureDefaultText('h2', 'Section Header');
        ensureDefaultText('h3', 'Section Header');
        ensureDefaultText('h4', 'Section Header');
        ensureDefaultText('h5', 'Section Header');
        ensureDefaultText('h6', 'Section Header');
        ensureNotEmpty('img');
        ensureNotEmpty('iframe');
        ensureNotEmpty('youtube');
        ensureNotEmpty('audio');
        ensureNotEmpty('li');

        if (top() && top().children === undefined) {
          top().children = [];
        }

        pop();
      }
    });

    parser.on('text', (raw: string) => {

      let text = replaceAll(raw, '&quot;', '\"');
      text = replaceAll(text, '&amp;', '&');
      text = replaceAll(text, '&lt;', '<');
      text = replaceAll(text, '&gt;', '>');
      text = replaceAll(text, '&apos;', '\'');
      
      text = replaceUnicodeReferences(text);
     
      const object : any = Object.assign({}, { text }, inlinesToObject(inlines));
      top().children.push(object);
    
    });
    parser.on('cdata', (cdata: string) => {
      top().children.push({ text: cdata });
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

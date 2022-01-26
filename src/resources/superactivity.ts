import * as Histogram from '../utils/histogram';
import { Resource, TorusResource, Summary } from './resource';
import { guid } from '../utils/common';
import * as XML from '../utils/xml';
import * as DOM from 'utils/dom';

export class Superactivity extends Resource {

  restructure($: any) : any {
    console.log('Superactivity restructure');
  }

  translate(xml: string, $: any) : Promise<(TorusResource | string)[]> {
    console.log('Superactivity translate');
    return new Promise((resolve, reject) => {
      XML.toJSON(xml, { p: true, em: true, li: true, td: true }).then((r: any) => {
        // console.log($.root().children().children('title').text());
        const legacyId = r.children[0].id;
        let title: string = 'Superactivity';
        const node = r.children[0].children[0];
        if (node.type === 'title') {
          title = node.children[0].text;
          console.log(`title ${title}`);
        }
        resolve([toActivity(defaultContent('embedded', 'index.html', title, xml),
                            legacyId, title)]);
      });
    });
  }

  summarize(file: string): Promise<string | Summary> {
    console.log('Superactivity summarize');
    const summary : Summary = {
      type: 'Summary',
      subType: 'Feedback',
      elementHistogram: Histogram.create(),
      id: '',
      found: () => [],
    };

    return new Promise((resolve, reject) => {

      XML.visit(file, (tag: string, attrs: Object) => {
        Histogram.update(summary.elementHistogram, tag, attrs);
        if (tag === 'feedback') {
          summary.id = (attrs as any)['id'];
        }
      })
      .then((result) => {
        resolve(summary);
      })
      .catch(err => reject(err));
    });
  }
}

function toActivity(content: any, legacyId: string, title: string) {

  const id = guid();

  return {
    type: 'Activity',
    id,
    originalFile: '',
    title,
    tags: [],
    unresolvedReferences: [],
    content,
    objectives: [],
    legacyId,
    subType: 'oli_embedded',
  };
}

type ActivityTypes = 'oli_embedded' | 'oli_ctat' | 'oli_logiclab' | 'oli_bio_sim' | 'oli_repl';

type ActivityOptions = {
  subType: ActivityTypes,
  base: string,
  src: string,
};

function determineSubType(doctype: string) : ActivityOptions {
  switch (doctype) {
    case 'embed_activity':
      return {
        subType: 'oli_embedded',
        base: 'embedded',
        src: 'index.html',
      };
    case 'ctat':
      return {
        subType: 'oli_ctat',
        base: 'embedded',
        src: 'index.html',
      };
    case 'logiclab':
      return {
        subType: 'oli_logiclab',
        base: 'embedded',
        src: 'index.html',
      };
    case 'bio_sim':
      return {
        subType: 'oli_bio_sim',
        base: 'embedded',
        src: 'index.html',
      };
    case 'repl':
      return {
        subType: 'oli_repl',
        base: 'embedded',
        src: 'index.html',
      };
    default:
      return null;
  }
}

function defaultContent(base: string, src: string, title: string, modelXml: string) {
  return {
    base,
    src,
    modelXml,
    resourceBase: guid(),
    resourceURLs: [],
    stem: '',
    title,
    authoring: {
      parts: [
        {
          id: guid(),
          scoringStrategy: 'average',
          responses: [],
          hints: [],
        },
      ],
      previewText: '',
    },
  };
}

function getChild(collection: any, named: string) {
  const items = collection.filter((e: any) => named === e.type);
  if (items.length > 0) {
    return items[0];
  }
  return undefined;
}
// base: 'oli_embedded',
//     src: 'index.html',
// : `<?xml version="1.0" encoding="UTF-8"?>
//     <!DOCTYPE embed_activity PUBLIC "-//Carnegie Mellon University//DTD Embed 1.1//EN" "http://oli.cmu.edu/dtd/oli-embed-activity_1.0.dtd">
//     <embed_activity id="custom_side" width="670" height="300">
//         <title>Custom Activity</title>
//         <source>webcontent/custom_activity/customactivity.js</source>
//         <assets>
//             <asset name="layout">webcontent/custom_activity/layout.html</asset>
//             <asset name="controls">webcontent/custom_activity/controls.html</asset>
//             <asset name="styles">webcontent/custom_activity/styles.css</asset>
//             <asset name="questions">webcontent/custom_activity/questions.xml</asset>
//         </assets>
//     </embed_activity>`

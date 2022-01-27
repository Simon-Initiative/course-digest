import * as Histogram from '../utils/histogram';
import { Resource, TorusResource, Summary } from './resource';
import { guid } from '../utils/common';
import * as XML from '../utils/xml';

export class Superactivity extends Resource {

  restructure($: any) : any {
  }

  translate(xml: string, $: any) : Promise<(TorusResource | string)[]> {
    const file = this.file;
    return new Promise((resolve, reject) => {
      XML.toJSON(xml, { p: true, em: true, li: true, td: true }).then((r: any) => {
        const legacyId = r.children[0].id;
        let title: string = 'Superactivity';
        const node = r.children[0].children[0];
        if (node.type === 'title') {
          title = node.children[0].text;
        }

        const defaults = determineActivityDefaults(r.children[0].type, file);
        if (!defaults) {
          resolve(['']);
        } else {
          resolve([toActivity(toActivityModel(defaults.base, defaults.src, title, xml),
                              legacyId, defaults.subType, title)]);
        }
      });
    });
  }

  summarize(file: string): Promise<string | Summary> {
    // @ts-ignore
    const id: string = !file ? '' : file.split('\\').pop().split('/').pop().split('\.').shift();
    const summary : Summary = {
      type: 'Summary',
      subType: 'Superactivity',
      elementHistogram: Histogram.create(),
      id,
      found: () => [],
    };

    return new Promise((resolve, reject) => {
      XML.visit(file, (tag: string, attrs: Object) => {
        Histogram.update(summary.elementHistogram, tag, attrs);
      })
      .then((result) => {
        resolve(summary);
      })
      .catch(err => reject(err));
    });
  }
}

function toActivity(content: any, legacyId: string, subType: string, title: string) {

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
    subType,
  };
}

type ActivityTypes = 'oli_embedded' | 'oli_ctat' | 'oli_ctat2' | 'oli_logiclab' | 'oli_bio_sim' | 'oli_repl';

type ActivityOptions = {
  subType: ActivityTypes,
  base: string,
  src: string,
};

function determineActivityDefaults(doctype: string, file: string) : ActivityOptions | null {
  switch (doctype) {
    case 'embed_activity':
      return {
        subType: 'oli_embedded',
        base: 'embedded',
        src: 'index.html',
      };
    case 'ctat':
      if (file.indexOf('x-cmu-ctat-tutor2') !== -1) {
        return {
          subType: 'oli_ctat2',
          base: 'ctat2',
          src: 'tutor.html',
        };
      }
      return {
        subType: 'oli_ctat',
        base: 'ctat',
        src: 'tutor.html',
      };
    case 'logiclab':
      return {
        subType: 'oli_logiclab',
        base: 'logiclab',
        src: 'logiclab.html',
      };
    case 'bio_sim':
      return {
        subType: 'oli_bio_sim',
        base: 'bio_simulator',
        src: 'simulator.html',
      };
    case 'repl':
      return {
        subType: 'oli_repl',
        base: 'repl',
        src: 'repl.html',
      };
    default:
      return null;
  }
}

function toActivityModel(base: string, src: string, title: string, modelXml: string) {
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

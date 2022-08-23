import * as Histogram from 'src/utils/histogram';
import { Resource, TorusResource, Summary, Page } from './resource';
import { guid } from 'src/utils/common';
import * as XML from 'src/utils/xml';
import { Maybe } from 'tsmonad';

export class Superactivity extends Resource {
  flagContentWarnigns(_$: any, _page: Page) {
    return;
  }

  translate($: any): Promise<(TorusResource | string)[]> {
    const xml = $.html();
    const file = this.file;
    const navigable = this.navigable;
    return new Promise((resolve, _reject) => {
      XML.toJSON(xml, { p: true, em: true, li: true, td: true }).then(
        (r: any) => {
          const legacyId = r.children[0].id;
          let title = 'Superactivity';
          const node = r.children[0].children[0];
          if (node.type === 'title') {
            title = node.children[0].text;
          }

          const defaults = determineActivityDefaults(r.children[0].type, file);
          if (!defaults) {
            resolve(['']);
          } else {
            if (file.includes('x-oli-embed-activity-highstakes') || navigable) {
              const activity = toActivity(
                toActivityModel(defaults.base, defaults.src, title, xml),
                guid(),
                defaults.subType,
                title
              );
              const model = [
                {
                  type: 'activity_placeholder',
                  children: [],
                  idref: activity.legacyId,
                },
              ];
              const page: Page = {
                type: 'Page',
                id: legacyId,
                originalFile: '',
                title,
                tags: [],
                unresolvedReferences: [],
                content: { model },
                isGraded: true,
                isSurvey: false,
                objectives: [],
                warnings: [],
              };
              resolve([page, activity]);
            } else {
              resolve([
                toActivity(
                  toActivityModel(defaults.base, defaults.src, title, xml),
                  legacyId,
                  defaults.subType,
                  title
                ),
              ]);
            }
          }
        }
      );
    });
  }

  summarize(): Promise<string | Summary> {
    const id = Maybe.maybe(
      this.file.split('\\')?.pop()?.split('/')?.pop()?.split('.').shift()
    ).caseOf({
      just: (id) => id,
      nothing: () => '',
    });

    const summary: Summary = {
      type: 'Summary',
      subType: 'Superactivity',
      elementHistogram: Histogram.create(),
      id,
      found: () => [],
    };

    return new Promise((resolve, reject) => {
      XML.visit(this.file, (tag: string, attrs: Record<string, unknown>) => {
        Histogram.update(summary.elementHistogram, tag, attrs);
      })
        .then((_result) => {
          resolve(summary);
        })
        .catch((err) => reject(err));
    });
  }
}

function toActivity(
  content: any,
  legacyId: string,
  subType: string,
  title: string
) {
  const id = guid();

  const partIds: any[] = content.authoring.parts.map((p: any) => p.id);

  const objectives = partIds.reduce((m: any, id: any) => {
    m[id] = [];
    return m;
  }, {});

  return {
    type: 'Activity',
    id,
    originalFile: '',
    title,
    tags: [],
    unresolvedReferences: [],
    content,
    objectives,
    legacyId,
    subType,
    warnings: [],
  };
}

type ActivityTypes =
  | 'oli_embedded'
  | 'oli_ctat'
  | 'oli_ctat2'
  | 'oli_logiclab'
  | 'oli_bio_sim'
  | 'oli_repl'
  | 'oli_linked_activity';

type ActivityOptions = {
  subType: ActivityTypes;
  base: string;
  src: string;
};

function determineActivityDefaults(
  doctype: string,
  file: string
): ActivityOptions | null {
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
    case 'linked_activity':
      return {
        subType: 'oli_embedded',
        base: 'embedded',
        src: 'index.html',
      };
    // return {
    //   subType: 'oli_linked_activity',
    //   base: 'linked',
    //   src: 'linked.html',
    // };
    default:
      return null;
  }
}

function toActivityModel(
  base: string,
  src: string,
  title: string,
  modelXml: string
) {
  return {
    base,
    src,
    modelXml,
    resourceBase: guid(),
    resourceURLs: [],
    stem: {
      id: guid(),
      content: [
        {
          id: guid(),
          type: 'p',
          children: [
            {
              text: '',
            },
          ],
        },
      ],
    },
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

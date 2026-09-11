import * as Histogram from 'src/utils/histogram';
import {
  Resource,
  TorusResource,
  Summary,
  Page,
  defaultCollabSpaceDefinition,
} from './resource';
import { guid } from 'src/utils/common';
import * as XML from 'src/utils/xml';
import { Maybe } from 'tsmonad';
import { ProjectSummary } from 'src/project';

export class Superactivity extends Resource {
  flagContentWarnigns(_$: any, _page: Page) {
    return;
  }

  translate(
    $: any,
    projectSummary: ProjectSummary
  ): Promise<(TorusResource | string)[]> {
    const xml = $.html();
    const file = this.file;
    const navigable = this.navigable;
    return new Promise((resolve, _reject) => {
      XML.toJSON(xml, projectSummary, {
        p: true,
        em: true,
        li: true,
        td: true,
      }).then((r: any) => {
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
          const requiresWrapper =
            r.children[0].type === 'linked_activity' ||
            file.includes('x-oli-embed-activity-highstakes') ||
            file.includes('x-cmu-ctat-tutor2') ||
            file.includes('x-cmu-ctattutors') ||
            navigable;
          if (requiresWrapper) {
            // Torus cannot navigate directly to an activity. Preserve the
            // source id as legacyId on both resources so legacy links resolve
            // to this scored wrapper while its placeholder still resolves to
            // the embedded activity.
            const activity = toActivity(
              toActivityModel(
                defaults.base,
                defaults.src,
                title,
                xml,
                projectSummary.mediaSummary.webContentBundle?.name
              ),
              legacyId,
              defaults.subType,
              title
            );
            const model: any[] = [
              {
                type: 'activity_placeholder',
                children: [],
                idref: activity.legacyId,
              },
            ];
            const derivedResources: TorusResource[] = [];

            if (isILogosLinkedActivity(r.children[0].type, xml)) {
              // iLogos diagrams require instructor review and do not call endAttempt.
              // Mark the embedded activity for manual grading and add an unscored
              // confirmation activity so the scored wrapper retains its Submit button.
              activity.content.authoring.parts[0].gradingApproach = 'manual';

              const confirmation = toActivity(
                toILogosCompletionModel(),
                `${legacyId}-completion-confirmation`,
                'oli_check_all_that_apply',
                'Diagram Completion Confirmation'
              );

              // A survey excludes the confirmation from the wrapper's score while its
              // second activity prevents Torus's singleton-superactivity auto-finalization.
              model.push({
                type: 'survey',
                id: guid(),
                children: [
                  {
                    type: 'activity-reference',
                    activity_id: confirmation.id,
                    id: guid(),
                  },
                ],
              });
              derivedResources.push(confirmation);
            }
            const page: Page = {
              type: 'Page',
              id: legacyId,
              legacyPath: '',
              legacyId,
              title,
              tags: [],
              unresolvedReferences: [],
              content: { model },
              isGraded: true,
              isSurvey: false,
              objectives: [],
              warnings: [],
              collabSpace: defaultCollabSpaceDefinition(),
            };
            resolve([page, activity, ...derivedResources]);
          } else {
            resolve([
              toActivity(
                toActivityModel(
                  defaults.base,
                  defaults.src,
                  title,
                  xml,
                  projectSummary.mediaSummary.webContentBundle?.name
                ),
                legacyId,
                defaults.subType,
                title
              ),
            ]);
          }
        }
      });
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

function isILogosLinkedActivity(type: string, xml: string): boolean {
  // Media rewriting changes directory paths before translation, but preserves the
  // distinctive iLogos driver filename declared by each linked diagram activity.
  return type === 'linked_activity' && /ilogosdriver\.js/i.test(xml);
}

function toILogosCompletionModel() {
  const partId = guid();
  const choiceId = guid();
  const correctResponseId = guid();

  return {
    type: 'TargetedCATA',
    stem: {
      id: guid(),
      content: [
        {
          type: 'p',
          children: [{ text: 'Confirm completion:' }],
        },
      ],
    },
    choices: [
      {
        id: choiceId,
        content: [
          {
            type: 'p',
            children: [{ text: 'I have completed my diagram.' }],
          },
        ],
      },
    ],
    authoring: {
      version: 2,
      parts: [
        {
          id: partId,
          gradingApproach: 'automatic',
          outOf: null,
          responses: [
            {
              id: correctResponseId,
              score: 1,
              rule: `input like {${choiceId}}`,
              feedback: makeFeedback('Completion confirmed.'),
            },
            {
              id: guid(),
              score: 0,
              rule: 'input like {.*}',
              feedback: makeFeedback(
                'Please confirm that you completed your diagram.'
              ),
            },
          ],
          hints: [makeHint(), makeHint(), makeHint()],
          objectives: [],
          explanation: null,
          targeted: [],
        },
      ],
      transformations: [],
      previewText: '',
      targeted: [],
      correct: [[choiceId], correctResponseId],
      incorrect: [],
    },
  };
}

function makeFeedback(text: string) {
  return {
    id: guid(),
    content: [{ type: 'p', children: [{ text }] }],
  };
}

function makeHint() {
  return makeFeedback('');
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
    legacyPath: '',
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
          subType: 'oli_embedded',
          base: 'ctat2',
          src: 'tutor.html',
        };
      }
      if (file.indexOf('x-cmu-ctattutors') !== -1) {
        return {
          subType: 'oli_embedded',
          base: 'ctattutors',
          src: 'tutor.html',
        };
      }
      return {
        subType: 'oli_embedded',
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
        subType: 'oli_embedded',
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
    default:
      return null;
  }
}

function toActivityModel(
  base: string,
  src: string,
  title: string,
  modelXml: string,
  resourceBase?: string
) {
  return {
    base,
    src,
    modelXml,
    resourceBase: resourceBase ? 'bundles/' + resourceBase : guid(),
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
          responses: [],
          hints: [],
        },
      ],
      previewText: '',
    },
  };
}

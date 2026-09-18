import * as Histogram from 'src/utils/histogram';
import {
  Resource,
  TorusResource,
  Summary,
  Page,
  Activity,
  defaultCollabSpaceDefinition,
} from './resource';
import { guid } from 'src/utils/common';
import * as XML from 'src/utils/xml';
import { Maybe } from 'tsmonad';
import { ProjectSummary } from 'src/project';

export const ILOGOS_COMPLETION_ID = 'migration-ilogos-diagram-completion';

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
              // iLogos reports no score. Keep it automatically graded and add a
              // simple scored completion question so the wrapper retains its Submit
              // button without relying on singleton-superactivity auto-finalization.
              (activity.content as any).authoring.parts[0].gradingApproach =
                'automatic';

              const confirmation = toActivity(
                toILogosCompletionModel(),
                ILOGOS_COMPLETION_ID,
                'oli_check_all_that_apply',
                'Diagram Completion Confirmation'
              );
              confirmation.scope = 'banked';
              confirmation.tags = [ILOGOS_COMPLETION_ID];

              // Select the shared banked question rather than embedding a separate copy
              // in every wrapper, so its wording can be edited in one place in Torus.
              model.push({
                type: 'selection',
                id: guid(),
                count: 1,
                logic: {
                  conditions: {
                    operator: 'all',
                    children: [
                      {
                        fact: 'tags',
                        operator: 'equals',
                        value: [ILOGOS_COMPLETION_ID],
                      },
                    ],
                  },
                },
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

// Each linked iLogos resource is converted independently and initially emits the
// same standard bank question. Keep one shared copy after resource discovery.
export function deduplicateILogosCompletionActivity(
  resources: TorusResource[]
): TorusResource[] {
  let found = false;

  return resources.filter((resource) => {
    if (
      resource.type !== 'Activity' ||
      resource.legacyId !== ILOGOS_COMPLETION_ID
    ) {
      return true;
    }

    if (found) return false;
    found = true;
    return true;
  });
}

const ILOGOS_ARGUMENT_INSTRUCTION = 'diagram the following argument';

function nodeText(node: any): string {
  if (node === null || node === undefined) return '';
  if (typeof node.text === 'string') return node.text;
  if (!Array.isArray(node.children)) return '';

  return node.children.map(nodeText).join('');
}

function normalizedText(node: any): string {
  return nodeText(node).replace(/\s+/g, ' ').trim().toLowerCase();
}

function containsLinkTo(node: any, idref: string): boolean {
  if (node === null || node === undefined || typeof node !== 'object') {
    return false;
  }
  if (node.type === 'a' && node.idref === idref) return true;

  return (
    Array.isArray(node.children) &&
    node.children.some((child: any) => containsLinkTo(child, idref))
  );
}

function isBoldParagraph(node: any): boolean {
  if (node?.type !== 'p' || !Array.isArray(node.children)) return false;

  const textLeaves: any[] = [];
  const collectTextLeaves = (child: any) => {
    if (child === null || child === undefined) return;
    if (typeof child.text === 'string' && child.text.trim() !== '') {
      textLeaves.push(child);
    }
    if (Array.isArray(child.children)) {
      child.children.forEach(collectTextLeaves);
    }
  };
  collectTextLeaves(node);

  return (
    textLeaves.length > 0 &&
    textLeaves.every((leaf: any) => leaf.strong === true)
  );
}

function cloneContent<T>(content: T): T {
  return JSON.parse(JSON.stringify(content));
}

function isILogosActivityResource(
  resource: TorusResource
): resource is Activity {
  if (resource.type !== 'Activity') return false;

  const modelXml = (resource as Activity).content.modelXml;
  return (
    typeof modelXml === 'string' &&
    /<linked_activity(?:\s|>)/i.test(modelXml) &&
    /ilogosdriver\.js/i.test(modelXml)
  );
}

// Linked iLogos wrappers are synthesized independently from the bank questions that
// launch them. Recover each question's displayed argument and repeat it above the
// diagram editor so students do not have to navigate back to the selecting quiz.
export function addILogosArgumentsToWrapperPages(
  resources: TorusResource[]
): TorusResource[] {
  const ilogosIds = new Set(
    resources
      .filter(isILogosActivityResource)
      .map((activity) => activity.legacyId)
  );
  if (ilogosIds.size === 0) return resources;

  const argumentsByILogosId = new Map<
    string,
    { content: any[]; signature: string }
  >();
  const conflictingILogosIds = new Set<string>();

  resources
    .filter(
      (resource): resource is Activity =>
        resource.type === 'Activity' &&
        (resource as Activity).scope === 'banked'
    )
    .forEach((source) => {
      const stemContent = (source.content as any).stem?.content;
      if (!Array.isArray(stemContent)) return;

      ilogosIds.forEach((ilogosId) => {
        if (conflictingILogosIds.has(ilogosId)) return;

        const linkIndex = stemContent.findIndex((node: any) =>
          containsLinkTo(node, ilogosId)
        );
        if (linkIndex === -1) return;

        let instructionIndex = -1;
        for (let i = linkIndex - 1; i >= 0; i--) {
          if (
            normalizedText(stemContent[i]).startsWith(
              ILOGOS_ARGUMENT_INSTRUCTION
            )
          ) {
            instructionIndex = i;
            break;
          }
        }
        const argument = stemContent[instructionIndex + 1];

        if (
          instructionIndex === -1 ||
          instructionIndex + 1 >= linkIndex ||
          !isBoldParagraph(argument)
        ) {
          source.warnings.push({
            idref: ilogosId,
            description:
              'Could not copy the argument into the linked iLogos wrapper: expected “Diagram the following argument” followed by a bold paragraph.',
          });
          return;
        }

        const content = cloneContent([stemContent[instructionIndex], argument]);
        const signature = JSON.stringify(content);
        const existing = argumentsByILogosId.get(ilogosId);

        if (existing && existing.signature !== signature) {
          source.warnings.push({
            idref: ilogosId,
            description:
              'Did not copy an argument into the linked iLogos wrapper because different bank questions associate it with different arguments.',
          });
          argumentsByILogosId.delete(ilogosId);
          conflictingILogosIds.add(ilogosId);
          return;
        }

        if (!existing) {
          argumentsByILogosId.set(ilogosId, { content, signature });
        }
      });
    });

  return resources.map((resource) => {
    if (resource.type !== 'Page') return resource;

    const argument = argumentsByILogosId.get(resource.legacyId);
    if (!argument) return resource;

    const page = resource as Page;
    const model = (page.content as any).model;
    if (!Array.isArray(model)) return resource;

    // Page-level rich text must be enclosed in a content block. Otherwise Torus
    // traverses its text leaves as structural page elements.
    if (
      model[0]?.type === 'content' &&
      JSON.stringify(model[0].children) === argument.signature
    ) {
      return resource;
    }

    return {
      ...page,
      content: {
        ...page.content,
        model: [
          {
            type: 'content',
            id: guid(),
            children: cloneContent(argument.content),
          },
          ...model,
        ],
      },
    };
  });
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
          children: [{ text: 'Check here when your diagram is complete:' }],
        },
      ],
    },
    choices: [
      {
        id: choiceId,
        content: [
          {
            type: 'p',
            children: [{ text: 'Diagram complete' }],
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
              feedback: makeFeedback('Diagram completion box checked'),
            },
            {
              id: guid(),
              score: 0,
              rule: 'input like {.*}',
              feedback: makeFeedback('Diagram completion box unchecked'),
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
): Activity {
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

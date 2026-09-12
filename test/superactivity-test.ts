import {
  addLinkedActivityWrapperReferencesToOrganizations,
  updateDerivativeReferences,
} from 'src/convert';
import { MediaSummary } from 'src/media';
import { ProjectSummary } from 'src/project';
import {
  Activity,
  defaultCollabSpaceDefinition,
  Hierarchy,
  Page,
  TorusResource,
} from 'src/resources/resource';
import { Superactivity } from 'src/resources/superactivity';

const mediaSummary: MediaSummary = {
  mediaItems: {},
  missing: [],
  urlPrefix: '',
  downloadRemote: false,
  flattenedNames: {},
};

const projectSummary = new ProjectSummary('', '', '', mediaSummary);

describe('legacy linked activities', () => {
  test('creates a scored wrapper page while preserving activity provenance', async () => {
    const converted = await new Superactivity(
      './test/content/x-oli-linked-activity/improvement.xml',
      false
    ).convert(projectSummary);

    expect(converted).toHaveLength(2);

    const resources = converted.filter(
      (resource): resource is TorusResource => typeof resource !== 'string'
    );
    const wrapper = resources.find((resource) => resource.type === 'Page') as
      | Page
      | undefined;
    const activity = resources.find(
      (resource) => resource.type === 'Activity'
    ) as Activity | undefined;

    expect(wrapper).toEqual(
      expect.objectContaining({
        id: 'improvement',
        legacyId: 'improvement',
        title: 'Iterative Improvement',
        isGraded: true,
      })
    );
    expect(activity).toEqual(
      expect.objectContaining({
        legacyId: 'improvement',
        title: 'Iterative Improvement',
        subType: 'oli_embedded',
      })
    );

    const resolved = updateDerivativeReferences(resources);
    const resolvedWrapper = resolved.find(
      (resource) => resource.type === 'Page'
    ) as Page;

    expect(resolvedWrapper.content.model).toEqual([
      expect.objectContaining({
        type: 'group',
        children: [
          expect.objectContaining({
            type: 'activity-reference',
            activity_id: activity?.id,
          }),
        ],
      }),
    ]);
  });

  test('adds manual grading and an unscored completion confirmation to iLogos wrappers', async () => {
    const converted = await new Superactivity(
      './test/content/x-oli-linked-activity/ilogos.xml',
      false
    ).convert(projectSummary);

    const resources = converted.filter(
      (resource): resource is TorusResource => typeof resource !== 'string'
    );
    const wrapper = resources.find(
      (resource) => resource.type === 'Page'
    ) as Page;
    const activities = resources.filter(
      (resource): resource is Activity => resource.type === 'Activity'
    );
    const ilogos = activities.find(
      (activity) => activity.legacyId === 'ilogos_diagram'
    ) as Activity;
    const confirmation = activities.find(
      (activity) =>
        activity.legacyId === 'ilogos_diagram-completion-confirmation'
    ) as Activity;

    expect(converted).toHaveLength(3);
    expect((ilogos.content as any).authoring.parts[0].gradingApproach).toBe(
      'manual'
    );
    expect(confirmation).toEqual(
      expect.objectContaining({
        title: 'Diagram Completion Confirmation',
        subType: 'oli_check_all_that_apply',
      })
    );
    expect(confirmation.content).toEqual(
      expect.objectContaining({
        type: 'TargetedCATA',
        choices: [
          expect.objectContaining({
            content: [
              expect.objectContaining({
                children: [{ text: 'I have completed my diagram.' }],
              }),
            ],
          }),
        ],
      })
    );
    expect(wrapper.content.model).toEqual([
      expect.objectContaining({
        type: 'activity_placeholder',
        idref: 'ilogos_diagram',
      }),
      expect.objectContaining({
        type: 'survey',
        children: [
          expect.objectContaining({
            type: 'activity-reference',
            activity_id: confirmation.id,
          }),
        ],
      }),
    ]);

    const resolved = updateDerivativeReferences(resources);
    const resolvedWrapper = resolved.find(
      (resource) => resource.type === 'Page'
    ) as Page;

    expect(resolvedWrapper.content.model).toEqual([
      expect.objectContaining({
        type: 'group',
        children: [
          expect.objectContaining({
            type: 'activity-reference',
            activity_id: ilogos.id,
          }),
        ],
      }),
      expect.objectContaining({
        type: 'survey',
        children: [
          expect.objectContaining({
            activity_id: confirmation.id,
          }),
        ],
      }),
    ]);
  });

  test('adds reachable linked activity wrappers to the hierarchy root', () => {
    const assessment = {
      type: 'Page',
      id: 'quiz',
      legacyId: 'quiz',
      title: 'Quiz',
      legacyPath: '',
      tags: [],
      unresolvedReferences: ['diagram-pool'],
      warnings: [],
      content: {
        model: [
          {
            type: 'selection',
            logic: {
              conditions: {
                operator: 'all',
                children: [
                  {
                    fact: 'tags',
                    operator: 'equals',
                    value: ['diagram-pool'],
                  },
                ],
              },
            },
          },
        ],
      },
      isGraded: true,
      isSurvey: false,
      objectives: [],
      collabSpace: defaultCollabSpaceDefinition(),
    } as Page;
    const bankedQuestion = {
      type: 'Activity',
      id: 'bank-question',
      legacyId: 'diagram-pool',
      title: 'Bank question',
      legacyPath: '',
      tags: ['diagram-pool'],
      unresolvedReferences: ['diagram'],
      warnings: [],
      scope: 'banked',
      subType: 'oli_multiple_choice',
      objectives: [],
      content: {
        stem: {
          content: [
            {
              type: 'p',
              children: [
                {
                  type: 'a',
                  idref: 'diagram',
                  children: [{ text: 'Open diagram' }],
                },
              ],
            },
          ],
        },
      },
    } as Activity;
    const wrapper = {
      ...assessment,
      id: 'diagram',
      legacyId: 'diagram',
      title: 'Diagram Exercise',
      unresolvedReferences: [],
      content: { model: [] },
    } as Page;
    const linkedActivity = {
      ...bankedQuestion,
      id: 'embedded-diagram',
      legacyId: 'diagram',
      title: 'Diagram Exercise',
      tags: [],
      scope: undefined,
      content: { modelXml: '<linked_activity id="diagram" />' },
    } as Activity;
    const hierarchy = {
      type: 'Hierarchy',
      id: '',
      legacyId: '',
      legacyPath: '',
      title: '',
      tags: [],
      unresolvedReferences: [],
      warnings: [],
      children: [
        {
          type: 'container',
          id: 'course-content',
          title: 'Course Content',
          children: [{ type: 'item', idref: 'quiz', children: [] }],
        },
      ],
    } as Hierarchy;
    const product = {
      type: 'Product',
      id: 'short-product',
      legacyId: '',
      title: 'Short organization',
      legacyPath: '',
      tags: [],
      unresolvedReferences: [],
      warnings: [],
      children: [
        {
          type: 'container',
          id: 'short-content',
          title: 'Short Content',
          children: [{ type: 'item', idref: 'quiz', children: [] }],
        },
      ],
    } as any;
    const unrelatedProduct = {
      ...product,
      id: 'unrelated-product',
      title: 'Unrelated organization',
      children: [
        {
          type: 'container',
          id: 'unrelated-content',
          title: 'Unrelated Content',
          children: [{ type: 'item', idref: 'other-page', children: [] }],
        },
      ],
    } as any;

    addLinkedActivityWrapperReferencesToOrganizations(
      [
        assessment,
        bankedQuestion,
        wrapper,
        linkedActivity,
        product,
        unrelatedProduct,
      ],
      hierarchy
    );

    expect(hierarchy.children).toEqual([
      expect.objectContaining({
        type: 'container',
        title: 'Course Content',
      }),
      { type: 'item', idref: 'diagram', children: [] },
    ]);
    expect(product.children).toEqual([
      expect.objectContaining({
        type: 'container',
        title: 'Short Content',
      }),
      { type: 'item', idref: 'diagram', children: [] },
    ]);
    expect(unrelatedProduct.children).toHaveLength(1);
    expect(assessment.content.model).toHaveLength(1);
    expect(assessment.unresolvedReferences).toEqual(['diagram-pool']);
  });

  test('does not change ordinary pool assessments', () => {
    const assessment = {
      type: 'Page',
      id: 'quiz',
      legacyId: 'quiz',
      title: 'Quiz',
      legacyPath: '',
      tags: [],
      unresolvedReferences: [],
      warnings: [],
      content: { model: [{ type: 'selection', children: [] }] },
      isGraded: true,
      isSurvey: false,
      objectives: [],
      collabSpace: defaultCollabSpaceDefinition(),
    } as Page;
    const hierarchy = {
      type: 'Hierarchy',
      id: '',
      legacyId: '',
      legacyPath: '',
      title: '',
      tags: [],
      unresolvedReferences: [],
      warnings: [],
      children: [],
    } as Hierarchy;

    expect(
      addLinkedActivityWrapperReferencesToOrganizations([assessment], hierarchy)
    ).toBe(hierarchy);
    expect(hierarchy.children).toEqual([]);
    expect(assessment.content.model).toHaveLength(1);
  });

  test('does not duplicate a linked activity wrapper already in the hierarchy', () => {
    const bankedQuestion = {
      type: 'Activity',
      id: 'bank-question',
      legacyId: 'diagram-pool',
      title: 'Bank question',
      legacyPath: '',
      tags: ['diagram-pool'],
      unresolvedReferences: ['diagram'],
      warnings: [],
      scope: 'banked',
      subType: 'oli_multiple_choice',
      objectives: [],
      content: {
        stem: {
          content: [
            {
              type: 'p',
              children: [{ type: 'a', idref: 'diagram', children: [] }],
            },
          ],
        },
      },
    } as Activity;
    const wrapper = {
      type: 'Page',
      id: 'diagram',
      legacyId: 'diagram',
      title: 'Diagram Exercise',
      legacyPath: '',
      tags: [],
      unresolvedReferences: [],
      warnings: [],
      content: { model: [] },
      isGraded: true,
      isSurvey: false,
      objectives: [],
      collabSpace: defaultCollabSpaceDefinition(),
    } as Page;
    const linkedActivity = {
      ...bankedQuestion,
      id: 'embedded-diagram',
      legacyId: 'diagram',
      scope: undefined,
      content: { modelXml: '<linked_activity id="diagram" />' },
    } as Activity;
    const hierarchy = {
      type: 'Hierarchy',
      id: '',
      legacyId: '',
      legacyPath: '',
      title: '',
      tags: [],
      unresolvedReferences: [],
      warnings: [],
      children: [
        {
          type: 'container',
          id: 'existing',
          title: 'Existing',
          children: [{ type: 'item', idref: 'diagram', children: [] }],
        },
      ],
    } as Hierarchy;

    addLinkedActivityWrapperReferencesToOrganizations(
      [bankedQuestion, wrapper, linkedActivity],
      hierarchy
    );

    expect(hierarchy.children).toHaveLength(1);
    expect(hierarchy.children[0].title).toBe('Existing');
  });
});

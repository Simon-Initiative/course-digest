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
import { getWebBundleUrl } from 'src/media';
import * as DOM from 'src/utils/dom';
import * as fs from 'fs';

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
          if (
            file.includes('x-oli-embed-activity-highstakes') ||
            file.includes('x-cmu-ctat-tutor2') ||
            file.includes('x-cmu-ctattutors') ||
            navigable
          ) {
            // x-cmu-ctattutors using sequence files need special processing
            const modelXml = handleCtatSequenceFiles(xml, file, projectSummary);
            const activity = toActivity(
              toActivityModel(defaults.base, defaults.src, title, modelXml),
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

// Some x-cmu-ctattutors have <interface> element referencing an xml "sequence"
// file defining a set of problems rather than an HTML file to be loaded. These
// sequence files contain relative URL references that must be translated, but
// are not resource files we would otherwise handle, rather just webcontent files.
// Here we construct torus variant sequence file with translated URLs and add it
// to the webcontent tree, adjusting the sequence file reference in the given
// modelXML to point to the torus variant. Because superactivity code detects
// by url ending in "/sequence.xml" we put it in /torus/ subdir of original file
// Returns: possibly modified modelXml
function handleCtatSequenceFiles(
  modelXml: string,
  filePath: string,
  project: ProjectSummary
): string {
  const interfaceRef = modelXml.substring(
    modelXml.indexOf('<interface>') + '<interface>'.length,
    modelXml.indexOf('</interface>')
  );
  if (interfaceRef.endsWith('sequence.xml')) {
    if (!project.mediaSummary.webContentBundle?.name) {
      console.log(
        'CTAT w/sequence file requires webContentBundle option -- not handled'
      );
      return modelXml;
    }

    // ref was translated to web bundle URL. Get full path to file
    const legacyRef = interfaceRef.substring(
      interfaceRef.indexOf('/webcontent/')
    );
    const sequencePath = project.packageDirectory + '/content' + legacyRef;
    console.log('Converting CTAT sequence file ' + sequencePath);

    // translate asset refs in this file as we do for others.
    const $ = DOM.read(sequencePath, {
      xmlMode: true,
      selfClosingTags: false,
    });
    fixSequenceFileRefs(sequencePath, $, project);

    // to preserve /sequence.xml in path while leaving original file, we
    //  put transformed version into /torus/ subdirectory of original location
    const newPath = sequencePath.replace('sequence.xml', 'torus/sequence.xml');
    const dirPath = newPath.substring(0, newPath.lastIndexOf('/'));
    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath);
    fs.writeFileSync(newPath, $.html());

    // return modelXml adjusted to reference variant file
    const newRef = interfaceRef.replace('sequence.xml', 'torus/sequence.xml');
    return modelXml.replace(interfaceRef, newRef);
  }

  // else no sequence file, just return unchanged
  return modelXml;
}

function fixSequenceFileRefs(
  sequencePath: string,
  $: cheerio.Root,
  project: ProjectSummary
) {
  const fixAttr = (item: cheerio.Element, attrName: string) => {
    const value = $(item).attr(attrName);
    if (value) {
      const ref = { filePath: sequencePath, assetReference: value };
      const url = getWebBundleUrl(
        ref,
        project.packageDirectory,
        project.mediaSummary
      );
      if (url) {
        const newRef = url.slice(url.lastIndexOf('media/') + 6);
        $(item).attr(attrName, newRef);
      }
    }
  };

  $('Problems Problem').each((i: number, problem: any) => {
    fixAttr(problem, 'problem_file');
    fixAttr(problem, 'student_interface');
  });
}

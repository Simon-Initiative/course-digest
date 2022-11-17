import * as glob from 'glob';
import { ItemReference } from 'src/utils/common';
import * as Histogram from 'src/utils/histogram';
import * as DOM from 'src/utils/dom';
import * as XML from 'src/utils/xml';
import { failIfHasValue, failIfPresent } from './common';

import { Resource, TorusResource, Hierarchy, Summary } from './resource';
import { ProjectSummary } from 'src/project';

function removeSequences($: any) {
  const sequences = $('sequences');
  sequences.each((i: any, elem: any) => {
    $(elem).replaceWith($(elem).children());
  });
  const sequence = $('sequence');
  sequence.each((i: any, elem: any) => {
    $(elem).replaceWith($(elem).children());
  });
}

function flattenOrganization($: any) {
  const org = $('organization');
  org.each((i: any, elem: any) => {
    $(elem).replaceWith($(elem).children());
  });
}

export class Organization extends Resource {
  restructure($: any): any {
    failIfHasValue($, 'sequence', 'audience', 'instructor');
    failIfPresent($, ['include', 'unordered', 'supplement']);

    DOM.flattenResourceRefs($);
    DOM.mergeTitles($);
    removeSequences($);
    flattenOrganization($);
    DOM.rename($, 'unit', 'container');
    DOM.rename($, 'module', 'container');
    DOM.rename($, 'section', 'container');
  }

  restructureProduct($: any): any {
    DOM.flattenResourceRefs($);
    DOM.mergeTitles($);
    removeSequences($);
    DOM.rename($, 'unit', 'container');
    DOM.rename($, 'module', 'container');
    DOM.rename($, 'section', 'container');
  }

  translate(
    $: any,
    projectSummary: ProjectSummary
  ): Promise<(TorusResource | string)[]> {
    this.restructure($);
    const xml = $.html();
    const h: Hierarchy = {
      type: 'Hierarchy',
      id: '',
      legacyPath: '',
      legacyId: '',
      title: '',
      tags: [],
      unresolvedReferences: [],
      children: [],
      warnings: [],
    };

    return new Promise((resolve, _reject) => {
      XML.toJSON(xml, projectSummary).then((r: any) => {
        h.children = r.children;
        resolve([h]);
      });
    });
  }

  translateProduct(
    $: any,
    projectSummary: ProjectSummary
  ): Promise<(TorusResource | string)[]> {
    this.restructureProduct($);
    const xml = $.html();
    const h: Hierarchy = {
      type: 'Hierarchy',
      id: '',
      legacyPath: '',
      legacyId: '',
      title: '',
      tags: [],
      unresolvedReferences: [],
      children: [],
      warnings: [],
    };

    return new Promise((resolve, _reject) => {
      XML.toJSON(xml, projectSummary).then((r: any) => {
        r.children.forEach((c: any) => {
          // restructureProduct allows the org node to come through, so that we can
          // grab the title
          if (c.type === 'organization') {
            h.title = c.title.trim();
            h.children = c.children;
          }
        });

        resolve([h]);
      });
    });
  }

  summarize(): Promise<string | Summary> {
    const foundIds: ItemReference[] = [];
    const summary: Summary = {
      type: 'Summary',
      subType: 'Organization',
      id: '',
      elementHistogram: Histogram.create(),
      found: () => foundIds,
    };

    return new Promise((resolve, reject) => {
      XML.visit(this.file, (tag: string, attrs: Record<string, unknown>) => {
        Histogram.update(summary.elementHistogram, tag, attrs);

        if (tag === 'resourceref') {
          foundIds.push({ id: (attrs as any)['idref'].trim() });
        }
        if (tag === 'organization') {
          summary.id = (attrs as any)['id'];
        }
      })
        .then((_result) => {
          resolve(summary);
        })
        .catch((err) => reject(err));
    });
  }
}

// Locate all organizations and return an array of the file paths to the
// organization.xml file for each
export function locate(directory: string): Promise<string[]> {
  return new Promise((resolve, _reject) => {
    glob(
      `${directory}/organizations/*/organization.xml`,
      {},
      (err: any, files: any) => {
        resolve(files);
      }
    );
  });
}

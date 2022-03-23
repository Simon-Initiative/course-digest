import glob from "glob";
import { ItemReference } from "../utils/common";
import * as Histogram from "../utils/histogram";
import * as DOM from "../utils/dom";
import * as XML from "../utils/xml";

import { Resource, TorusResource, Hierarchy, Summary } from "./resource";

function removeSequences($: any) {
  const sequences = $("sequences");
  sequences.each((i: any, elem: any) => {
    $(elem).replaceWith($(elem).children());
  });
  const sequence = $("sequence");
  sequence.each((i: any, elem: any) => {
    $(elem).replaceWith($(elem).children());
  });
}

function flattenOrganization($: any) {
  const org = $("organization");
  org.each((i: any, elem: any) => {
    $(elem).replaceWith($(elem).children());
  });
}

export class Organization extends Resource {
  restructure($: any): any {
    DOM.flattenResourceRefs($);
    DOM.mergeTitles($);
    removeSequences($);
    flattenOrganization($);
    DOM.rename($, "unit", "container");
    DOM.rename($, "module", "container");
    DOM.rename($, "section", "container");
  }

  translate(xml: string, _$: any): Promise<(TorusResource | string)[]> {
    const h: Hierarchy = {
      type: "Hierarchy",
      id: "",
      originalFile: "",
      title: "",
      tags: [],
      unresolvedReferences: [],
      children: [],
    };

    return new Promise((resolve, _reject) => {
      XML.toJSON(xml).then((r: any) => {
        h.children = r.children;
        resolve([h]);
      });
    });
  }

  summarize(file: string): Promise<string | Summary> {
    const foundIds: ItemReference[] = [];
    const summary: Summary = {
      type: "Summary",
      subType: "Organization",
      id: "",
      elementHistogram: Histogram.create(),
      found: () => foundIds,
    };

    return new Promise((resolve, reject) => {
      XML.visit(file, (tag: string, attrs: Record<string, unknown>) => {
        Histogram.update(summary.elementHistogram, tag, attrs);

        if (tag === "resourceref") {
          foundIds.push({ id: (attrs as any)["idref"].trim() });
        }
        if (tag === "organization") {
          summary.id = (attrs as any)["id"];
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

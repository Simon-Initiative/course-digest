import * as Histogram from "../utils/histogram";
import { ItemReference } from "../utils/common";
import { Resource, TorusResource, Summary } from "./resource";
import * as XML from "../utils/xml";

export class Objectives extends Resource {
  restructure(_$: any): any {
    return;
  }

  translate(xml: string, $: any): Promise<(TorusResource | string)[]> {
    const objectives: TorusResource[] = [];
    const map: any = {};

    $("objective").each((i: any, elem: any) => {
      const id = $(elem).attr("id");
      const title = $(elem).text().trim();

      const o = {
        type: "Objective",
        id,
        originalFile: "",
        title,
        tags: [],
        unresolvedReferences: [],
        content: {},
        objectives: [],
      } as TorusResource;

      map[o.id] = o;

      objectives.push(o);
    });

    $("skillref").each((i: any, elem: any) => {
      const id = $(elem).attr("idref");
      const parentId = $(elem).parent().attr("idref");
      const o = map[parentId];
      o.objectives.push(id);
    });

    return Promise.resolve(objectives as TorusResource[]);
  }

  summarize(file: string): Promise<string | Summary> {
    const foundIds: ItemReference[] = [];
    const summary: Summary = {
      type: "Summary",
      subType: "Objectives",
      elementHistogram: Histogram.create(),
      id: "",
      found: () => foundIds,
    };

    return new Promise((resolve, reject) => {
      XML.visit(file, (tag: string, attrs: Record<string, unknown>) => {
        Histogram.update(summary.elementHistogram, tag, attrs);
      })
        .then((_result) => {
          resolve(summary);
        })
        .catch((err) => reject(err));
    });
  }
}

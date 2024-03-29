import * as csvWriter from 'csv-writer';

export type AttributeHistogram = { [index: string]: number };
export type ElementDetails = {
  element: string;
  count: number;
  attributes: AttributeHistogram;
};
export type ElementHistogram = { [index: string]: ElementDetails };

export type BucketedHistograms = { [index: string]: ElementHistogram };

// Create a new empty histogram
export function create() {
  return {};
}

// MUTATES an existing histogram to incorporate the observation of a particular
// element and its attributes
export function update(
  histogram: ElementHistogram,
  element: string,
  attrs: Record<string, unknown>
): void {
  if (histogram[element] === undefined) {
    const attributes = Object.keys(attrs).reduce((p, c) => {
      (p as any)[c] = 1;
      return p;
    }, {});
    histogram[element] = { element, count: 0, attributes: attributes };
  }

  const e = histogram[element];
  e.count += 1;
  e.attributes = Object.keys(attrs).reduce((p, c) => {
    if ((p as any)[c] === undefined) {
      (p as any)[c] = 1;
    } else {
      (p as any)[c] = (p as any)[c] + 1;
    }
    return p;
  }, e.attributes);

  return;
}

// Helper function for exported 'merge'.  This merges b into
// a, mutating a.
function mergeAll(a: ElementHistogram, b: ElementHistogram) {
  Object.keys(b).forEach((element) => {
    if (a[element] === undefined) {
      a[element] = {
        element,
        count: b[element].count,
        attributes: Object.assign({}, b[element].attributes),
      };
    } else {
      a[element].count += b[element].count;

      Object.keys(b[element].attributes).forEach((attr) => {
        if (a[element].attributes[attr] === undefined) {
          a[element].attributes[attr] = b[element].attributes[attr];
        } else {
          a[element].attributes[attr] += b[element].attributes[attr];
        }
      });
    }
  });
}

// Merges two histograms into one, does not mutate either of the original two
export function merge(a: ElementHistogram, b: ElementHistogram) {
  const merged = create();

  mergeAll(merged, a);
  mergeAll(merged, b);

  return merged;
}

// Determine the union of all elements, sort them as an array
function getUniqueElements(b: BucketedHistograms) {
  return Object.keys(
    Object.keys(b)
      .reduce((a, c) => [...a, ...Object.keys(b[c])], [])
      .reduce((a, c) => {
        if (a[c] === undefined) {
          a[c] = true;
        }
        return a;
      }, {} as any)
  ).sort();
}

function buildHeader(b: BucketedHistograms) {
  return [
    { id: 'element', title: 'element' },
    ...Object.keys(b).map((k: string) => {
      return {
        id: k,
        title: k,
      };
    }),
  ];
}

export function outputCSV(outDir: string, b: BucketedHistograms) {
  // Open the CSV writer with the header row defined
  const createCsvWriter = csvWriter.createObjectCsvWriter;
  const writer = createCsvWriter({
    path: `${outDir}/histogram.csv`,
    header: buildHeader(b),
  });

  // For each element, in order, create a record where the columns
  // are the bucket types and their counts for that element, along with
  // and entry for the element itself
  const records = getUniqueElements(b).map((element: string) => {
    return Object.keys(b).reduce(
      (a: any, t: any) => {
        a[t] = b[t][element] === undefined ? 0 : b[t][element].count;
        return a;
      },
      { element }
    );
  });

  return writer.writeRecords(records);
}

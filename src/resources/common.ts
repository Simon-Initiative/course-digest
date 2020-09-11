import { ItemReference } from '../utils/common';
import * as Histogram from '../utils/histogram';

export interface HasReferences {
  found: () => ItemReference[];
}

export interface HasHistogram {
  elementHistogram: Histogram.ElementHistogram;
}

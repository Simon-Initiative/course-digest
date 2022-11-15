const INLINE_MATH_DELIMITERS: [string, string][] = [
  ['$$', '$$'],
  ['\\(', '\\)'],
  ['\\[', '\\]'],
];

const checkForStartingDelimiter = (s: string) =>
  INLINE_MATH_DELIMITERS.find(([start, _end]) => s.endsWith(start));

type Text = { type: 'text'; text: string };
type InlineFormula = {
  type: 'formula_inline';
  src: string;
  subtype: 'latex';
  legacyBlockRendered: boolean;
};
type Node = Text | InlineFormula;

type ParserAccumulator = {
  nodes: Node[];
  current: string;
  lookingForEndDelimiter: undefined | string;
};

// Parses text and MathJAX formulas from a given string.
// Returns a list of strings where text strings are left as-is and
// formula strings are wrapped returned as <formula_inline src="..." />
export const parseMathJaxFormulas = (text: string) => {
  // Parse each character one at a time until a starting delimiter is reached.
  // Once a starting delimiter is found, the corresponding ending delimiter is set
  // and all text is stored into the curr state until the ending delimiter is reached.
  // Collect results in a texts array and formulas array
  const parsed = text.split('').reduce<ParserAccumulator>(
    (acc, c) => {
      const { nodes, current, lookingForEndDelimiter } = acc;
      const next: string = current + c;

      if (lookingForEndDelimiter) {
        // SPECIAL CASE: since a single $ is part of the $$ delimiter, we need to
        // specifically check that previous character is not $ when the current character is $.
        // If we find that we have reached another $ directly after a previous $, it does not mean
        // we just parsed an empty formula but in-fact it means that the delimiter to use actually
        // is $$. This effectively makes single $ with empty content impossible, but that is okay.
        if (lookingForEndDelimiter === '$' && next === '$') {
          // change the delimiter we are searching for from $ to $$
          return {
            ...acc,
            current: '',
            lookingForEndDelimiter: '$$',
          };
        }

        if (next.endsWith(lookingForEndDelimiter)) {
          // end formula
          return {
            // add current formula to formulas, leaving out the end delimiter
            nodes: [
              ...nodes,
              {
                type: 'formula_inline',
                subtype: 'latex',
                legacyBlockRendered:
                  lookingForEndDelimiter === '$$' ||
                  lookingForEndDelimiter === '\\]',
                src: next.slice(0, next.length - lookingForEndDelimiter.length),
              },
            ],
            current: '',
            lookingForEndDelimiter: undefined,
          };
        } else {
          // continue collecting formula chars
          return {
            ...acc,
            current: next,
          };
        }
      } else {
        const foundDelimiter = checkForStartingDelimiter(next);

        if (foundDelimiter) {
          const [startDelimiter, endDelimiter] = foundDelimiter;

          // begin formula
          return {
            // add current text to texts, leaving out the start delimiter
            nodes: [
              ...nodes,
              {
                type: 'text',
                text: next.slice(0, next.length - startDelimiter.length),
              },
            ],
            current: '',
            lookingForEndDelimiter: endDelimiter,
          };
        } else {
          // continue collecting text chars
          return {
            ...acc,
            current: next,
          };
        }
      }
    },
    { nodes: [], current: '', lookingForEndDelimiter: undefined }
  );

  if (parsed.nodes.length === 0) {
    // no formulas were parsed
    return false;
  }

  if (parsed.lookingForEndDelimiter) {
    // parsing ended in the middle of a formula, therefore this cannot be processed
    // as a valid mathjax expression
    console.warn(
      `MathJax parsing failed: Formula expression does not have a closing delimiter '${
        parsed.lookingForEndDelimiter
      }', at position ${text.length - parsed.current.length}`
    );

    return false;
  }

  const nodes = parsed.nodes;

  // add any remaining text in current to nodes as text
  if (parsed.current) {
    nodes.push({ type: 'text', text: parsed.current });
  }

  return nodes;
};

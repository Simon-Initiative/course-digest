import { visit, toJSON } from 'src/utils/xml';

const preserved = { p: true, em: true, li: true };

describe('xml visiting', () => {
  test('should find all tags', () => {
    const expectedTags = [
      { tag: 'b', attributes: {} },
      { tag: 'p', attributes: {} },
      { tag: 'test', attributes: { a: 'a', b: 'b' } },
    ];

    const visitor = (tag: string, attrs: any) => {
      const last = expectedTags[expectedTags.length - 1];
      expect(tag).toEqual(last.tag);
      expect(attrs).toEqual(last.attributes);
      expectedTags.pop();
    };

    expect(visit('./test/sample/11.xml', visitor)).resolves.toEqual(true);
  });
});

describe('xml conversion', () => {
  test('should convert nested inlines properly', () => {
    const xml = '<p><em style="code">This <em>is</em> some</em></p>';

    return toJSON(xml, preserved).then((result: any) => {
      const c = result.children[0].children;
      expect(c.length).toEqual(3);

      expect(c[0].text).toEqual('This ');
      expect(c[0].code).toEqual(true);
      expect(c[0].strong === undefined).toEqual(true);

      expect(c[1].text).toEqual('is');
      expect(c[1].strong).toEqual(true);
      expect(c[1].code).toEqual(true);

      expect(c[2].text).toEqual(' some');
      expect(c[2].code).toEqual(true);
      expect(c[2].strong === undefined).toEqual(true);
    });
  });

  test('should handle consecutive inlines', () => {
    const xml = '<p><em>This </em><em style="code">is</em><em> some</em></p>';

    return toJSON(xml, preserved).then((result: any) => {
      const c = result.children[0].children;
      expect(c.length).toEqual(3);

      expect(c[0].text).toEqual('This ');
      expect(c[0].strong).toEqual(true);
      expect(c[0].code === undefined).toEqual(true);

      expect(c[1].text).toEqual('is');
      expect(c[1].strong === undefined).toEqual(true);
      expect(c[1].code).toEqual(true);

      expect(c[2].text).toEqual(' some');
      expect(c[2].strong).toEqual(true);
      expect(c[2].code === undefined).toEqual(true);
    });
  });

  test('should convert with space', () => {
    const xml = '<p><em>A</em> <em>B</em></p>';

    return toJSON(xml, preserved).then((result: any) => {
      const c = result.children[0].children;
      expect(c.length).toEqual(3);

      expect(c[0].text).toEqual('A');
      expect(c[0].strong).toEqual(true);

      expect(c[1].text).toEqual(' ');
      expect(c[1].strong === undefined).toEqual(true);

      expect(c[2].text).toEqual('B');
      expect(c[2].strong).toEqual(true);
    });
  });

  test('should convert no inlines properly', () => {
    const xml = '<p>Here is some text </p>';

    return toJSON(xml, preserved).then((result: any) => {
      const c = result.children[0].children;
      expect(c.length).toEqual(1);

      expect(c[0].text).toEqual('Here is some text ');
      expect(c[0].strong === undefined).toEqual(true);
      expect(c[0].italic === undefined).toEqual(true);
      expect(c[0].code === undefined).toEqual(true);
    });
  });

  test('should convert MathJAX LaTeX embedded in feedback with $$ to formula_inline', async () => {
    const xml = `
        <response match="19" score="10" input="q3numeric">
            <feedback>Correct. $$\\mathrm{Density}\\;=\\;\\frac{44.65\\;\\mathrm g}{2.3\\;\\mathrm{mL}}\\;=\\;19\\;\\mathrm g/\\mathrm{mL}$$</feedback>
        </response>
    `;

    const result: any = await toJSON(xml, preserved);

    const response = result.children.find((c: any) => c.input === 'q3numeric');
    const feedback = response.children[0];

    expect(feedback.type).toBe('feedback');
    expect(feedback.children).toEqual([
      { text: 'Correct. ' },
      {
        type: 'formula_inline',
        src: '\\mathrm{Density}\\;=\\;\\frac{44.65\\;\\mathrm g}{2.3\\;\\mathrm{mL}}\\;=\\;19\\;\\mathrm g/\\mathrm{mL}',
        subtype: 'latex',
        legacyBlockRendered: true,
      },
    ]);
  });

  test('should convert MathJAX LaTeX embedded in feedback with \\( and \\) to formula_inline', async () => {
    const xml = `
        <response match="19" score="10" input="q3numeric">
            <feedback>Correct. \\(\\mathrm{Density}\\;=\\;\\frac{44.65\\;\\mathrm g}{2.3\\;\\mathrm{mL}}\\;=\\;19\\;\\mathrm g/\\mathrm{mL}\\)</feedback>
        </response>
    `;

    const result: any = await toJSON(xml, preserved);

    const response = result.children.find((c: any) => c.input === 'q3numeric');
    const feedback = response.children[0];

    expect(feedback.type).toBe('feedback');
    expect(feedback.children).toEqual([
      { text: 'Correct. ' },
      {
        type: 'formula_inline',
        src: '\\mathrm{Density}\\;=\\;\\frac{44.65\\;\\mathrm g}{2.3\\;\\mathrm{mL}}\\;=\\;19\\;\\mathrm g/\\mathrm{mL}',
        subtype: 'latex',
        legacyBlockRendered: false,
      },
    ]);
  });
});

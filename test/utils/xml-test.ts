import { visit } from '../../src/utils/xml';

describe('xml visiting', () => {
  test('should find all tags', () => {

    const expectedTags = [
      { tag: 'b', attributes: {} },
      { tag: 'p', attributes: {} },
      { tag: 'test', attributes: { a: 'a', b: 'b' } },
    ];

    const visitor = (tag: string, attrs: Object) => {
      const last = expectedTags[expectedTags.length - 1];
      expect(tag).toEqual(last.tag);
      expect(attrs).toEqual(last.attributes);
      expectedTags.pop();
    };

    expect(visit('./test/sample/11.xml', visitor)).resolves.toEqual(true);
  });

});

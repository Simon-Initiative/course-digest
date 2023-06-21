import { ensureNoEmptyChildren } from 'src/resources/questions/common';

describe('ensureNoEmptyChildren', () => {
  test('should add a default child if children is an empty array', () => {
    const children: any[] = [];
    const result = ensureNoEmptyChildren(children);
    expect(result).toEqual([{ text: '' }]);
  });

  test('should not modify children if it is not an array', () => {
    const children = 'not an array';
    const result = ensureNoEmptyChildren(children);
    expect(result).toEqual('not an array');
  });

  test('should add empty text node to empty children', () => {
    const children = [
      {
        type: 'p',
        children: [{ text: 'not empty' }],
      },
      {
        type: 'p',
        children: [],
      },
      {
        type: 'p',
        children: [
          { text: 'not empty' },
          {
            type: 'p',
            children: [],
          },
        ],
      },
    ];
    const result = ensureNoEmptyChildren(children);
    expect(result).toEqual([
      {
        type: 'p',
        children: [{ text: 'not empty' }], // Shouldn't modify this one
      },
      {
        type: 'p',
        children: [{ text: '' }], // Added this
      },
      {
        type: 'p',
        children: [
          { text: 'not empty' },
          {
            type: 'p',
            children: [{ text: '' }], // Added this
          },
        ],
      },
    ]);
  });
});

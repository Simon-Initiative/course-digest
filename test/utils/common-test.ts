import { toPlainText } from 'src/utils/common';

it('toPlainText returns string representation of content', () => {
  const contentModel = {
    model: [
      { text: 'this is bold. ', strong: true },
      { text: 'here is some more text' },
    ],
  };

  expect(toPlainText(contentModel)).toBe(
    'this is bold. here is some more text'
  );

  const contentChildren = {
    children: [{ text: 'some ', strong: true }, { text: 'text' }],
  };

  expect(toPlainText(contentChildren)).toBe('some text');

  const contentArray = [{ text: 'array of ', strong: true }, { text: 'text' }];

  expect(toPlainText(contentArray)).toBe('array of text');
});

import { mapResources } from 'src/utils/resources';

describe('mapResources', () => {
  test('should find two resources', () => {
    expect(mapResources('./test/sample')).resolves.toEqual({
      12: './test/sample/content/subdir/12.xml',
      11: './test/sample/content/11.xml',
    });
  });
});

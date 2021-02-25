import { mapResources } from '../../src/utils/resource_mapping';

describe('mapResources', () => {
  test('should find two resources', () => {

    expect(mapResources('./test/sample')).resolves.toEqual(
      {
        12: './test/sample/subdir/12.xml',
        11: './test/sample/11.xml',
      });
  });

});

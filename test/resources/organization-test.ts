import { locate, summarize, OrganizationSummary } from '../../src/resources/organization';

describe('organizations', () => {

  test('should locate two organizations', () => {

    const twoOrgs = [
      './test/organizations/another/organization.xml',
      './test/organizations/default/organization.xml',
    ];

    expect(locate('./test')).resolves.toEqual(twoOrgs);
  });

  test('should find fifty-three item references', () => {

    return summarize('./test/organizations/default/organization.xml')
    .then((summary: OrganizationSummary) => {
      expect(summary.itemReferences.length).toEqual(53);
      expect(summary.id).toEqual('kth-lvzn8qxk-1.0_default');
      expect(summary.version).toEqual('1.0');
    });
  });

});

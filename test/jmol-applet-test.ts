import * as path from 'path';
import { MediaSummary } from 'src/media';
import { ProjectSummary } from 'src/project';
import { convert } from 'src/convert';

const mediaSummary: MediaSummary = {
  mediaItems: {},
  missing: [],
  urlPrefix: 'https://example.com/media',
  downloadRemote: false,
  flattenedNames: {},
  webContentBundle: {
    name: 'test',
    url: 'https://example.com/media/bundles/test',
    items: [],
    totalSize: 0,
  },
};

const projectSummary = new ProjectSummary(
  path.resolve('./test'),
  '',
  '',
  mediaSummary
);

describe('jmol applet', () => {
  let results: any = {};

  beforeAll(async () => {
    return convert(
      projectSummary,
      './test/content/x-oli-workbook_page/jmol-applet.xml',
      true
    ).then((r) => {
      results = r;
    });
  });

  test('should convert jmol applet to iframe with encoded params', () => {
    const content = results[0].content.model[0].children;
    const [iframe] = content;

    const params = {
      progressbar: 'true',
      load:
        'https://example.com/media/bundles/test/webcontent/jmol/jmol/pdbs/methane_mir.pdb?ALLOWSORIGIN?',
      script: 'set background white; color cpk; wireframe 0.2;',
    };

    const expectedSrc =
      '/superactivity/jsmol/jmolframe.html' +
      `?idref=methane2&params=${encodeURIComponent(JSON.stringify(params))}`;

    expect(iframe.type).toBe('iframe');
    expect(iframe.src).toBe(expectedSrc);
    expect(iframe.width).toBe('130');
    expect(iframe.height).toBe('130');
  });
});

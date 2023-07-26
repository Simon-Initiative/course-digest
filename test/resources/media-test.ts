import { flatten, transformToFlatDirectory } from '../../src/media';

import * as cheerio from 'cheerio';

const testSummary = () => ({
  mediaItems: {},
  missing: [],
  urlPrefix: 'unit-test://media',
  downloadRemote: false,
  flattenedNames: {},
});

describe('Media conversions', () => {
  describe('flatten', () => {
    it('Should add in a hash to the path', () => {
      expect(
        flatten(
          {
            filePath: '.',
            assetReference: 'test/content/webcontent/polar-bear.jpg',
          },
          testSummary()
        )
      ).toEqual(
        'unit-test://media/48/487591d48552a1fea781e7437a88fd60/polar-bear.jpg'
      );
    });
  });

  describe('transformToFlatDirectory', () => {
    it('Should transform media urls', () => {
      const $ = cheerio.load(
        `<content>
            <audio src="./test/content/webcontent/F1L10s224.mp3" />
            <pronunciation src="./test/content/webcontent/F1L10s224.mp3" />
            <conjugate src="./test/content/webcontent/F1L10s224.mp3" />
            <image src="./test/content/webcontent/polar-bear.jpg" />
            <audio><track src="./test/content/webcontent/F1L10s224.mp3" /></audio>
            <video><source src="./test/content/webcontent/ammonium.mp4" /></video>
        </content>`,
        { normalizeWhitespace: true, xmlMode: true }
      );

      transformToFlatDirectory('.', $, testSummary(), '');

      expect($.html()).toContain(
        `<audio src=\"unit-test://media/95/954fb22bada7700b4adfdf1a8d93f157/F1L10s224.mp3\"/>`
      );
      expect($.html()).toContain(
        `<pronunciation src=\"unit-test://media/95/954fb22bada7700b4adfdf1a8d93f157/F1L10s224.mp3\"/>`
      );
      expect($.html()).toContain(
        `<conjugate src=\"unit-test://media/95/954fb22bada7700b4adfdf1a8d93f157/F1L10s224.mp3\"/>`
      );
      expect($.html()).toContain(
        `<image src=\"unit-test://media/48/487591d48552a1fea781e7437a88fd60/polar-bear.jpg\"/>`
      );
      expect($.html()).toContain(
        `<audio><track src=\"unit-test://media/95/954fb22bada7700b4adfdf1a8d93f157/F1L10s224.mp3\"/></audio>`
      );
      expect($.html()).toContain(
        `<video><source src=\"unit-test://media/f8/f82cb41d5a054fd271290be295075fe8/ammonium.mp4\"/></video> `
      );
    });
    /*
    it('Should not transform proxied asset urls', () => {
      const $ = cheerio.load(
        `<content>
              <embed_activity><source>test/content/webcontent/za5.html</source></embed_activity>
              <asset src="test/content/webcontent/za5.html" />
          </content>`,
        { normalizeWhitespace: true, xmlMode: true }
      );

      transformToFlatDirectory('.', $, testSummary());

      expect($.html()).toContain(
        `<embed_activity><source>test/content/webcontent/za5.html</source></embed_activity> `
      );
      expect($.html()).toContain(
        `<asset src=\"test/content/webcontent/za5.html\"/>`
      );
    });
    */
  });
});

import { flatten, transformToFlatDirectory } from '../../src/media';

import * as cheerio from 'cheerio';
import * as path from 'path';

const testSummary = () => ({
  mediaItems: {},
  missing: [],
  urlPrefix: 'unit-test://media',
  downloadRemote: false,
  flattenedNames: {},
});

const fixturePath = (...parts: string[]) =>
  path.resolve(process.cwd(), ...parts);

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

    it('Should treat ../../ paths as authored relative references', () => {
      expect(
        flatten(
          {
            filePath: fixturePath(
              'test',
              'content',
              'subdir',
              'deeper',
              'fake.xml'
            ),
            assetReference: '../../webcontent/abby.jpg',
          },
          testSummary()
        )
      ).toEqual(
        'unit-test://media/62/62dd67c254e1d067d385a32c3f51bf4d/abby.jpg'
      );
    });

    it('Should prefer nested sibling webcontent folders when present', () => {
      expect(
        flatten(
          {
            filePath: fixturePath(
              'test',
              'course_packages',
              'migration-4sdfykby_v_1_0-echo',
              'content',
              'PCH01',
              'x-oli-inline-assessment',
              'pch01_lbd08.xml'
            ),
            assetReference: '../webcontent/PCH01/image31.png',
          },
          testSummary()
        )
      ).toEqual(
        'unit-test://media/8f/8f18bd77025b1e099ce5de44061903d6/image31.png'
      );
    });

    it('Should resolve naked webcontent references from content root', () => {
      expect(
        flatten(
          {
            filePath: fixturePath(
              'test',
              'content',
              'subdir',
              'deeper',
              'fake.xml'
            ),
            assetReference: 'webcontent/abby.jpg',
          },
          testSummary()
        )
      ).toEqual(
        'unit-test://media/62/62dd67c254e1d067d385a32c3f51bf4d/abby.jpg'
      );
    });

    it('Should recover from over-traversed ../ segments for webcontent refs', () => {
      expect(
        flatten(
          {
            filePath: fixturePath(
              'test',
              'content',
              'subdir',
              'deeper',
              'fake.xml'
            ),
            assetReference: '../../../webcontent/abby.jpg',
          },
          testSummary()
        )
      ).toEqual(
        'unit-test://media/62/62dd67c254e1d067d385a32c3f51bf4d/abby.jpg'
      );
    });

    it('Should recover from over-traversed ../ segments for non-webcontent refs', () => {
      expect(
        flatten(
          {
            filePath: fixturePath(
              'test',
              'content',
              'subdir',
              'deeper',
              'fake.xml'
            ),
            assetReference:
              '../../../x-oli-skills_model/c04c22b2337f412c8feff2c06e43cef3.xml',
          },
          testSummary()
        )
      ).toEqual(
        'unit-test://media/74/74a0df3f73295f37f632da28368b4444/c04c22b2337f412c8feff2c06e43cef3.xml'
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
            <video src="./test/content/webcontent/ammonium.mp4" poster="./test/content/webcontent/polar-bear.jpg"></video>
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
        `<video src=\"unit-test://media/f8/f82cb41d5a054fd271290be295075fe8/ammonium.mp4\" poster=\"unit-test://media/48/487591d48552a1fea781e7437a88fd60/polar-bear.jpg\"/> `
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

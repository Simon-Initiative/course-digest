import {
  processCodeblock,
  standardContentManipulations,
} from 'src/resources/common';
import * as cheerio from 'cheerio';
import { toJSON } from 'src/utils/xml';
import { ProjectSummary } from 'src/project';
import { MediaSummary } from 'src/media';

const mediaSummary: MediaSummary = {
  mediaItems: {},
  missing: [],
  urlPrefix: '',
  downloadRemote: false,
  flattenedNames: {},
};

const projectSummary = new ProjectSummary('', '', '', mediaSummary);

describe('cdata and codeblocks', () => {
  test('should strip the element', () => {
    const content =
      '<codeblock syntax="java"><![CDATA[' + 'a\nb]]></codeblock>';

    const $ = cheerio.load(content, {
      normalizeWhitespace: false,
      xmlMode: true,
    });

    processCodeblock($);

    expect($.xml()).toEqual(
      '<codeblock syntax="java">' +
        '<code_line><![CDATA[a]]></code_line><code_line><![CDATA[b]]></code_line>' +
        '</codeblock>'
    );
  });

  test('should convert root images to block imgs', async () => {
    const content = '<root><image src="../webcontent/proof_prem.gif"/></root>';

    const $ = cheerio.load(content, {
      normalizeWhitespace: true,
      xmlMode: true,
    });

    standardContentManipulations($);

    const result: any = await toJSON($.xml(), projectSummary);
    const img = result.children[0].children[0];
    expect(img.type).toBe('img');
  });

  test('should convert some nested images to inline imgs', async () => {
    const content1 = '<p><image src="../webcontent/proof_prem.gif"/></p>';
    const content2 = '<a><image src="../webcontent/proof_prem.gif"/></a>';

    const $1 = cheerio.load(content1, {
      normalizeWhitespace: true,
      xmlMode: true,
    });
    const $2 = cheerio.load(content2, {
      normalizeWhitespace: true,
      xmlMode: true,
    });

    standardContentManipulations($1);
    const p1: any = await toJSON($1.xml(), projectSummary);
    const img1 = p1.children[0].children[0];
    expect(img1.type).toBe('img');

    standardContentManipulations($2);
    const p2: any = await toJSON($2.xml(), projectSummary);
    const img2 = p2.children[0].children[0];
    expect(img2.type).toBe('img_inline');
  });

  test('should reorder default alternative to be first', async () => {
    const content = `
    <alternatives id="abc" group="statistics.package">
      <default>Excel2019PC</default>
      <alternative value="StatCrunch">
        <p id="1">StatCrunch</p>
      </alternative>
      <alternative value="r">
        <p id="2">StatCrunch</p>
      </alternative>
      <alternative value="Excel2019PC">
        <p id="3">StatCrunch</p>
      </alternative>
      <alternative value="Python">
        <p id="4">StatCrunch</p>
      </alternative>
    </alternatives>
    `;

    const $ = cheerio.load(content, {
      normalizeWhitespace: true,
      xmlMode: true,
    });

    standardContentManipulations($);

    const result: any = await toJSON($.xml(), projectSummary);

    console.debug(result.children[0]);

    expect(result.children[0].children[0].type).toBe('alternative');
    expect(result.children[0].children[0].value).toBe('Excel2019PC');
    expect(result.children[0].children[0].id).toBe('Excel2019PC');
  });

  test('should infer video mime type from .webm source', async () => {
    const content = '<root><video src="../webcontent/sample.webm" /></root>';

    const $ = cheerio.load(content, {
      normalizeWhitespace: true,
      xmlMode: true,
    });

    standardContentManipulations($);

    const result: any = await toJSON($.xml(), projectSummary);
    const video = result.children[0].children[0];

    expect(video.type).toBe('video');
    expect(video.src[0].contenttype).toBe('video/webm');
  });

  test('should correct mismatched video mime type for .webm sources', async () => {
    const content =
      '<root><video><source src="../webcontent/sample.webm" type="video/mp4" /></video></root>';

    const $ = cheerio.load(content, {
      normalizeWhitespace: true,
      xmlMode: true,
    });

    standardContentManipulations($);

    const result: any = await toJSON($.xml(), projectSummary);
    const video = result.children[0].children[0];

    expect(video.type).toBe('video');
    expect(video.src[0].contenttype).toBe('video/webm');
  });
});

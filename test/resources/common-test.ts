import { processCodeblock } from "../../src/resources/common";
import * as cheerio from "cheerio";

describe("cdata and codeblocks", () => {
  test("should strip the element", () => {
    const content =
      '<codeblock syntax="java"><![CDATA[' + "a\nb]]></codeblock>";

    const $ = cheerio.load(content, {
      normalizeWhitespace: false,
      xmlMode: true,
    });

    processCodeblock($);

    expect($.xml()).toEqual(
      '<codeblock syntax="java">' +
        "<code_line><![CDATA[a]]></code_line><code_line><![CDATA[b]]></code_line>" +
        "</codeblock>"
    );
  });
});

import { standardContentManipulations } from 'src/resources/common';
import { isSubmitAndCompare } from 'src/resources/questions/common';
import * as cheerio from 'cheerio';
import { toJSON } from 'src/utils/xml';

it('should return submitAndCompare status', async () => {
  const content1 = `
    <question id="_u02_m01_privs_DIGT_5_1">
        <body>
            <p id="faeee8c4de834e81ae1fe9b7780e2947">Which statement best describes the
                university’s approach to enforcing the
                <link
                    href="https://www.cmu.edu/policies/information-technology/computing.html"
                    target="new" internal="false"> Computing Policy</link>?
            </p>
        </body>
        <multiple_choice shuffle="false" select="single" id="ans" labels="false">
            <choice value="formal">The Computing Policy focuses on the consistent application of
                formal penalties. </choice>
            <choice value="informal">The Computing Policy has a range of penalties that are
                applied based on intent and circumstance. </choice>
        </multiple_choice>
        <part id="e629bfc50e8345f38caba7e511874090">
            <skillref idref="c984f86c2c3144a28ac35b1190ccd403"/>
            <response match="formal" score="0">
                <feedback>
                    <p id="ace8e8424c5dd408aaf134451d8fc7830">Incorrect. The Computing
                        Policy explicitly considers things like intent and history when
                        enforcing violations.</p>
                </feedback>
            </response>
            <response match="informal" score="1">
                <feedback>
                    <p id="abcc5ec52f3c84e28ba5c25e3e26a2303">Correct. Circumstances are
                        considered carefully when enforcing the policy.</p>
                </feedback>
            </response>
            <hint>
                <p id="afdb39a44bf984064b3244e9b6e09035e">Does the computing policy contain a
                    list of prohibited behaviors with the punishment for each?</p>
            </hint>
            <hint>
                <p id="afcf9c3b9430b462994b7866a57215cf4">Are circumstances considered with
                    enforcing the computing policy?</p>
            </hint>
        </part>
    </question>
  `;

  const content2 = `
    <question id="_u2_m1_privs_DIGT_5_3">
        <body>
            <p id="ba600545e35d45dfb825e1b841e7d9ae">Briefly summarize Carnegie Mellon&apos;s
                approach to enforcement of the
                <link
                    href="https://www.cmu.edu/policies/information-technology/computing.html"
                    target="new" internal="false"> Computing Policy</link>.
            </p>
        </body>
        <short_answer id="choice" whitespace="trim" case_sensitive="false"/>
        <part id="d5f7ac03ff49463a901241f9010d6b94">
            <skillref idref="c984f86c2c3144a28ac35b1190ccd403"/>
            <skillref idref="b3c03a99437a4a609290e729305035b9"/>
            <response match="*" score="1" input="choice"/>
            <hint>
                <p id="af913d7a934944e6296999007f41549bc">Remember that the policy takes into
                    account intent and circumstances. It also acts similar to a community
                    standard guideline.</p>
            </hint>
            <explanation>
                <p id="ab78f6f3270cd4e7ea5a470f7478d572b">Enforcement of the Computing
                    Policy relies on general university policy and guidelines. This reflects the
                    fact that computing standards are simply an extension of community standards
                    for acceptable behavior. Because the range of possible offenses extends from
                    the trivial to the very severe, the enforcement options are very broad,
                    ranging from reprimands to legal action. The general approach to enforcement
                    is to be very cognizant of specific circumstances. Accidental violations,
                    for example, are likely to receive less severe penalties, while malicious or
                    repeated offenses will increase the severity of penalties.</p>
            </explanation>
        </part>
    </question>
  `;

  const getQuestionEl = (root: any) => root.children[0];

  const $1 = cheerio.load(content1, {
    normalizeWhitespace: true,
    xmlMode: true,
  });

  const $2 = cheerio.load(content2, {
    normalizeWhitespace: true,
    xmlMode: true,
  });

  standardContentManipulations($1);
  const root1: any = await toJSON($1.xml());
  const question1: any = getQuestionEl(root1);
  expect(isSubmitAndCompare(question1)).toBe(false);

  standardContentManipulations($2);
  const root2: any = await toJSON($2.xml());
  const question2: any = getQuestionEl(root2);
  expect(isSubmitAndCompare(question2)).toBe(true);
});

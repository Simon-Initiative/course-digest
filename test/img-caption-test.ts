import * as cheerio from 'cheerio';
import { standardContentManipulations } from 'src/resources/common';

describe('standardContentManipulations', () => {
  it('should wrap inline img captions in a paragraph', () => {
    const $ = cheerio.load(
      `<body>
        <img src="https://example.com/image.png" alt="alt text">
            <caption>Some Text<sub>subtext</sub> here.</caption>        
        </img>
    </body>`,
      {
        normalizeWhitespace: true,
        xmlMode: true,
      }
    );

    standardContentManipulations($);

    expect($('caption').children().length).toBe(1); // A single p child
    expect(($('caption').children().first()[0] as any).tagName).toBe('p');

    expect($('caption').children().first().text()).toBe(
      'Some Textsubtext here.'
    ); // With text unaltered

    expect($('caption').html()).toBe(
      '<p>Some Text<em style="sub">subtext</em> here.</p>'
    );
  });
});

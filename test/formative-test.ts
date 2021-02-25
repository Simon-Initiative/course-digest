import { Formative } from '../src/resources/formative';
const cheerio = require('cheerio');

describe('conversion to Torus resources', () => {
  test('should create a Torus Activity', () => {

    const f = new Formative();
    f.convert('./test/content/x-oli-inline-assessment/a_0cf7a2f6bb0d48cfb7202bf8794e18a4.xml')
    .then(results => {
      expect(results.length).toEqual(1);
    })
    
  });

});

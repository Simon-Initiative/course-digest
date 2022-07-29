import { locateImageReferences } from '../../../src/resources/questions/custom-dnd';

it('should locate two references', async () => {
  const layout = `
  #liquid {  
    margin: auto;
    background-image: url("liquid_flask.png");
    background-repeat: no-repeat;     
    width: 75px;  
    height: 200px;
}
  #gas {  
      margin: auto;
      background-image: url(https://example.com/test.png);
      background-repeat: no-repeat;     
      width: 75px;  
      height: 200px;
  }
  `;

  const r = locateImageReferences(layout, 'content/test/file/path/layout.xml');
  expect(r.length).toBe(1);
  expect((r[0] as any).assetReference).toBe(
    'content/test/file/path/liquid_flask.png'
  );
  expect((r[0] as any).originalReference).toBe('liquid_flask.png');
});

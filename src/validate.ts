import { Validator, Schema } from 'jsonschema';
import * as glob from 'glob';
import * as fs from 'fs';

const v = new Validator();
let count = 0;
const args = process.argv.slice(2);

loadSchemas(args[0]).then((pageSchema: Schema) => {
  validatePages(pageSchema);
});

function loadSchemas(dir: string) {
  return new Promise((resolve, _reject) => {
    let pageSchema: Schema | null = null;
    glob(`${dir}/*.json`, {}, (err: any, files: any) => {
      files.forEach((f: any) => {
        const json = readJSON(f);
        if (f.indexOf('page-content-basic.schema.json') !== -1) {
          pageSchema = json;
        }
        v.addSchema(json, json.id);
      });
      resolve(pageSchema as unknown as Schema);
    });
  });
}

function validatePages(pageSchema: Schema) {
  glob(`./out/*.json`, {}, (err: any, files: any) => {
    files.forEach((f: any) => maybeValidate(f, pageSchema));
  });
}

function maybeValidate(file: string, pageSchema: Schema) {
  const json = readJSON(file);
  if (json.type === 'Page') {
    validate(json, pageSchema);
  }
}

function validate(content: Record<string, unknown>, pageSchema: Schema) {
  (content.content as any).version = '0.1.0';
  const result = v.validate(content.content, pageSchema as unknown as Schema);
  count++;
  if (!result.valid) {
    console.log('Failed: ' + content.id);
    console.log(result);
  }
  if (count % 10 === 0) {
    console.log(count);
  }
}

function readJSON(file: string) {
  const content = fs.readFileSync(file);
  return JSON.parse(content.toString());
}

import * as AWS from 'aws-sdk';
import * as fs from 'fs';

export const upload = (
  file: string,
  url: string,
  mimeType: string,
  bucketName: string
) => {
  // Read content from the file
  const fileContent = fs.readFileSync(file);

  // Get the s3 path after host in URL of form https://host.com/foo/bar
  const s3Path = url.split('/').slice(3).join('/');

  // S3 keys are officially just arbitrary strings of UTF-8 characters. URLs that come here have been
  // URL encoded, but must pass NON-URL-encoded s3 Key to AWS API to avoid mismatch with expected url.
  // Otherwise, e.g. if file "foo bar.jpg" uploaded w/key "foo%20bar.jpg" it would require URL
  // https://.../foo%2520bar.jpg to access.
  const s3PathKey = decodeURIComponent(s3Path);

  // Setting up S3 upload parameters
  const params: AWS.S3.PutObjectRequest = {
    Bucket: bucketName,
    Key: s3PathKey,
    Body: fileContent,
    ContentType: mimeType,
  };

  const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  });

  // Uploading files to the bucket
  return new Promise((resolve, reject) => {
    s3.upload(params, (err: any, data: any) => {
      if (err) {
        reject(err);
        return;
      }
      if (data !== undefined) {
        resolve(data.Location);
        return;
      }
      reject(`S3 upload error: returned data is undefined for ${file}`);
    });
  });
};

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

  // Get the s3 path by removing the host (and leading slash returned by pathname) from the url
  // assumes the url string given is a valid url
  const s3Path = new URL(url).pathname.slice(1);

  // Setting up S3 upload parameters
  const params: AWS.S3.PutObjectRequest = {
    Bucket: bucketName,
    Key: s3Path,
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

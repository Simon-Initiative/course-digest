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
  // Get the s3 path by removing the host from the url, assume the host is the first part of the url and there is no protocol
  const s3Path = url.slice(url.indexOf('/') + 1);

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
      resolve('error');
    });
  });
};

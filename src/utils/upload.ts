import * as AWS from 'aws-sdk';
import * as fs from 'fs';

export const upload = (
  file: string,
  filename: string,
  mimeType: string,
  md5: string,
  bucketName: string
) => {
  // Read content from the file
  const fileContent = fs.readFileSync(file);

  const subDir = md5.substring(0, 2);
  // Setting up S3 upload parameters
  const params: AWS.S3.PutObjectRequest = {
    Bucket: bucketName,
    Key: `media/${subDir}/${md5}/${filename}`,
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
      }
      resolve(data.Location);
    });
  });
};

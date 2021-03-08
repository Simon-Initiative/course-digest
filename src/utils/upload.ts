const AWS = require('aws-sdk');
const fs = require('fs');

export const upload = (file: string, filename: string, slug: string) => {
  // Read content from the file
  const fileContent = fs.readFileSync(file);

  // Setting up S3 upload parameters
  const params = {
      Bucket: process.env.MEDIA_BUCKET_NAME,
      Key: 'media/' + slug + '/' + filename,
      Body: fileContent
  };

  const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  });

  // Uploading files to the bucket
  return new Promise((resolve, reject) => {
    s3.upload(params, function(err: any, data: any) {
      if (err) {
        reject(err);
      }
      resolve(data.Location);
    });
  });
};
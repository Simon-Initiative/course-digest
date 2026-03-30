import * as AWS from 'aws-sdk';
import * as fs from 'fs';

export interface UploadOptions {
  bucketName?: string;
  localMinio?: boolean;
}

export interface ResolvedUploadConfig {
  bucketName: string;
  localMinio: boolean;
  accessKeyId?: string;
  secretAccessKey?: string;
  endpoint?: string;
}

export function s3KeyFromUrl(url: string, bucketName: string): string {
  const { pathname } = new URL(url);

  const normalizedPath = pathname.replace(/^\/+/, '');
  const bucketPrefix = [`buckets/${bucketName}/`, `${bucketName}/`].find(
    (prefix) => normalizedPath.startsWith(prefix)
  );
  const pathWithoutBucketPrefix = bucketPrefix
    ? normalizedPath.slice(bucketPrefix.length)
    : normalizedPath;

  return decodeURIComponent(pathWithoutBucketPrefix);
}

export function resolveUploadConfig(
  options: UploadOptions = {}
): ResolvedUploadConfig {
  const localMinio = options.localMinio === true;
  const bucketName = localMinio
    ? options.bucketName ||
      process.env.MINIO_BUCKET_NAME ||
      process.env.MINIO_MEDIA_BUCKET_NAME ||
      'torus-media-dev'
    : options.bucketName ||
      process.env.MEDIA_BUCKET_NAME ||
      process.env.S3_MEDIA_BUCKET_NAME;

  if (bucketName === undefined) {
    throw Error('MEDIA_BUCKET_NAME not set in config');
  }

  const accessKeyId = localMinio
    ? process.env.MINIO_ROOT_USER
    : process.env.AWS_S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = localMinio
    ? process.env.MINIO_ROOT_PASSWORD
    : process.env.AWS_S3_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;

  if (localMinio && (!accessKeyId || !secretAccessKey)) {
    throw Error(
      'Missing MinIO credentials. Set MINIO_ROOT_USER and MINIO_ROOT_PASSWORD in .env.'
    );
  }

  return {
    bucketName,
    localMinio,
    accessKeyId,
    secretAccessKey,
    endpoint: localMinio
      ? process.env.MINIO_ENDPOINT ||
        process.env.AWS_ENDPOINT_URL ||
        `http://localhost:${process.env.AWS_S3_PORT || '9000'}`
      : undefined,
  };
}

export const upload = (
  file: string,
  url: string,
  mimeType: string,
  options: UploadOptions = {}
) => {
  // Read content from the file
  const fileContent = fs.readFileSync(file);
  const config = resolveUploadConfig(options);

  // S3 keys are officially just arbitrary strings of UTF-8 characters. URLs that come here have been
  // URL encoded, but must pass NON-URL-encoded s3 Key to AWS API to avoid mismatch with expected url.
  // Otherwise, e.g. if file "foo bar.jpg" uploaded w/key "foo%20bar.jpg" it would require URL
  // https://.../foo%2520bar.jpg to access.
  const s3PathKey = s3KeyFromUrl(url, config.bucketName);

  // Setting up S3 upload parameters
  const params: AWS.S3.PutObjectRequest = {
    Bucket: config.bucketName,
    Key: s3PathKey,
    Body: fileContent,
    ContentType: mimeType,
  };

  const s3Config: AWS.S3.ClientConfiguration = {
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
  };

  if (config.localMinio && config.endpoint) {
    s3Config.endpoint = new AWS.Endpoint(config.endpoint);
    s3Config.s3ForcePathStyle = true;
    s3Config.signatureVersion = 'v4';
  }

  const s3 = new AWS.S3(s3Config);

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

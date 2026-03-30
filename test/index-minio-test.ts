import {
  defaultLocalMinioMediaUrlPrefix,
  localMinioBucketName,
} from 'src/index';

const originalEnv = process.env;

describe('index MinIO defaults', () => {
  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.MINIO_BUCKET_NAME;
    delete process.env.MINIO_MEDIA_BUCKET_NAME;
    delete process.env.MEDIA_BUCKET_NAME;
    delete process.env.S3_MEDIA_BUCKET_NAME;
    delete process.env.MINIO_MEDIA_URL_PREFIX;
    delete process.env.MINIO_PUBLIC_URL;
    delete process.env.MINIO_ENDPOINT;
    delete process.env.AWS_S3_PORT;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should prefer explicit MinIO media url prefix from .env', () => {
    process.env.MINIO_MEDIA_URL_PREFIX =
      'http://localhost/buckets/torus-media-dev/media/';

    expect(defaultLocalMinioMediaUrlPrefix()).toBe(
      'http://localhost/buckets/torus-media-dev/media'
    );
  });

  it('should derive MinIO media url prefix from endpoint and bucket', () => {
    process.env.MINIO_ENDPOINT = 'http://localhost:9000/';
    process.env.MINIO_BUCKET_NAME = 'torus-media-dev';

    expect(localMinioBucketName()).toBe('torus-media-dev');
    expect(defaultLocalMinioMediaUrlPrefix()).toBe(
      'http://localhost:9000/torus-media-dev/media'
    );
  });
});

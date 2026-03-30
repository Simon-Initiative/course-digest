const mockUpload = jest.fn();
const mockS3 = jest.fn().mockImplementation(() => ({
  upload: mockUpload,
}));
const mockEndpoint = jest
  .fn()
  .mockImplementation((value: string) => ({ value }));

jest.mock('aws-sdk', () => ({
  S3: mockS3,
  Endpoint: mockEndpoint,
}));

import * as fs from 'fs';
import { resolveUploadConfig, s3KeyFromUrl, upload } from 'src/utils/upload';

const originalEnv = process.env;

describe('upload utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should strip bucket prefixes from local MinIO URLs', () => {
    expect(
      s3KeyFromUrl(
        'http://localhost/buckets/torus-media-dev/media/foo%20bar.jpg',
        'torus-media-dev'
      )
    ).toBe('media/foo bar.jpg');

    expect(
      s3KeyFromUrl(
        'http://localhost/torus-media-dev/media/foo%20bar.jpg',
        'torus-media-dev'
      )
    ).toBe('media/foo bar.jpg');
  });

  it('should keep normal S3 object paths unchanged', () => {
    expect(
      s3KeyFromUrl(
        'https://torus-media-dev.s3.amazonaws.com/media/foo%20bar.jpg',
        'torus-media-dev'
      )
    ).toBe('media/foo bar.jpg');
  });

  it('should resolve MinIO defaults for local development', () => {
    process.env.MINIO_ROOT_USER = 'minio-user';
    process.env.MINIO_ROOT_PASSWORD = 'minio-password';
    process.env.MINIO_BUCKET_NAME = 'minio-media-dev';
    process.env.AWS_S3_PORT = '9000';

    expect(resolveUploadConfig({ localMinio: true })).toEqual({
      bucketName: 'minio-media-dev',
      localMinio: true,
      accessKeyId: 'minio-user',
      secretAccessKey: 'minio-password',
      endpoint: 'http://localhost:9000',
    });
  });

  it('should ignore AWS credentials when local MinIO is enabled', () => {
    process.env.AWS_ACCESS_KEY_ID = 'aws-user';
    process.env.AWS_SECRET_ACCESS_KEY = 'aws-password';

    expect(() => resolveUploadConfig({ localMinio: true })).toThrow(
      'Missing MinIO credentials. Set MINIO_ROOT_USER and MINIO_ROOT_PASSWORD in .env.'
    );
  });

  it('should upload to MinIO using path-style S3 config', async () => {
    process.env.MINIO_ROOT_USER = 'minio-user';
    process.env.MINIO_ROOT_PASSWORD = 'minio-password';

    jest
      .spyOn(fs, 'readFileSync')
      .mockReturnValue(Buffer.from('file-content') as any);
    mockUpload.mockImplementation(
      (_params: unknown, callback: (err: any, data?: any) => void) =>
        callback(undefined, { Location: 'http://localhost/uploaded' })
    );

    await expect(
      upload(
        '/tmp/example.jpg',
        'http://localhost/buckets/torus-media-dev/media/example%20file.jpg',
        'image/jpeg',
        { localMinio: true }
      )
    ).resolves.toBe('http://localhost/uploaded');

    expect(mockEndpoint).toHaveBeenCalledWith('http://localhost:9000');
    expect(mockS3).toHaveBeenCalledWith({
      accessKeyId: 'minio-user',
      secretAccessKey: 'minio-password',
      endpoint: { value: 'http://localhost:9000' },
      s3ForcePathStyle: true,
      signatureVersion: 'v4',
    });
    expect(mockUpload).toHaveBeenCalledWith(
      {
        Bucket: 'torus-media-dev',
        Key: 'media/example file.jpg',
        Body: Buffer.from('file-content'),
        ContentType: 'image/jpeg',
      },
      expect.any(Function)
    );
  });
});

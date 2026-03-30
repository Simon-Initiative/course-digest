# Course Digest

This tool takes as input a full course package source tree and generates a histogram of XML element usage, bucketed by resource type and version, captured in a single `histogram.csv` output file.

## Running from source

Running form source requires having node version 10+, yarn, and git command line installed.

To generate a full course package digest using this tool from source:

```
git clone <this repository>
yarn install
npm start -- --operation convert --inputDir <course input dir>
```

Optionally, you can specify a specific output directory. Defaults to `<inputDir>-out`

```
npm start -- --operation convert --inputDir <course input dir> --outputDir ./out
```

Before uploading media assets, you will need to configure AWS credentials and a bucket name.
See detailed instructions in the [Wiki](https://github.com/Simon-Initiative/course-digest/wiki).

For local OLI development against MinIO, the uploader now supports `--localMinio`
and reads its MinIO settings from the repo root `.env` file. Add entries like:

```bash
MINIO_ROOT_USER=your_minio_access_key
MINIO_ROOT_PASSWORD=your_minio_secret_key
MINIO_BUCKET_NAME=torus-media-dev
MINIO_ENDPOINT=http://localhost:9000
# Optional if browser-facing media URLs differ from the API endpoint
MINIO_MEDIA_URL_PREFIX=http://localhost:9000/torus-media-dev/media
```

Then run conversion with `--localMinio`. If `MINIO_MEDIA_URL_PREFIX` is omitted,
the tool derives it from `MINIO_ENDPOINT` and the configured bucket:

```bash
npm run start -- convert --inputDir <course input dir> --localMinio
```

You can also upload an existing media manifest into local MinIO directly:

```bash
npm run start -- upload --mediaManifest <outputDir/_media-manifest.json> --localMinio
```

The tool can also be used to [convert questions exported in QTI format](https://github.com/Simon-Initiative/course-digest/wiki/QTI-Conversion-mode).

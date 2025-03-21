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

The tool can also be used to [convert questions exported in QTI format](https://github.com/Simon-Initiative/course-digest/wiki/QTI-Conversion-mode).

# Course Digest

This tool takes as input a full course package source tree and generates a histogram of XML element usage, bucketed by resource type and version, captured in a single `histogram.csv` output file.

## Running from source

Running form source requires having node version 10+, yarn, and git command line installed.

To generate a full course package digest using this tool from source:

```
git clone <this repository>
yarn install
node ./node_modules/ts-node/dist/bin.js src/index.ts --operation convert --inputDir <course input dir> --outputDir ./out --specificOrg <optional path to specific org> --specificOrgId <optional specific org id> --mediaUrlPrefix https://torus-media-dev.s3.amazonaws.com/media
```

# Course Digest

This tool takes as input a full course package source tree and generates a  histogram of XML element usage, bucketed by resource type and version, captured in a single `histogram.csv` output file. 

## Running from source

To run from source requires having node version 10 installed.

To generate a full course package digest using this tool from source:

```
git clone <this repository>
yarn install
npm run start <course package dir> <output dir> [<organization id>]
```

## Running from pre-built docker image

This only requires that you have docker installed on the host machine. To generate a package 
digest running this tool from the published, prebuilt docker container:

```
docker run -t -i --mount type=bind,src=<output dir>,dst=/out --mount type=bind,src=<course package dir>,dst=/data olisimon/digest:latest npm run start -- /data /out [<organization id]>
```

## Command line options

* `<output dir>` is required and is a directory that must already exist where the tool will place the output `histogram.csv` file.  
* `<course package dir>` is required and is the directory containing the course package `build.xml` file.
* `[<organization id>]` is optional and if specified a digest will be created based only on the organization with that specified id.  If this argument is omitted, the tool will create the digest based on all organizations found in the package. 

## Course Digest

To generate a full course package digest using this tool from source:

```
git clone <this repository>
yarn install
npm run start <directory containing package build.xml> <output directory> [<organization id>]
```

The `organization id` is optional and if specified a digest will be created based only on the
organization with that specified id.  If this argument is omitted, the tool will create the
digest based on all organizations found in the package. 

To generate a package digest running this from a docker container:

```
docker build -t digest .
docker run -t -i --mount type=bind,src=<output dir>,dst=/out --mount type=bind,src=<course package dir>,dst=/data digest:latest npm run start -- /data /out
```

## Course Digest

To generate a full course package digest:

```
npm run start <directory containing package build.xml> <output directory> [<organization id>]
```

The `organization id` is optional and if specified a digest will be created based only on the
organization with that specified id.  If this argument is omitted, the tool will create the
digest based on all organizations found in the package. 

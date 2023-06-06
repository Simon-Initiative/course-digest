import * as fs from 'fs';

/**
 * Merge the digests referenced from two directory paths into a single digest
 * that will be output to the specified output path.  These path references are
 * to the unzipped representation of the digests.
 * @param pathA the first path
 * @param pathB the second path
 * @param pathOut the output path
 * @throws {Error} if the digests cannot be merged, due to conflicting resource ids
 */
export function mergeDigests(pathA: string, pathB: string, pathOut: string) {
  // Merge the digests
  const [projectA, hierarchyA, mediaManifestA] = readDigest(pathA);
  const [projectB, hierarchyB, mediaManifestB] = readDigest(pathB);

  prepDir(pathOut);

  const project = mergeProject(projectA, projectB);
  const hierarchy = mergeHierarchy(hierarchyA, hierarchyB);
  const mediaManifest = mergeMediaManifest(mediaManifestA, mediaManifestB);

  // Write the merged digests
  fs.writeFileSync(
    pathOut + '/_project.json',
    JSON.stringify(project, undefined, 2)
  );
  fs.writeFileSync(
    pathOut + '/_hierarchy.json',
    JSON.stringify(hierarchy, undefined, 2)
  );
  fs.writeFileSync(
    pathOut + '/_media-manifest.json',
    JSON.stringify(mediaManifest, undefined, 2)
  );

  // read all resource file names from both digests
  const resourcesA = getResourcePaths(pathA);
  const resourcesB = getResourcePaths(pathB);

  // Check for any duplicate ids between resourcesA and resourcesB
  const ids: any = {};
  resourcesA.forEach((id) => (ids[id] = true));
  if (resourcesB.some((id) => ids[id] === true)) {
    throw new Error('Cannot merge digests, duplicate resource ids found');
  }

  // Copy the resource files from both digests
  copyResources(resourcesA, pathA, pathOut);
  copyResources(resourcesB, pathB, pathOut);
}

function mergeProject(projectA: any, _projectB: any) {
  // Project A is the source of truth
  return projectA;
}

function copyResources(resources: string[], path: string, pathOut: string) {
  const withPath = resources.map((resource) => path + '/' + resource);
  copyPathsTo(withPath, pathOut);
}

function getResourcePaths(path: string) {
  const except: any = {
    '_project.json': true,
    '_hierarchy.json': true,
    '_media-manifest.json': true,
  };

  return fs
    .readdirSync(path)
    .filter((file) => file.endsWith('.json') && !except[file]);
}

function copyPathsTo(resources: string[], outDir: string) {
  const getFileName = (path: string) => path.split('/').pop() as string;
  resources.forEach((resource) => {
    fs.copyFileSync(resource, outDir + '/' + getFileName(resource));
  });
}

function mergeHierarchy(hierarchyA: any, hierarchyB: any) {
  const topLevelB = (hierarchyB as any).children.filter(
    (child: any) => child.type === 'container' || child.type === 'item'
  );
  return Object.assign({}, hierarchyA, {
    children: [...hierarchyA.children, ...topLevelB],
  });
}

function mergeMediaManifest(mediaManifestA: any, mediaManifestB: any) {
  return Object.assign({}, mediaManifestA, {
    mediaItems: [...mediaManifestA.mediaItems, ...mediaManifestB.mediaItems],
  });
}

// Read a digest from a directory path, returning a tuple [_project, _hierachy, _media-manfest]
// file contents
function readDigest(path: string) {
  return [
    readAndParse(path, '_project.json'),
    readAndParse(path, '_hierarchy.json'),
    readAndParse(path, '_media-manifest.json'),
  ];
}

function readAndParse(path: string, filename: string) {
  const fileContent = fs.readFileSync(path + '/' + filename);
  return JSON.parse(fileContent.toString());
}

function prepDir(pathOut: string) {
  if (fs.existsSync(pathOut)) {
    fs.rmSync(pathOut, { recursive: true, force: true });
  }
  fs.mkdirSync(pathOut);
}

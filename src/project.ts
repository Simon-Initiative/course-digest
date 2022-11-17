function iterableToList<V>(iter: Iterable<V>) {
  const list = [];

  for (const s of iter) {
    list.push(s);
  }

  return list;
}

export class ProjectSummary {
  packageDirectory: string;
  outputDirectory: string;
  svnRoot: string;
  alternativeGroups: Record<string, Set<string>>;

  constructor(
    packageDirectory: string,
    outputDirectory: string,
    svnRoot: string
  ) {
    this.packageDirectory = packageDirectory;
    this.outputDirectory = outputDirectory;
    this.svnRoot = svnRoot;

    this.alternativeGroups = {};
  }

  addAlternativesGroupValue(group: string, value: string) {
    if (!this.alternativeGroups[group]) {
      this.alternativeGroups[group] = new Set();
    }

    this.alternativeGroups[group].add(value);
  }

  getAlternativesGroupsJSON() {
    return Object.keys(this.alternativeGroups).reduce(
      (acc, groupId) => ({
        ...acc,
        [groupId]: iterableToList(this.alternativeGroups[groupId].values()),
      }),
      {}
    );
  }
}

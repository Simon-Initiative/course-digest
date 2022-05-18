This directory contains example course projects used for testing.

Course project content is stored in svn as the source of truth, however the local .svn repo
is ignored by git. To update a local copy of a project from the svn repo, simply delete the
directory and run the svn checkout command and specify the destination directory. For example:

cd test/course_packages
rm -rf [local directory]
svn co [svn url] [local directory]

## Packages

svn co https://svn.oli.cmu.edu/svn/content/editor/projects/echo-oli-cmu-edu/migration-4sdfykby/branches/v_1_0-echo migration-4sdfykby_v_1_0-echo

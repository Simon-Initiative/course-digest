#!/bin/sh

# Setup the environment
TMPDIR=/tmp
TOOLSDIR=/oli/public/tools
UPDATETOOL=$TOOLSDIR/bin/update-package.sh
BUILDDIR=./build
DEPLOYXML=deploy.xml

# Verify the environment
if [ ! -w $TMPDIR ] ; then
	echo "ERROR: Unable to access temporary directory: $TMPDIR"
	exit;
elif [ ! -x $UPDATETOOL ] ; then
	echo "ERROR: Unable to execute update tool: $UPDATETOOL"
	exit;
elif [ ! -x $BUILDDIR ] ; then
	echo "ERROR: Unable to access build directory: $BUILDDIR"
	exit;
elif [ ! -r "$BUILDDIR/$DEPLOYXML" ] ; then
	echo "ERROR: Unable to access deploy descriptor: $BUILDDIR/$DEPLOYXML"
	exit;
fi

# Construct path to package
FILENAME=`xpath build/deploy.xml "/deploy/package/file/text()" 2> /dev/null`
PKGFILE=$BUILDDIR/$FILENAME

printf "\n"
printf "Please wait while your package update is prepared...\t"

# Create temporary directory
UPDATETMP=`mktemp -d $TMPDIR/update.XXXXXX` || exit 1

# Copy update to temporary directory
cp $PKGFILE $UPDATETMP

# Set permissions
chmod 755 $UPDATETMP
chmod 644 $UPDATETMP/$FILENAME

# Run the deploy script
printf "DONE\n\n"
$UPDATETOOL "$@" "$UPDATETMP/$FILENAME"
printf "\n\n"

# Remove the temporary file
rm -Rf $UPDATETMP

#!/bin/sh

# Setup the environment
TMPDIR=/tmp
TOOLSDIR=/oli/public/tools
DEPLOYTOOL=$TOOLSDIR/bin/deploy-content.sh
BUILDDIR=./build
DEPLOYXML=deploy.xml

# Verify the environment
if [ ! -w $TMPDIR ] ; then
	echo "ERROR: Unable to access temporary directory: $TMPDIR"
	exit;
elif [ ! -x $DEPLOYTOOL ] ; then
	echo "ERROR: Unable to execute deploy tool: $DEPLOYTOOL"
	exit;
elif [ ! -x $BUILDDIR ] ; then
	echo "ERROR: Unable to access build directory: $BUILDDIR"
	exit;
elif [ ! -r "$BUILDDIR/$DEPLOYXML" ] ; then
	echo "ERROR: Unable to access deploy descriptor: $BUILDDIR/$DEPLOYXML"
	exit;
fi

printf "\n"
printf "Please wait while your content is prepared..."

# Create temporary directory
DEPLOYTMP=`mktemp -d $TMPDIR/deploy.XXXXXX` || exit 1

# Copy deploy to temporary directory
cp $BUILDDIR/*.zip $BUILDDIR/deploy.xml $DEPLOYTMP

# Set permissions
chmod 755 $DEPLOYTMP
find $DEPLOYTMP -type f -exec chmod 644 {} \;

# Run the deploy script
printf "DONE\n\n"
$DEPLOYTOOL "$@" "$DEPLOYTMP/$DEPLOYXML"
printf "\n\n"

# Remove the temporary file
rm -Rf $DEPLOYTMP

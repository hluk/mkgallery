#!/bin/sh
# Simple HTML/JavaScript image browser
#
# usage: mkgallery.sh [gallery_name=default]
#        - creates new gallery (named "gallery_name") in script
#          directory; the gallery contains all images found in
#          current directory
#        - if BROWSER environment variable is set, the gallery
#          is viewed using web browser $BROWSER
#
# features:
# + mouse drag scrolling
# + zooming (in/out/fit to window/fill window/actual size)
# + keyboard navigation
# + side panel (list of images)
#

# script directory
DIR="`dirname "$0"`"
# gallery output directory
GDIR="$DIR/galleries/${1:-default}"
# HTML template (list of images is inserted
# between "//<LIST>" and "//<LIST>" lines)
TEMP="$DIR/template.html"

# "files/" should contain necessary javascript files
wget -nc -P "$DIR/files" http://script.aculo.us/prototype.js http://script.aculo.us/effects.js

mkdir -p "$GDIR" &&
ln -fsT "$PWD" "$GDIR/imgs" || exit 1
ln -fsT "$DIR/files" "$GDIR/files" || exit 1
# generate list of images
FILES="`cd "$GDIR" && find imgs/ -iregex '.*\.\(jpg\|png\|gif\|svg\)' -printf '"%P",\n'|sort`"

# use template to create new html document
(
	sed -n "1,/^\/\/<LIST>/{/^\/\//!{p}}" "$TEMP"
	echo "var ls = [$FILES];"
	sed -n "/^\/\/<\/LIST>/,\${/^\/\//!{p}}" "$TEMP"
) > "$GDIR/index.html"

if [ $? -eq 0 ]
then
	# open image viewer in BROWSER
	if [ -n "$BROWSER" ]
	then
		"$BROWSER" "file://$GDIR/index.html" 1>/dev/null &
		disown
	fi
else
	echo "New gallery was created in \"$GDIR\"."
fi

# generate thumbnails
rm -rf "$GDIR/thumbs" &&
mkdir "$GDIR/thumbs" &&
echo "$FILES" | tr , ' ' | xargs mogrify -format jpg -path "$GDIR/thumbs" -thumbnail 300x300


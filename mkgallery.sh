#!/bin/bash
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
# + list of images
#

# RES: thumbnail resolution
RES=${RES:-300}
# TITLE: gallery title (1st parameter)
TITLE="${1:-default}"

# script directory
DIR="`dirname "$0"`"
# gallery output directory
GDIR="$DIR/galleries/$TITLE"
# HTML template (list of images is inserted
# between "//<LIST>" and "//<LIST>" lines)
TEMP="$DIR/template.html"
# url prefix
URL="http://127.0.0.1:8080/galleries/$TITLE/"

IMAGE_FORMATS='jpg\|png\|gif\|svg'
FONT_FORMATS='otf\|ttf'

# create gallery root
(
mkdir -p "$GDIR" &&
ln -fsT "$PWD" "$GDIR/items" &&
ln -fsT "$DIR/files" "$GDIR/files" &&
ln -fsT "$DIR/template.html" "$GDIR/index.html"
cp "$DIR/config.js" "$GDIR/"
) || exit 1

# generate list of images
FILES="`cd "$GDIR" && find -L items/ -iregex '.*\.\('$IMAGE_FORMATS'\|'$FONT_FORMATS'\)' -printf '"%P",\n'|sort`"

# use template to create new html document
echo "var ls=[$FILES]; title = '$TITLE';" > "$GDIR/items.js"

# open image viewer in BROWSER (env. variable) or just print message
if [ $? -eq 0 ]
then
    if [ -n "$BROWSER" ]
    then
        "$BROWSER" "$URL" 1>/dev/null &
        disown
    fi
else
    echo "New gallery was created in \"$GDIR\"."
fi

# generate font-faces
function cssline()
{
    echo "@font-face { font-family: `echo $1|sed 's/[^a-zA-Z0-9_]/_/g'`; src: url('items/$1'); }"
}
(cd "$GDIR/items" && find -L -iregex '.*\.\('"$FONT_FORMATS"'\)' -printf '%P\n'|sort) |
    while read font; do cssline "$font"; done > "$GDIR/fonts.css"

# generate thumbnails
rm -rf "$GDIR/thumbs" &&
mkdir "$GDIR/thumbs" &&
IMAGES=`echo "$FILES" | sed -n '/\.\('$IMAGE_FORMATS'\)",$/{s/,$//p}'`
N=`echo "$FILES"|wc -l`
# decrease thumbnail size: -depth 3
# crop 20% off all sides: -shave "20%x20%"
echo "$IMAGES" |
    xargs mogrify -monitor -format png -quality 0 -type optimize -path "$GDIR/thumbs" -thumbnail "${RES}x${RES}>" 2>&1 |
        awk 'BEGIN{n='$N';}/^load /{l=int(i/n*30); s=""; j=l; while(j--) s=s"="; bar=sprintf("[%s%-"30-l"s]",s,">"); printf("Creating thumbnails: %s %d/%d%s",bar,++i,n,i==n?"\n":"\r");}'


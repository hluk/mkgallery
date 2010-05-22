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
URL="http://127.0.0.1:8080/$TITLE/"

IMAGE_FORMATS='jpg\|png\|gif\|svg'
FONT_FORMATS='otf\|ttf'

mkdir -p "$GDIR" &&
ln -fsT "$PWD" "$GDIR/imgs" || exit 1
ln -fsT "$DIR/files" "$GDIR/files" || exit 1

# generate list of images
FILES="`cd "$GDIR" && find imgs/ -iregex '.*\.\('$IMAGE_FORMATS'\|'$FONT_FORMATS'\)' -printf '"%P",\n'|sort`"

# use template to create new html document
(
	sed -n "1,/^\/\/REPLACE {{{/{/^\/\//!{p}}" "$TEMP"
	echo "var ls = [$FILES]; title = '$TITLE'"
    sed -n "/^\/\/REPLACE }}}/,\${/^\/\//!{p}}" "$TEMP"
) > "$GDIR/index.html"

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
    echo "@font-face { font-family: `echo $1|sed 's/[^a-zA-Z0-9_]/_/g'`; src: url('imgs/$1'); }"
}

FONTS=`echo "$FILES" | sed -n '/\.\('$FONT_FORMATS'\)",$/{s/^"//;s/",$//;p}'`
(
    echo "$FONTS" | while L=`line`; do cssline "$L"; done
) > "$GDIR/fonts.css"

# generate thumbnails
rm -rf "$GDIR/thumbs" &&
mkdir "$GDIR/thumbs" &&
IMAGES=`echo "$FILES" | sed -n '/\.\('$IMAGE_FORMATS'\)",$/{s/,$//p}'`
N=`echo "$FILES"|wc -l`
# decrease thumbnail size: -depth 3
echo "$IMAGES" |
    xargs mogrify -verbose -format png -quality 0 -type optimize -path "$GDIR/thumbs" -thumbnail "${RES}x${RES}>" |
        awk 'BEGIN{n='$N';}/=>\//{l=int(i/n*30); s=""; j=l; while(j--) s=s"="; bar=sprintf("[%s%-"30-l"s]",s,">"); printf("Creating thumbnails: %s %d/%d%s",bar,++i,n,i==n?"\n":"\r");}'


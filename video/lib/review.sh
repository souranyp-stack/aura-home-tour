#!/bin/sh
# Tiles four frames (start, 1/3, 2/3, end) of each clip into one sheet: review.sh out.jpg clip...
out=$1; shift
FF="$(dirname "$0")/../node_modules/ffmpeg-static/ffmpeg"
tmp=$(mktemp -d)
i=0
for c in "$@"; do
  n=$("$FF" -i "$c" -map 0:v:0 -c copy -f null - 2>&1 | grep -o 'frame= *[0-9]*' | tail -1 | grep -o '[0-9]*')
  "$FF" -loglevel error -y -i "$c" -vf "select='eq(n\,0)+eq(n\,$((n/3)))+eq(n\,$((2*n/3)))+eq(n\,$((n-1)))',scale=480:-1,tile=4x1,drawtext=fontfile=/System/Library/Fonts/Supplemental/Arial.ttf:text='$(basename "$c" .mp4)':x=6:y=6:fontsize=16:fontcolor=white:box=1:boxcolor=black@0.6" -frames:v 1 "$tmp/$(printf %03d $i).png"
  i=$((i+1))
done
"$FF" -loglevel error -y -pattern_type glob -i "$tmp/*.png" -vf tile=1x$i -frames:v 1 "$out"
rm -rf "$tmp"

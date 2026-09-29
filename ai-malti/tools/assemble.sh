#!/bin/bash
# assemble.sh [out.mp4] [crf]  — concat scene segments in order + mux soundtrack.  EP=02 for episode 2.
cd "$(dirname "$0")/.."
source tools/ep.sh
OUT=${1:-$OUTDIR/$OUTNAME.mp4}; CRF=${2:-20}
mkdir -p $(dirname $OUT)
: > $SP/segs/${PREFIX}all.list
for s in $SCENE_ORDER; do cat $SP/segs/$PREFIX$s.list >> $SP/segs/${PREFIX}all.list; done
ffmpeg -hide_banner -loglevel error -y -f concat -safe 0 -i $SP/segs/${PREFIX}all.list -i $AUDIO \
  -map 0:v -map 1:a -c:v libx264 -preset slow -crf $CRF -tune film -pix_fmt yuv420p -profile:v high -level 4.2 \
  -colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv \
  -x264-params "aq-mode=3:deblock=-1,-1" -movflags +faststart -c:a aac -b:a 256k -ar 48000 -shortest \
  -metadata title="$TITLE" $OUT && ls -la $OUT

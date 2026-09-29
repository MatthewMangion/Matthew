#!/bin/bash
# upload.sh [out.mp4] — a <30 MB copy for sharing/uploading (two-pass 3.45 Mb/s from the lossless segments).  EP=02 for episode 2.
set -e
cd "$(dirname "$0")/.."
source tools/ep.sh
OUT=${1:-$OUTDIR/$OUTNAME-upload.mp4}
LOG=$SP/x264pass_$EP
V="-c:v libx264 -preset slow -b:v 3450k -maxrate 6000k -bufsize 7000k -pix_fmt yuv420p -profile:v high"
ffmpeg -hide_banner -loglevel error -y -f concat -safe 0 -i $SP/segs/${PREFIX}all.list $V -pass 1 -passlogfile $LOG -an -f null /dev/null
ffmpeg -hide_banner -loglevel error -y -f concat -safe 0 -i $SP/segs/${PREFIX}all.list -i $AUDIO -map 0:v -map 1:a $V \
  -colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv -pass 2 -passlogfile $LOG \
  -c:a aac -b:a 192k -ar 48000 -shortest -movflags +faststart -metadata title="$TITLE" $OUT
ls -la $OUT

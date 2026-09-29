#!/bin/bash
# export.sh — final deliverables from rendered segments + audio.  EP=02 for episode 2.
set -e
cd "$(dirname "$0")/.."
source tools/ep.sh
mkdir -p $OUTDIR showreel/media
# 1) master
./tools/assemble.sh $OUTDIR/$OUTNAME.mp4 20
# 2) web version for the showreel page
#    (audio straight from the WAV: re-encoding the master's AAC overshoots to +3 dBTP on the first frame)
ffmpeg -hide_banner -loglevel error -y -i $OUTDIR/$OUTNAME.mp4 -i $AUDIO -map 0:v -map 1:a -vf "scale=720:1280:flags=lanczos" \
  -c:v libx264 -preset slow -crf 25 -maxrate 1500k -bufsize 3000k -pix_fmt yuv420p -profile:v high \
  -movflags +faststart -c:a aac -b:a 128k -ar 48000 -shortest $WEB
# 3) cover still (rendered at t=100.5, outside the edit)
rm -rf $SP/cover && node tools/render.mjs --page $PAGE --frames 100.5 --workers 1 --out $SP/cover >/dev/null
cp $SP/cover/f_03015.png $OUTDIR/cover.png
ffmpeg -hide_banner -loglevel error -y -i $OUTDIR/cover.png -vf scale=720:1280:flags=lanczos -q:v 3 $WEBCOVER
ls -la $OUTDIR showreel/media

#!/bin/bash
# assemble.sh <out.mp4> [crf]  — concat scene segments in order + mux soundtrack
SP=/tmp/claude-0/-home-user-Matthew/4dbca0b4-731b-564a-be9d-d98e1f54eb20/scratchpad
OUT=${1:-out/ai-bil-malti.mp4}; CRF=${2:-20}
mkdir -p $(dirname $OUT)
: > $SP/segs/all.list
for s in hook promise read tokens embed attn layers predict loop train latest finale; do cat $SP/segs/$s.list >> $SP/segs/all.list; done
ffmpeg -hide_banner -loglevel error -y -f concat -safe 0 -i $SP/segs/all.list -i audio/mix.wav \
  -map 0:v -map 1:a -c:v libx264 -preset slow -crf $CRF -tune film -pix_fmt yuv420p -profile:v high -level 4.2 \
  -colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv \
  -x264-params "aq-mode=3:deblock=-1,-1" -movflags +faststart -c:a aac -b:a 256k -ar 48000 -shortest \
  -metadata title="AI bil-Malti — Kif Naħdem" $OUT && ls -la $OUT

#!/bin/bash
# export.sh — final deliverables from rendered segments + audio
set -e
cd "$(dirname "$0")/.."
SP=/tmp/claude-0/-home-user-Matthew/4dbca0b4-731b-564a-be9d-d98e1f54eb20/scratchpad
mkdir -p out showreel/media
# 1) master (upload this one)
./tools/assemble.sh out/ai-bil-malti.mp4 20
# 2) web version for the showreel page (≤ 15 MB)
ffmpeg -hide_banner -loglevel error -y -i out/ai-bil-malti.mp4 -vf "scale=720:1280:flags=lanczos" \
  -c:v libx264 -preset slow -crf 25 -maxrate 1500k -bufsize 3000k -pix_fmt yuv420p -profile:v high \
  -movflags +faststart -c:a aac -b:a 128k showreel/media/ai-bil-malti-web.mp4
# 3) cover still (rendered at t=100.5, outside the edit)
rm -rf $SP/cover && node tools/render.mjs --frames 100.5 --workers 1 --out $SP/cover >/dev/null
cp $SP/cover/f_03015.png out/cover.png
ffmpeg -hide_banner -loglevel error -y -i out/cover.png -vf scale=720:1280:flags=lanczos -q:v 3 showreel/media/cover.jpg
ls -la out showreel/media

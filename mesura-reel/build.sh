#!/usr/bin/env bash
# Full build: event cues -> soundtrack -> motion-blurred frames (parallel) -> H.264 MP4.
#   ./build.sh            (JOBS=4 FRAMES=build/frames by default)
set -euo pipefail
cd "$(dirname "$0")"
JOBS=${JOBS:-4}
FRAMES=${FRAMES:-build/frames}
OUT=${OUT:-mesura-reel.mp4}
FFMPEG=${FFMPEG:-$(command -v ffmpeg || python3 -c 'import imageio_ffmpeg as f; print(f.get_ffmpeg_exe())')}
DUR=$(sed -n 's/^export const W = .*DUR = \([0-9.]*\);/\1/p' reel.js)
TOTAL=$(awk "BEGIN { printf \"%d\", $DUR * 60 + 0.5 }")   # frames at 60 fps
mkdir -p "$FRAMES" build

node render/render.mjs cues audio
python3 audio/score.py audio/cues.json build/score.wav

# Workers take interleaved frames so heavy and light passages spread evenly.
for ((j = 0; j < JOBS; j++)); do
  RESUME=1 node render/render.mjs frames "$FRAMES" 0 $((TOTAL - 1)) "$JOBS" "$j" > "build/render_$j.log" 2>&1 &
done
wait

"$FFMPEG" -y -loglevel error -stats \
  -framerate 60 -i "$FRAMES/f%04d.png" -i build/score.wav \
  -vf "scale=in_range=full:out_range=tv:out_color_matrix=bt709:flags=lanczos+accurate_rnd+full_chroma_int,format=yuv420p" \
  -c:v libx264 -preset slower -crf 15 -profile:v high -level:v 4.2 -g 60 -bf 3 \
  -x264-params "aq-mode=3:aq-strength=0.9:deblock=-1,-1:psy-rd=1.0,0.15" \
  -colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv \
  -c:a aac -b:a 256k -ar 48000 -movflags +faststart -shortest "$OUT"
echo "wrote $OUT"

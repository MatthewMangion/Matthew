#!/usr/bin/env bash
# Full build: event cues -> soundtrack -> motion-blurred frames (parallel) -> H.264 MP4.
#   ./build.sh               16:9 brand reel   -> mesura-reel.mp4
#   FILM=how ./build.sh      9:16 explainer    -> mesura-how-it-works.mp4
#   FILM=social REEL=02-shadow-ai ./build.sh   one social reel -> social/videos/mesura-02-shadow-ai.mp4
set -euo pipefail
cd "$(dirname "$0")"
FILM=${FILM:-reel}          # reel = 16:9 brand reel, how = 9:16 explainer, social = a social reel (REEL=<id>)
NAME=$FILM
if [ "$FILM" = how ]; then
  PAGE=how.html; SCORE=audio/how.py; CUES=audio/how-cues.json; OUT=${OUT:-mesura-how-it-works.mp4}
elif [ "$FILM" = social ]; then
  REEL=${REEL:?set REEL to a reel id, e.g. REEL=02-shadow-ai}
  NAME=social-$REEL
  PAGE="social.html?r=$REEL"; SCORE=audio/social.py; CUES=audio/social/$REEL.json; OUT=${OUT:-social/videos/mesura-$REEL.mp4}
  export CUES_NAME=social/$REEL.json
else
  PAGE=index.html; SCORE=audio/score.py; CUES=audio/cues.json; OUT=${OUT:-mesura-reel.mp4}
fi
JOBS=${JOBS:-4}
FRAMES=${FRAMES:-build/frames-$NAME}
FFMPEG=${FFMPEG:-$(command -v ffmpeg || python3 -c 'import imageio_ffmpeg as f; print(f.get_ffmpeg_exe())')}
mkdir -p "$FRAMES" build "$(dirname "$OUT")"

export PAGE
node render/render.mjs cues audio
python3 "$SCORE" "$CUES" "build/score-$NAME.wav"

# Workers take interleaved frames so heavy and light passages spread evenly
# (the renderer reads the film's length from the page).
for ((j = 0; j < JOBS; j++)); do
  RESUME=1 node render/render.mjs frames "$FRAMES" 0 "" "$JOBS" "$j" > "build/render-$NAME-$j.log" 2>&1 &
done
wait

"$FFMPEG" -y -loglevel error -stats \
  -framerate 60 -i "$FRAMES/f%04d.png" -i "build/score-$NAME.wav" \
  -vf "scale=in_range=full:out_range=tv:out_color_matrix=bt709:flags=lanczos+accurate_rnd+full_chroma_int,format=yuv420p" \
  -c:v libx264 -preset slower -crf 18 -profile:v high -level:v 4.2 -g 60 -bf 3 \
  -x264-params "aq-mode=3:aq-strength=0.9:deblock=-1,-1:psy-rd=1.0,0.15" \
  -colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv \
  -c:a aac -b:a 256k -ar 48000 -movflags +faststart -shortest "$OUT"
echo "wrote $OUT"

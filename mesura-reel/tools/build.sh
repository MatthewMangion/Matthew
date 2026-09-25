#!/usr/bin/env bash
# Build one reel end to end: cue sheet → score → 60 fps + 30 fps masters → cover.
#   tools/build.sh flagship|guess|shadow
set -euo pipefail
cd "$(dirname "$0")/.."
REEL="$1"
export NODE_PATH="${NODE_PATH:-$(npm root -g)}"
FF="$(python3 -c 'import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())')"
declare -A LEN=([flagship]=29.6 [guess]=15.1 [shadow]=21.6)
NAME="mesura-${REEL}-${LEN[$REEL]}s"

node tools/render.cjs --reel "$REEL" --cues
python3 tools/compose.py "audio/$REEL.cues.json" "audio/$REEL.wav"
"$FF" -y -loglevel error -i "audio/$REEL.wav" -c:a aac -b:a 192k "audio/$REEL.m4a"
node tools/render.cjs --reel "$REEL" --audio "audio/$REEL.wav" --crf 14 --out "renders/$NAME-60fps.mp4"
node tools/render.cjs --reel "$REEL" --fps 30 --audio "audio/$REEL.wav" --crf 14 --out "renders/$NAME-30fps.mp4"
node tools/render.cjs --reel "$REEL" --cover "renders/covers/mesura-$REEL-cover.png"
"$FF" -y -loglevel error -i "renders/covers/mesura-$REEL-cover.png" -q:v 2 "renders/covers/mesura-$REEL-cover.jpg"
echo "built $NAME"

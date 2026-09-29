#!/bin/bash
# render_all.sh [workers] [scene ...]  — renders scene segments (all scenes if none given).  EP=02 for episode 2.
cd "$(dirname "$0")/.."
source tools/ep.sh
W=${1:-4}; shift
SCENES="$@"
if [ -z "$SCENES" ]; then SCENES="$SCENE_ORDER"; fi
for s in $SCENES; do
  R=$(node -e "const TL=require('$TLJS'); console.log(TL.S['$s'].join(' '))")
  set -- $R
  node tools/render.mjs --page $PAGE --from $1 --to $2 --name $PREFIX$s --workers $W || exit 1
done

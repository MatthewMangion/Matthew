#!/bin/bash
# render_all.sh [workers] [scene ...]  — renders scene segments (all scenes if none given)
W=${1:-4}; shift
SCENES="$@"
if [ -z "$SCENES" ]; then SCENES="hook promise read tokens embed attn layers predict loop train latest finale"; fi
for s in $SCENES; do
  R=$(node -e "const TL=require('./src/timeline.js'); console.log(TL.S['$s'].join(' '))")
  set -- $R
  node tools/render.mjs --from $1 --to $2 --name $s --workers $W || exit 1
done

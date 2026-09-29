#!/bin/bash
# ep.sh — per-episode settings, sourced by the other tools.  Usage: EP=02 ./tools/render_all.sh 3
EP=${EP:-01}
SP=/tmp/claude-0/-home-user-Matthew/4dbca0b4-731b-564a-be9d-d98e1f54eb20/scratchpad
case "$EP" in
  02)
    PAGE=ep02.html; TLJS=./src/ep02/timeline.js; AUDIO=audio/mix-ep02.wav; PREFIX=e2_
    OUTDIR=out/ep02; OUTNAME=ai-bil-malti-ep02; TITLE="AI bil-Malti — 7 Qwiel tan-Nanna"; WEB=showreel/media/ai-bil-malti-ep02-web.mp4; WEBCOVER=showreel/media/cover-ep02.jpg ;;
  *)
    PAGE=index.html; TLJS=./src/timeline.js; AUDIO=audio/mix.wav; PREFIX=
    OUTDIR=out; OUTNAME=ai-bil-malti; TITLE="AI bil-Malti — Kif Naħdem"; WEB=showreel/media/ai-bil-malti-web.mp4; WEBCOVER=showreel/media/cover.jpg ;;
esac
SCENE_ORDER=$(node -e "const TL=require('$TLJS'); console.log(Object.entries(TL.S).sort((a,b)=>a[1][0]-b[1][0]).map(e=>e[0]).join(' '))")

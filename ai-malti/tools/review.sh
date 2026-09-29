#!/bin/bash
# review.sh <segname> [every_n_frames=4] [cols=8] [scale=0.18]  → contact sheet of a rendered segment
SP=/tmp/claude-0/-home-user-Matthew/4dbca0b4-731b-564a-be9d-d98e1f54eb20/scratchpad
N=${2:-4}; COLS=${3:-8}; SC=${4:-0.18}
D=$SP/review_$1; rm -rf $D; mkdir -p $D
START=$(head -1 $SP/segs/$1.list | sed -E "s/.*__0*([0-9]+)\.mkv'/\1/"); START=${START:-0}
ffmpeg -loglevel error -f concat -safe 0 -i $SP/segs/$1.list -vf "select='not(mod(n\,$N))'" -vsync vfr -start_number 0 $D/tmp_%05d.png
i=0; for f in $(ls $D/tmp_*.png | sort); do fr=$((START + i*N)); mv $f $D/f_$(printf %05d $fr).png; i=$((i+1)); done
python3 tools/sheet.py $D $SP/sheet_$1.jpg $COLS $SC

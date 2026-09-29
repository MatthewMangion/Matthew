#!/bin/bash
# review_all.sh [every_n] — contact sheets for every rendered scene
N=${1:-6}
for s in hook promise read tokens embed attn layers predict loop train latest finale; do
  [ -e /tmp/claude-0/-home-user-Matthew/4dbca0b4-731b-564a-be9d-d98e1f54eb20/scratchpad/segs/$s.list ] && ./tools/review.sh $s $N 10 0.15 >/dev/null && echo "sheet: $s"
done

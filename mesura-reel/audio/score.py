"""Mesura reel soundtrack: synthesised from scratch and locked to the animation.

100 BPM (one beat = 0.6 s). Bars start at 1.8 s and run every 2.4 s, so the two
big picture hits (13.8 the measure, 23.4 the mark) are downbeats, and the dive,
the radar and the takes all sit on beats. Every sound-design event comes from
cues.json, which the animation exports.

    python3 audio/score.py [cues.json] [out.wav]
"""
import json
import sys
from pathlib import Path

import numpy as np

import synth as S
from synth import SR, mtof, tt, xpan, place, env_ad, filt, svf, noise, kick, clap, hat, tick, fm_pluck, bell, tock, blip, \
    whoosh, riser, reverse_swell, boom, pad_chord, sub, add_kick

HERE = Path(__file__).resolve().parent
CUES = json.loads(Path(sys.argv[1] if len(sys.argv) > 1 else HERE / "cues.json").read_text())
DUR = float(CUES.get("DUR", 15.0))
S.init(DUR)
N = S.N
OUT = Path(sys.argv[2] if len(sys.argv) > 2 else HERE / "score.wav")
T = CUES["T"]


# ------------------------------------------------------------- arrangement
BPM = 100
BEAT = 60 / BPM          # 0.6 s
DOWN = 1.8               # first downbeat; a bar is 2.4 s
def grid(a, b, step=BEAT):
    """Times in [a, b) on the beat grid (step = BEAT, BEAT/2, 2*BEAT ...)."""
    t = DOWN + np.ceil((a - DOWN) / step - 1e-6) * step
    out = []
    while t < b - 1e-6:
        out.append(round(float(t), 4))
        t += step
    return out


def idx(t0, step):
    return int(round((t0 - DOWN) / step))


# Harmony follows the story. The suspended A resolves into D as the mark lands.
CHORDS = [
    (0.0, 4.2, 47, [59, 62, 66, 69, 73], 0.2),         # Bm9       the question
    (4.2, 6.6, 43, [59, 62, 66, 69, 74], 0.23),        # Gmaj9     the evidence
    (6.6, 9.0, 42, [57, 62, 66, 69, 74], 0.23),        # D/F#
    (9.0, 10.8, 40, [55, 59, 62, 66], 0.22),           # Em9       the gap, the dive
    (10.8, 13.8, 35, [54, 59, 61, 62], 0.19),          # Bm(add9)  shadow AI, low and closed
    (13.8, 16.2, 38, [54, 57, 62, 64, 69], 0.26),      # Dadd9     the measure
    (16.2, 18.6, 37, [57, 61, 64, 69], 0.26),          # A/C#      six dimensions
    (18.6, 21.0, 42, [54, 57, 61, 64, 69], 0.26),      # F#m7      measure again
    (21.0, 22.2, 43, [55, 59, 62, 66, 69], 0.27),      # Gmaj9
    (22.2, 23.4, 45, [57, 62, 64, 69], 0.27),          # Asus4     the inhale
    (23.4, DUR, 38, [50, 54, 57, 61, 64, 69], 0.33),   # Dmaj9     the mark
]


def chord_at(t0):
    return next(c for c in CHORDS if c[0] <= t0 < c[1])


for (a, b, bass, notes, g) in CHORDS:
    att = 1.0 if a == 0 else 0.1 if a in (13.8, 23.4) else 0.3
    pad_chord(notes, max(0.0, a - (0.04 if a else 0)), b, gain=g, att=att)

# Pad filter: closed in the dark, opens at the measure, blooms at the mark.
tl = np.arange(N) / SR
cut = np.interp(tl, [0, 0.6, 2.4, 4.2, 9.0, 10.2, 10.8, 12.0, 13.7, 13.8, 15.0, 21.9, 23.35, 23.4, 24.6, DUR],
                [500, 900, 1300, 1600, 1800, 1300, 520, 650, 2500, 3200, 2800, 2600, 5000, 4200, 3000, 1500])
S.BUS["pad"] = svf(S.BUS["pad"], cut, 0.8, "lp")

# Bass
sub(47, T["land"], 3.5, 0.07, att=0.6)                  # soft B under the question
for t0 in grid(4.2, T["zoom"]):                          # evidence: quarter-note pulse
    sub(chord_at(t0)[2], t0, 0.3, 0.18 if idx(t0, BEAT) % 2 == 0 else 0.12)
sub(35, T["dark"], 2.9, 0.1, att=0.05, rel=0.4)          # dark B drone
for t0 in grid(T["sweep4"], 22.2, BEAT / 2):             # groove: 8th pulse with octave pops
    i = idx(t0, BEAT / 2)
    sub(chord_at(t0)[2] + (12 if i % 4 == 3 else 0), t0, 0.24, 0.2 if i % 2 == 0 else 0.13)
sub(45, 22.2, 1.15, 0.17, att=0.02, rel=0.1)             # A under the inhale
sub(38, T["hit"], 2.8, 0.2, att=0.005, rel=0.3)

# Drums
for t0 in grid(4.2, 9.0, 2 * BEAT):                      # evidence: kick on 1 and 3
    add_kick(t0, 0.6, dec=0.16)
for t0 in (9.0, 9.6):
    add_kick(t0, 0.5, dec=0.16)
for i, t0 in enumerate(grid(4.8, T["zoom"] - 0.1, BEAT / 2)):
    place("drums", hat(0.5 if i % 2 else 0.28), t0, 0.1, pan=0.25)
for t0 in grid(11.4, 12.9):                              # clock in the dark
    k = idx(t0, BEAT)
    place("drums", tick(0.9 if k % 2 == 0 else 0.7, 2600 if k % 2 == 0 else 1900), t0, 0.16, pan=-0.3 if k % 2 == 0 else 0.3, rev=0.35)
for t0, v in ((12.0, 0.5), (12.25, 0.32)):               # heartbeat
    add_kick(t0, v, dec=0.18, f1=48)
for t0 in grid(T["sweep4"], 22.2):                       # the groove
    add_kick(t0, 1.0 if abs(t0 - T["sweep4"]) < 1e-6 else 0.82)
for t0 in grid(T["sweep4"] + BEAT, 22.2, 2 * BEAT):
    place("drums", clap(1.0), t0, 0.3, rev=0.14)
for i, t0 in enumerate(grid(T["sweep4"], 22.2, BEAT / 4)):
    acc = 1.0 if i % 4 == 2 else 0.45 if i % 2 == 0 else 0.2
    place("drums", hat(acc), t0, 0.14, pan=0.22 if i % 2 else -0.1)
for t0 in (15.9, 18.3, 20.7):                            # open hat on the and-of-four
    place("drums", hat(0.6, open_=True), t0, 0.09, pan=0.3)

# Plucked arpeggios, 8th notes
ARP = {4.2: [74, 79, 81, 78, 74, 83, 81, 78], 6.6: [74, 78, 81, 76, 74, 86, 81, 78], 9.0: [71, 76, 78, 74, 71, 79, 78, 74],
       13.8: [74, 81, 76, 78, 81, 86, 78, 76], 16.2: [73, 76, 81, 76, 85, 81, 76, 73], 18.6: [73, 78, 76, 81, 78, 85, 81, 76],
       21.0: [74, 79, 78, 81, 83, 86, 81, 78]}
for t0 in grid(4.8, T["zoom"], BEAT / 2) + grid(T["sweep4"], 22.2, BEAT / 2):
    a = max(k for k in ARP if k <= t0)
    i = idx(t0, BEAT / 2)
    light = t0 < T["zoom"]
    place("keys", fm_pluck(mtof(ARP[a][i % 8]), 0.45, (0.6 if light else 0.8) if i % 4 == 0 else 0.45, 0.2 if light else 0.17),
          t0, (0.055 if light else 0.07) if i % 2 else (0.07 if light else 0.085), pan=0.35 * np.sin(i * 1.3), rev=0.3)

# ------------------------------------------------------------ sound design
# the pull-out from inside the dot
place("sfx", whoosh(T["land"], 3500, 380, peak=0.55, q=1.1, vel=0.9), 0.0, 0.5, rev=0.2)
place("sfx", reverse_swell(T["land"] - 0.06, 0.5, 5000), 0.02, 0.25)
place("hits", tock(1050, 1.0), T["land"], 0.5, rev=0.35)
place("keys", bell(mtof(83), 2.0, 0.9), T["land"], 0.07, pan=0.1, rev=0.6)      # sonar ping
place("keys", bell(mtof(90), 1.5, 0.6), T["land"] + 0.09, 0.03, pan=-0.2, rev=0.7)
place("sfx", blip(420, 980, 0.14, 0.6), T["hop"] + 0.02, 0.18, pan=-0.3, rev=0.2)

# Line 1: the dot sweeps the baseline; each glyph plays a note of a rising run.
PENT_B = [59, 62, 64, 66, 69, 71, 74, 76, 78, 81, 83, 86]
for i, g in enumerate(CUES["glyphs1"]):
    m = PENT_B[min(len(PENT_B) - 1, int(round(i * 0.52)))]
    place("keys", fm_pluck(mtof(m), 0.55, 0.45, 0.16, ratio=3.0), g["t"] + 0.02, 0.05, pan=xpan(g["x"]), rev=0.3)
    place("sfx", tick(0.5, 5200), g["t"] + 0.02, 0.05, pan=xpan(g["x"]))
place("keys", fm_pluck(mtof(78), 0.9, 1.0, 0.35), T["dock1"], 0.13, pan=0.45, rev=0.35)
place("hits", tock(1250, 0.45), T["dock1"], 0.35, pan=0.45, rev=0.2)
for t0 in CUES["words2"]:
    place("sfx", tick(0.8, 3800), t0 + 0.03, 0.08, pan=0.0)
place("sfx", blip(900, 520, 0.16, 0.5), T["hop2"] + 0.03, 0.14, pan=0.4, rev=0.2)
place("keys", fm_pluck(mtof(83), 1.0, 1.0, 0.38), T["dock2"], 0.13, pan=0.35, rev=0.4)
place("hits", tock(1400, 0.45), T["dock2"], 0.35, pan=0.35, rev=0.25)
# exit + flight to the bar
place("sfx", whoosh(0.36, 1800, 350, 0.5, 1.2, 0.8, 0.4, -0.7), T["out1"] - 0.02, 0.26)
place("hits", tock(620, 0.8), T["bar1"], 0.3, pan=-0.75, rev=0.15)

# Bars: the zip of growth + odometer ticks
place("sfx", whoosh(0.7, 500, 5200, 0.3, 2.2, 0.9, -0.8, 0.4), T["bar1"], 0.26, rev=0.1)
place("sfx", whoosh(0.65, 400, 3400, 0.3, 2.2, 0.8, -0.8, -0.1), T["bar2"], 0.18, rev=0.1)
for i, t0 in enumerate(CUES["bar1"]):
    place("sfx", tick(1.0 - 0.02 * i, 4600), t0, 0.07, pan=0.3)
for i, t0 in enumerate(CUES["bar2"]):
    place("sfx", tick(0.9 - 0.015 * i, 3900), t0, 0.05, pan=-0.05)
# dimension line: a measuring-tape zip and three ticks
place("sfx", whoosh(0.75, 2000, 7000, 0.4, 3.0, 0.6, -0.7, 0.5), T["ghost"], 0.12)
for d in (0.0, 0.4, 0.75):
    place("sfx", tick(1.0, 3000), T["ghost"] + d, 0.12, pan=-0.6 + d * 1.6, rev=0.1)
# label flip (split-flap)
for k in range(7):
    place("sfx", tick(0.9 - k * 0.08, 2400 + 300 * (k % 3)), T["phaseB"] + 0.1 + k * 0.025, 0.1, pan=-0.6)
place("sfx", whoosh(0.4, 700, 2600, 0.5, 1.5, 0.5, -0.4, 0.2), T["head1"] - 0.05, 0.12)
place("sfx", whoosh(0.4, 700, 2600, 0.5, 1.5, 0.5, -0.4, 0.2), T["head2"] - 0.05, 0.12)
# the gap opens: an uneasy note, then the pull before the dive
place("keys", fm_pluck(mtof(64), 1.8, 0.4, 0.7, ratio=1.5), T["band"], 0.08, pan=0.2, rev=0.6)
place("sfx", reverse_swell(0.7, 0.35, 1800), T["zoom"] - 0.7, 0.35)

# the dive into the gap
dv = T["dark"] - T["zoom"]
place("sfx", whoosh(dv + 0.02, 280, 4200, 0.82, 0.9, 1.0, 0.2, 0.0), T["zoom"], 0.75, rev=0.2)
place("sfx", riser(dv, 120, 900, 0.8), T["zoom"], 0.3)
place("hits", boom(2.2, 74, 34, 1.0), T["dark"], 0.36, rev=0.2)
place("hits", kick(0.9, 0.5, 130, 46, 0.05, 0.22), T["dark"], 0.34)
place("sfx", whoosh(1.4, 900, 200, 0.05, 0.7, 0.7, 0.0, 0.0), T["dark"], 0.35, rev=0.6)
# Shadow AI: a reversed breath into the rack focus
place("sfx", reverse_swell(0.6, 0.4, 900), T["title3"] - 0.12, 0.25, rev=0.4)
for i, lab in enumerate(CUES["s3labels"]):
    place("keys", bell(mtof([78, 81, 76, 83][i]), 1.8, 0.55), lab["t"], 0.05, pan=xpan(lab["x"]), rev=0.8)
place("keys", fm_pluck(mtof(71), 1.6, 0.35, 0.6, ratio=1.5), T["sub3"], 0.08, pan=-0.3, rev=0.7)
# riser into the measure (cut dead just before the hit)
r = riser(0.9, 160, 2600, 1.0)
r[-int(0.03 * SR):] *= np.linspace(1, 0, int(0.03 * SR))
place("sfx", r, T["sweep4"] - 0.93, 0.55, rev=0.15)
place("sfx", reverse_swell(0.9, 0.55, 4000), T["sweep4"] - 0.93, 0.35)

# the measure: hit + a scan tone that follows the line across the stereo field
t7 = T["sweep4"]
place("hits", boom(1.2, 92, 44, 0.8), t7, 0.26)
place("hits", clap(1.0), t7, 0.35, rev=0.4)
place("hits", filt(noise(int(0.9 * SR)), "hp", 3000) * np.exp(-tt(0.9) / 0.22), t7, 0.18, rev=0.5)
for m in (62, 69, 74, 78, 81):
    place("keys", fm_pluck(mtof(m), 1.4, 1.2, 0.5), t7, 0.07, pan=0.1 * (m - 72) / 6, rev=0.35)
sd = T["sweep4End"] - t7 + 0.02
ts = tt(sd)
lx = np.interp(t7 + ts, [c["t"] for c in CUES["lineX"]], [c["x"] for c in CUES["lineX"]])
fsc = 300 * (3200 / 300) ** (ts / sd)
scan = (np.sin(2 * np.pi * np.cumsum(fsc) / SR) + 0.3 * np.sin(2 * np.pi * np.cumsum(fsc * 2.01) / SR)) * np.sin(np.pi * ts / sd) ** 0.7
pan = np.clip(lx / 1920 * 2 - 1, -1, 1) * 0.8
ang = (pan + 1) * np.pi / 4
place("sfx", np.stack([scan * np.cos(ang), scan * np.sin(ang)], axis=1) * np.sqrt(2), t7, 0.07, rev=0.3)
# every column that snaps into the grid plays a note of a rising pentatonic run
PENT_D = [62, 64, 66, 69, 71, 74, 76, 78, 81, 83, 86, 88, 90, 93, 95]
for c, col in enumerate(CUES["columns"]):
    t0 = max(col["t"], t7 + c * 0.005)
    place("keys", fm_pluck(mtof(PENT_D[min(14, c // 2)]), 0.45, 0.55, 0.13, ratio=3.0), t0 + 0.03, 0.045, pan=xpan(col["x"]), rev=0.35)

# the grid pours into the radar
place("sfx", whoosh(1.0, 500, 3000, 0.45, 1.3, 0.8, -0.6, 0.5), T["flow"], 0.28, rev=0.3)
for i, t0 in enumerate(CUES["spokes"]):
    place("sfx", tick(0.9, 3400), t0, 0.08, pan=0.35)
for i, d in enumerate(CUES["dims"]):
    place("keys", fm_pluck(mtof([73, 76, 81, 85, 88, 93][i]), 0.8, 0.9, 0.28), d["t"], 0.09, pan=xpan(d["x"]), rev=0.35)
place("sfx", whoosh(0.6, 300, 1600, 0.3, 1.2, 0.6, 0.4, 0.4), T["poly"], 0.2, rev=0.3)
for k in range(3):
    place("keys", bell(mtof(88), 0.9, 0.35), T["poly"] + 0.45 + k * 0.6, 0.025, pan=0.1, rev=0.6)
place("sfx", whoosh(0.65, 1200, 300, 0.5, 1.1, 0.6, 0.5, 0.4), T["morph6"], 0.2, rev=0.2)

# measure again: each take rings a step higher; the ring counter ticks
for i, (t0, m) in enumerate(zip(T["take"], [76, 78, 81, 83])):
    place("keys", bell(mtof(m), 2.4, 1.0), t0, 0.09, pan=0.4, rev=0.5)
    if i:
        place("sfx", blip(700, 1400, 0.05, 0.6), t0 + 0.12, 0.1, pan=-0.45)
for t0 in CUES["ring"]:
    place("sfx", tick(0.8, 4200), t0, 0.045, pan=0.4)

# everything inhales, then the mark lands
place("sfx", reverse_swell(T["hit"] - T["morph7"] + 0.12, 0.8, 2500), T["morph7"] - 0.12, 0.45)
place("sfx", whoosh(T["hit"] - T["morph7"] + 0.08, 300, 3800, 0.9, 1.0, 0.9, 0.35, 0.0), T["morph7"] - 0.08, 0.4, rev=0.2)
place("sfx", riser(T["hit"] - T["morph7"] - 0.03, 220, 1800, 0.9), T["morph7"] + 0.02, 0.3)

place("hits", boom(2.4, 76, 34, 1.0), T["hit"], 0.42, rev=0.25)
place("hits", kick(1.0, 0.5, 170, 48, 0.04, 0.2), T["hit"], 0.45)
place("hits", filt(noise(int(1.8 * SR)), "hp", 2500) * np.exp(-tt(1.8) / 0.45), T["hit"], 0.14, rev=0.7)
for m in (62, 69, 74, 78, 81, 86):
    place("keys", bell(mtof(m), 4.5, 1.8), T["hit"], 0.055, pan=0.12 * (m - 74) / 6, rev=0.7)
# the point flies out through the slot and lands as the full stop: the same tock as the opening, a fifth up
fd = T["dot"] - T["hit"] - 0.08
fl = tt(fd)
ff = 500 + 900 * np.sin(np.pi * fl / fd)
place("sfx", np.sin(2 * np.pi * np.cumsum(ff) / SR) * np.sin(np.pi * fl / fd) ** 2 * 0.5, T["hit"] + 0.08, 0.12, pan=0.3, rev=0.4)
place("hits", tock(1575, 1.0), T["dot"], 0.46, pan=0.25, rev=0.5)
place("keys", bell(mtof(86), 3.0, 1.2), T["dot"], 0.06, pan=0.25, rev=0.7)
for w in CUES["word"]:
    if w["ch"] in "mesura":
        place("sfx", tick(0.7, 3000), w["t"] + 0.04, 0.06, pan=-0.2)
    elif w["ch"] == "idot":
        place("hits", tock(2100, 0.5), w["t"], 0.2, pan=0.45, rev=0.4)
# tagline: the last chord blooms
place("keys", bell(mtof(81), 3.2, 1.5), T["tag1"], 0.05, pan=-0.2, rev=0.8)
place("keys", bell(mtof(78), 2.8, 1.5), T["tag2"], 0.05, pan=0.2, rev=0.8)

S.master(OUT)

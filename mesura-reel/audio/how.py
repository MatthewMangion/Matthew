"""Mesura "How it works" soundtrack (9:16 film, 30 s): synthesised and locked to the picture.

100 BPM with bars from 0.6 s, so every step starts on a downbeat (3.0, 7.8, 12.6, 17.4),
the report lands at 22.2 and the end card at 27.0. The harmony climbs with the story:
D | D Bm | G A | D Bm | Em F#m (the dark) | G A | D. Every interface sound and
sound-design event comes from how-cues.json, which the animation exports.

    python3 audio/how.py [how-cues.json] [out.wav]
"""
import json
import sys
from pathlib import Path

import numpy as np

import synth as S
from synth import SR, mtof, tt, place, env_ad, filt, svf, noise, saw, clap, hat, tick, fm_pluck, bell, tock, blip, \
    whoosh, riser, reverse_swell, boom, kick, pad_chord, add_kick

HERE = Path(__file__).resolve().parent
CUES = json.loads(Path(sys.argv[1] if len(sys.argv) > 1 else HERE / "how-cues.json").read_text())
DUR = float(CUES["DUR"])
S.init(DUR)
N = S.N
OUT = Path(sys.argv[2] if len(sys.argv) > 2 else HERE / "how.wav")
T = CUES["T"]
var = np.random.default_rng(1080)        # small human variation (typing, taps)


def vpan(x):
    """Screen x (0..1080) to stereo pan; a vertical frame is narrow, so keep it inside."""
    return float(np.clip(x / 1080 * 2 - 1, -1, 1)) * 0.6


# ------------------------------------------------------------ interface sounds
def key_click(vel=1.0, f=3200):
    t = tt(0.05)
    c = filt(noise(len(t)), "bp", (f * 0.6, f * 1.6)) * np.exp(-t / 0.004)
    body = np.sin(2 * np.pi * 210 * t) * np.exp(-t / 0.012) * 0.5
    return (c + body) * vel


def tap(vel=1.0):
    """A fingertip on glass: a soft thump and a short click."""
    t = tt(0.12)
    thump = np.sin(2 * np.pi * (120 + 90 * np.exp(-t / 0.01)) * t) * np.exp(-t / 0.03)
    click = filt(noise(len(t)), "bp", (1200, 4200)) * np.exp(-t / 0.003) * 0.6
    return (thump + click) * vel


def pop(f, vel=1.0, dur=0.08):
    """A dot appearing: a tiny upward bubble."""
    t = tt(dur)
    ff = f * (0.75 + 0.6 * (1 - np.exp(-t / 0.012)))
    return np.sin(2 * np.pi * np.cumsum(ff) / SR) * env_ad(len(t), 0.002, dur * 0.3) * vel


def bass(note, t0, dur, gain, att=0.008, rel=0.08, bite=0.35):
    """Sub sine plus a filtered saw layer, so the line still reads on a phone speaker."""
    n = int((dur + rel) * SR)
    t = np.arange(n) / SR
    f = mtof(note)
    env = np.clip(t / att, 0, 1) * np.clip((dur + rel - t) / rel, 0, 1)
    body = np.tanh((np.sin(2 * np.pi * f * t) + 0.18 * np.sin(4 * np.pi * f * t)) * 1.3)
    grit = filt(saw(f, n) + saw(f * 1.004, n, 0.5), "lp", 650) * np.exp(-t / 0.18)
    place("bass", (body + bite * grit) * env, t0, gain)


def chatter(t0, t1, gain, pan=0.0, f=(4200, 6800)):
    """The 40 Hz flicker of a scramble-decode, one tiny tick per glyph change."""
    for k in range(int(np.ceil(t0 * 40)), int(t1 * 40)):
        place("sfx", tick(0.6 + 0.4 * var.random(), var.uniform(*f)), k / 40, gain, pan=pan)


# ------------------------------------------------------------- arrangement
BPM = 100
BEAT = 60 / BPM          # 0.6 s
DOWN = 0.6               # first downbeat; a bar is 2.4 s


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


CHORDS = [
    (0.0, 3.0, 38, [57, 62, 66, 69, 73, 76], 0.19),      # Dmaj9     the point, the promise
    (3.0, 5.4, 38, [54, 57, 62, 64, 69], 0.21),          # Dadd9     01 sign up
    (5.4, 7.8, 35, [54, 57, 62, 66, 73], 0.21),          # Bm9       the code
    (7.8, 10.2, 43, [55, 59, 62, 66, 69], 0.22),         # Gmaj9     02 share
    (10.2, 11.4, 45, [57, 62, 64, 69, 71], 0.23),        # Asus4
    (11.4, 12.6, 45, [57, 61, 64, 69, 71], 0.23),        # A(add9)   the whole workforce
    (12.6, 15.0, 38, [54, 57, 62, 64, 69], 0.21),        # Dadd9     03 answer
    (15.0, 17.4, 35, [54, 57, 62, 66, 73], 0.21),        # Bm9
    (17.4, 19.8, 40, [55, 59, 62, 66, 71], 0.2),         # Em9       04 the dark, the engine
    (19.8, 22.2, 42, [57, 61, 64, 66, 69], 0.21),        # F#m7      the score
    (22.2, 24.6, 43, [55, 59, 62, 66, 69, 74], 0.25),    # Gmaj9     the report
    (24.6, 25.8, 45, [57, 62, 64, 69, 76], 0.25),        # Asus4     remeasure
    (25.8, 27.0, 45, [57, 61, 64, 69, 76], 0.26),        # A         the inhale
    (27.0, DUR, 38, [50, 54, 57, 61, 64, 69], 0.31),     # Dmaj9     the end card
]


def chord_at(t0):
    return next(c for c in CHORDS if c[0] <= t0 < c[1])


for (a, b, _, notes, g) in CHORDS:
    att = 1.0 if a == 0 else 0.1 if a in (17.4, 22.2, 27.0) else 0.3
    pad_chord(notes, max(0.0, a - (0.04 if a else 0)), b, gain=g, att=att)

# Pad filter: opens through the steps, closes in the dark, blooms for the report and the end.
tl = np.arange(N) / SR
cut = np.interp(tl, [0, 0.6, 2.4, 3.0, 7.8, 11.4, 12.55, 12.6, 16.2, 17.35, 17.4, 19.8, 21.6, 22.15, 22.2, 24.6, 26.95, 27.0, 28.2, DUR],
                [450, 800, 1200, 1500, 1700, 2400, 3000, 2200, 2000, 1400, 520, 700, 1100, 2600, 3300, 2900, 5000, 4200, 3000, 1500])
S.BUS["pad"] = svf(S.BUS["pad"], cut, 0.8, "lp")

# Bass
bass(38, T["land"], 2.3, 0.07, att=0.6, bite=0.0)                   # soft D under the intro
for t0 in grid(T["s1"], T["s2"]):                                  # 01: quarter-note pulse
    bass(chord_at(t0)[2], t0, 0.3, 0.17 if idx(t0, BEAT) % 2 == 0 else 0.11)
for t0 in grid(T["s2"], T["s3"], BEAT / 2):                        # 02: 8ths, octave pop on the last of four
    i = idx(t0, BEAT / 2)
    bass(chord_at(t0)[2] + (12 if i % 4 == 3 else 0), t0, 0.24, 0.18 if i % 2 == 0 else 0.11)
for t0 in grid(T["s3"], T["done"]):                                # 03: quarters under the phone
    bass(chord_at(t0)[2], t0, 0.3, 0.16 if idx(t0, BEAT) % 2 == 0 else 0.1)
bass(35, T["done"], 1.0, 0.12, att=0.02, rel=0.3)                  # B under "Submitted"
bass(40, T["s4"], 2.3, 0.13, att=0.03, rel=0.3, bite=0.15)         # E in the dark
bass(42, 19.8, 1.2, 0.12, att=0.2, rel=0.2, bite=0.15)             # F#
for t0 in grid(21.0, T["rep"], BEAT / 2):                          # pickup into the report
    bass(42 + 12 * (idx(t0, BEAT / 2) % 2), t0, 0.22, 0.11 + 0.05 * (t0 - 21.0))
for t0 in grid(T["rep"], 26.4, BEAT / 2):                          # the report: full 8th groove
    i = idx(t0, BEAT / 2)
    bass(chord_at(t0)[2] + (12 if i % 4 == 3 else 0), t0, 0.24, 0.2 if i % 2 == 0 else 0.13)
bass(45, 26.4, 0.55, 0.14, att=0.02, rel=0.08)                     # A holds through the inhale
bass(38, T["end"], 2.8, 0.2, att=0.005, rel=0.3)

# Drums
for t0 in grid(T["s1"], T["s3"] - 0.1, 2 * BEAT):                  # 01-02: kick on 1 and 3
    add_kick(t0, 0.6 if t0 < T["s2"] else 0.72, dec=0.16)
for t0 in grid(T["s1"] + BEAT, T["s2"], 2 * BEAT):                 # 01: a rim tick on 2 and 4
    place("drums", tock(1900, 0.6), t0, 0.07, pan=-0.2, rev=0.15)
for t0 in grid(T["s2"] + BEAT, T["zoom2"], 2 * BEAT):              # 02: claps take over
    place("drums", clap(0.9), t0, 0.22, rev=0.14)
for i, t0 in enumerate(grid(T["s1"], T["s2"] + 2.4, BEAT / 2)):
    place("drums", hat(0.5 if i % 2 else 0.28), t0, 0.1, pan=0.25)
for i, t0 in enumerate(grid(T["s2"] + 2.4, T["zoom2"], BEAT / 4)):  # the whole workforce: 16ths
    place("drums", hat(1.0 if i % 4 == 2 else 0.45 if i % 2 == 0 else 0.2), t0, 0.12, pan=0.22 if i % 2 else -0.1)
place("drums", hat(0.6, open_=True), 11.1, 0.08, pan=0.3)
for t0 in grid(T["s3"], T["ffwd"], 2 * BEAT):                      # 03: half-time, room for the taps
    add_kick(t0, 0.6 if idx(t0, BEAT) % 4 == 0 else 0.42, dec=0.16)
for i, t0 in enumerate(grid(T["s3"], T["ffwd"], BEAT / 2)):
    place("drums", hat(0.4 if i % 2 else 0.22), t0, 0.09, pan=0.25)
for t0 in grid(T["ffwd"], T["done"] - 0.1, BEAT / 4):              # fast-forward: 16ths that build
    k, p = idx(t0, BEAT / 4), (t0 - T["ffwd"]) / (T["done"] - T["ffwd"])
    place("drums", hat(0.3 + 0.7 * p if k % 2 == 0 else 0.2 + 0.3 * p), t0, 0.12, pan=0.22 if k % 2 else -0.1)
    if k % 4 == 0:
        add_kick(t0, 0.45 + 0.3 * p, dec=0.14)
add_kick(T["done"], 0.7, dec=0.2)
for t0, v in ((T["s4"], 0.7), (T["s4"] + 0.25, 0.4), (19.8, 0.6), (20.05, 0.34)):   # the dark: a heartbeat
    add_kick(t0, v, dec=0.2, f1=46)
for t0 in grid(T["bars"], 21.0):                                   # the engine ticks while it weighs
    k = idx(t0, BEAT)
    place("drums", tick(0.9 if k % 2 == 0 else 0.7, 2600 if k % 2 == 0 else 1900), t0, 0.14, pan=-0.3 if k % 2 == 0 else 0.3, rev=0.35)
for t0 in grid(21.0, T["rep"]):
    add_kick(t0, 0.5 + 0.25 * (t0 - 21.0), dec=0.15)
for i, t0 in enumerate(grid(21.6, T["rep"], BEAT / 4)):           # a clap roll into the report
    place("drums", clap(0.35 + 0.1 * i), t0, 0.12, rev=0.2)
for t0 in grid(T["rep"], 26.4):                                    # the report: four on the floor
    add_kick(t0, 1.0 if abs(t0 - T["rep"]) < 1e-6 else 0.82)
for t0 in grid(T["rep"] + BEAT, 26.4, 2 * BEAT):
    place("drums", clap(1.0), t0, 0.28, rev=0.14)
for i, t0 in enumerate(grid(T["rep"], 26.4, BEAT / 4)):
    acc = 1.0 if i % 4 == 2 else 0.45 if i % 2 == 0 else 0.2
    place("drums", hat(acc), t0, 0.13, pan=0.22 if i % 2 else -0.1)
for t0 in (24.3, 26.1):                                            # open hat on the and-of-four
    place("drums", hat(0.6, open_=True), t0, 0.09, pan=0.3)

# Plucked arpeggios: quarters under the busy interface steps, 8ths when it opens up.
ARP = {3.0: [74, 78, 81, 76, 74, 83, 81, 78], 5.4: [74, 78, 81, 73, 74, 85, 81, 78],
       7.8: [74, 79, 81, 78, 74, 83, 81, 78], 10.2: [76, 81, 83, 74, 76, 86, 83, 81], 11.4: [76, 81, 85, 73, 76, 88, 85, 81],
       12.6: [74, 78, 81, 76, 74, 83, 81, 78], 15.0: [74, 78, 81, 73, 74, 85, 81, 78],
       22.2: [74, 79, 81, 78, 83, 86, 81, 78], 24.6: [76, 81, 83, 74, 76, 86, 83, 81], 25.8: [76, 81, 85, 73, 76, 88, 85, 81]}
LANES = [(T["s1"], T["s2"], BEAT, 0.05), (T["s2"], T["zoom2"], BEAT / 2, 0.06), (T["s3"], T["ffwd"], BEAT, 0.05),
         (T["rep"], 26.4, BEAT / 2, 0.075)]
for a, b, step, g in LANES:
    for t0 in grid(a, b, step):
        key = max(k for k in ARP if k <= t0)
        i = idx(t0, step)
        place("keys", fm_pluck(mtof(ARP[key][i % 8]), 0.45, 0.8 if i % 4 == 0 else 0.45, 0.2 if step == BEAT else 0.17),
              t0, g if i % 2 else g * 1.25, pan=0.35 * np.sin(i * 1.3), rev=0.3)

# ------------------------------------------------------------ sound design
# The point drops in and lands; the mark grows out of it.
d = T["land"] - T["drop"]
td = tt(d)
fw = 1900 * (650 / 1900) ** (td / d) ** 1.6                         # a falling whistle, gravity-shaped
place("sfx", np.sin(2 * np.pi * np.cumsum(fw) / SR) * (td / d) ** 1.5 * 0.5, 0.0, 0.1, rev=0.3)
place("sfx", whoosh(d, 900, 3800, peak=0.85, q=1.0, vel=0.7), 0.0, 0.3, rev=0.2)
place("hits", tock(1050, 1.0), T["land"], 0.5, rev=0.35)
place("hits", boom(1.2, 88, 42, 0.6), T["land"], 0.2)
place("keys", bell(mtof(81), 2.2, 1.0), T["land"], 0.07, rev=0.6)            # sonar ping
place("keys", bell(mtof(88), 1.6, 0.6), T["land"] + 0.09, 0.03, pan=-0.2, rev=0.7)
chatter(T["eye0"], T["eye0"] + 0.4, 0.025)
for t0, m, br in ((T["l1"], 74, 0.5), (T["l2"], 78, 0.65), (T["l3"], 81, 0.9)):   # one code, one assessment, one report
    place("keys", fm_pluck(mtof(m), 1.0, br, 0.4), t0 + 0.02, 0.1, rev=0.4)
place("keys", bell(mtof(86), 2.0, 0.8), T["l3"] + 0.02, 0.03, rev=0.6)
# the mark flies to the header lockup; the wordmark wipes on beside it
place("sfx", whoosh(0.65, 1600, 500, 0.45, 1.2, 0.7, 0.0, -0.5), T["out0"], 0.2, rev=0.2)
for k in range(10):
    place("sfx", tick(0.6, 3600 + 200 * k), T["s1"] - 0.22 + k * 0.045, 0.035, pan=-0.45 + 0.03 * k)

# Step titles: the eyebrow decodes and the headline rises; it leaves with a softer swish.
for s in ("s1", "s2", "s3", "s4", "rep"):
    chatter(T[s], T[s] + 0.45, 0.02, pan=-0.3)
    place("sfx", whoosh(0.45, 600, 2400, 0.5, 1.4, 0.45, -0.3, 0.1), T[s] + 0.03, 0.1)
for t1 in (T["s2"], T["s3"], T["s4"], T["rep"], T["end"]):
    place("sfx", whoosh(0.35, 2200, 700, 0.35, 1.4, 0.35, 0.1, -0.3), t1 - 0.3, 0.07)

# 01 sign up: the card, the typing, the tap, the ticket and its code
place("sfx", whoosh(0.5, 400, 1800, 0.55, 1.2, 0.6), T["card"], 0.16, rev=0.15)
place("hits", tock(620, 0.5), T["card"] + 0.28, 0.12, rev=0.1)
for i, t0 in enumerate(CUES["keys"]):
    place("sfx", key_click(0.7 + 0.3 * var.random(), var.uniform(2600, 4000)), t0 + var.uniform(-0.006, 0.006), 0.14,
          pan=vpan(180 + 16 * i))
place("sfx", blip(880, 1175, 0.07, 0.8), T["size"], 0.07, pan=0.0, rev=0.15)
place("sfx", tap(1.0), T["tap"] - 0.02, 0.28, pan=vpan(560))
place("hits", tock(780, 0.6), T["tap"], 0.18, pan=vpan(560), rev=0.2)
place("keys", fm_pluck(mtof(86), 0.7, 0.9, 0.25), T["tap"] + 0.04, 0.06, rev=0.35)
place("sfx", whoosh(0.55, 700, 3200, 0.5, 1.3, 0.6, -0.15, 0.15), T["ticket"], 0.16, rev=0.2)
chatter(T["code"] - 0.1, T["code"] + 0.5, 0.035, f=(3000, 5200))
for i in range(7):                                                   # each character locks in, rising
    place("sfx", tick(1.0, 3000 + 380 * i), T["code"] - 0.1 + 0.65 * (i + 6) / 13, 0.08, rev=0.15)
lock = T["code"] + 0.52
place("hits", tock(1575, 0.8), lock, 0.2, rev=0.35)
for k, m in enumerate((81, 86)):
    place("keys", bell(mtof(m), 2.2, 0.9), lock + 0.03 * k, 0.05, pan=-0.15 + 0.3 * k, rev=0.6)
place("sfx", pop(1400, 0.8), T["unique"], 0.09, pan=vpan(344), rev=0.3)
place("keys", bell(mtof(90), 1.4, 0.5), T["unique"] + 0.02, 0.022, pan=vpan(344), rev=0.6)
place("sfx", whoosh(0.6, 1600, 400, 0.5, 1.2, 0.6, 0.0, 0.0), T["out1"], 0.16, rev=0.2)
place("hits", tock(1250, 0.5), T["s2"] + 0.02, 0.16, rev=0.3)

# 02 share: each ring pops up, the code travels out, and every dot pings as it arrives.
PENT = [74, 76, 78, 81, 83, 86, 88, 90, 93, 95, 98]
pops, gots = CUES["pop"], CUES["got"]
for g in range(3):
    ps = [p for p in pops if p["grp"] == g][:: (3 if g == 2 else 1)]
    for j, p in enumerate(ps):
        place("sfx", pop(900 + 700 * j / max(1, len(ps) - 1), 0.8), p["t"], 0.07 if g < 2 else 0.05, pan=vpan(p["x"]), rev=0.2)
    place("sfx", whoosh(0.6, 1200, 4200, 0.6, 1.6, 0.5, 0.0, 0.0), T["send"][g], 0.07 + 0.02 * g, rev=0.3)
    gs = sorted((e for e in gots if e["grp"] == g), key=lambda e: e["t"])[:: (2 if g == 2 else 1)]
    for j, e in enumerate(gs):
        m = PENT[min(len(PENT) - 1, int(j * (len(PENT) - 1) / max(1, len(gs) - 1)) if g else j)]
        place("keys", fm_pluck(mtof(m), 0.5, 0.6, 0.14, ratio=3.0), e["t"] + 0.01, 0.05 if g < 2 else 0.035,
              pan=vpan(e["x"]), rev=0.35)
    place("hits", tock([1050, 1250, 1575][g], 0.6), T["got"][g], 0.14 + 0.03 * g, rev=0.3)
    place("keys", bell(mtof([81, 85, 88][g]), 1.8, 0.8), T["got"][g] + 0.02, 0.04, rev=0.6)
# the dot we follow grows into a phone
place("sfx", riser(0.6, 200, 1600, 0.8), T["zoom2"], 0.14)
place("sfx", whoosh(0.9, 350, 2600, 0.7, 1.1, 0.8, 0.2, 0.0), T["zoom2"] + 0.05, 0.22, rev=0.2)
place("hits", kick(0.8, 0.45, 150, 48, 0.04, 0.18), T["s3"], 0.4)
place("hits", filt(noise(int(0.7 * SR)), "hp", 3500) * np.exp(-tt(0.7) / 0.16), T["s3"], 0.1, rev=0.4)

# 03 answer: pick an option, tap Next, the other questions flick past, submitted.
place("sfx", whoosh(0.35, 800, 2800, 0.5, 1.4, 0.4), T["qIn"], 0.08)
place("sfx", tap(0.9), T["pick"] - 0.02, 0.24, pan=vpan(482))
place("sfx", blip(700, 1400, 0.06, 0.8), T["pick"] + 0.01, 0.09, pan=vpan(482), rev=0.2)
place("keys", fm_pluck(mtof(81), 0.6, 0.8, 0.22), T["pick"] + 0.02, 0.06, pan=vpan(482), rev=0.3)
place("sfx", tap(0.9), T["next"] - 0.02, 0.24, pan=0.0)
place("sfx", blip(900, 1500, 0.06, 0.7), T["next"] + 0.01, 0.07, rev=0.2)
for j, t0 in enumerate(CUES["qTicks"]):                              # each new question slides in
    place("sfx", whoosh(0.16, 1800, 5200, 0.4, 1.8, 0.7, 0.35, -0.35), t0 - 0.06, 0.07)
    place("keys", fm_pluck(mtof(PENT[j]), 0.35, 0.5, 0.1, ratio=3.0), t0, 0.045, pan=0.2 * np.sin(j), rev=0.3)
r = riser(T["done"] - T["ffwd"] - 0.05, 180, 2400, 0.9)
r[-int(0.03 * SR):] *= np.linspace(1, 0, int(0.03 * SR))
place("sfx", r, T["ffwd"], 0.22, rev=0.15)
for k, m in enumerate((86, 90, 93)):                                 # submitted
    place("keys", bell(mtof(m), 2.6, 1.1), T["done"] + 0.05 * k, 0.06, pan=-0.2 + 0.2 * k, rev=0.6)
place("sfx", whoosh(0.3, 2400, 6000, 0.4, 1.8, 0.4), T["done"] + 0.08, 0.06)
place("sfx", whoosh(0.5, 2600, 500, 0.4, 1.2, 0.6, 0.0, 0.1), T["shrink"], 0.14, rev=0.2)
dn = sorted(CUES["done"])[::3]                                       # everyone else finishes too
for j, t0 in enumerate(dn):
    m = PENT[min(len(PENT) - 1, j * len(PENT) // len(dn))]
    place("keys", fm_pluck(mtof(m), 0.3, 0.4, 0.07, ratio=3.0), t0, 0.022, pan=0.4 * np.sin(j * 2.1), rev=0.4)

# 04 diagnose: into the dark, the answers pour into the mark, six dimensions, one score.
place("sfx", reverse_swell(0.5, 0.5, 1500), T["s4"] - 0.5, 0.25)
place("sfx", whoosh(0.9, 1200, 180, 0.08, 0.8, 0.9, 0.0, 0.0), T["s4"], 0.3, rev=0.5)
place("hits", boom(2.2, 74, 34, 1.0), T["s4"], 0.34, rev=0.2)
place("hits", tock(700, 0.9), T["markIn"], 0.26, rev=0.5)
place("keys", bell(mtof(83), 2.6, 1.1), T["markIn"] + 0.02, 0.06, rev=0.8)
# the pour: a swirl around the stereo field and a sparkle per arrival
pd = CUES["pour"][-1] - T["pour"] + 0.1
tp = tt(pd)
sw = svf(noise(len(tp)), 900 + 2600 * (tp / pd) ** 1.5, 1.6, "bp") * np.sin(np.pi * tp / pd) ** 1.5
ang = 0.35 * np.sin(2 * np.pi * 2.2 * tp) * np.pi / 2 + np.pi / 4
place("sfx", np.stack([sw * np.cos(ang), sw * np.sin(ang)], axis=1) * np.sqrt(2), T["pour"], 0.17, rev=0.3)
for j, t0 in enumerate(CUES["pour"][::2]):
    place("sfx", tick(0.8, var.uniform(5000, 8000)), t0, 0.03, pan=var.uniform(-0.4, 0.4), rev=0.4)
# the mark spins up like an engine
sp0, sp1 = T["pour"] + 0.2, T["bars"] + 0.6
ts = tt(sp1 - sp0)
u = ts / (sp1 - sp0)
spd = np.where(u < 0.5, 12 * u * u, 12 * (1 - u) ** 2) / 3.0       # speed of an inOutCubic spin, 0..1
fh = 55 + 70 * spd
hum = filt(saw(fh, len(ts)) + 0.5 * saw(fh * 1.5, len(ts), 0.3), "lp", 500) * spd ** 1.3
place("sfx", svf(hum, 250 + 1400 * spd, 1.2, "lp"), sp0, 0.07, rev=0.3)
for k, t0 in enumerate(CUES["bars"]):                                # six dimensions, one pluck each
    if k == 4:
        place("keys", bell(mtof(90), 1.8, 0.8), t0 + 0.05, 0.06, rev=0.6)      # Affinity: the ochre focus area
    place("keys", fm_pluck(mtof([76, 79, 83, 86, 90, 95][k]), 0.8, 0.9, 0.28), t0 + 0.05, 0.08, pan=-0.3 + 0.12 * k, rev=0.35)
place("sfx", whoosh(1.2, 600, 5200, 0.35, 2.0, 0.7, -0.5, 0.5), T["bars"] + 0.05, 0.12, rev=0.1)
# the mark becomes the ring and the score counts up
place("sfx", reverse_swell(0.5, 0.45, 2500), T["weigh"] - 0.35, 0.2)
place("sfx", whoosh(0.7, 2400, 400, 0.45, 1.1, 0.8, 0.0, 0.0), T["weigh"], 0.22, rev=0.3)
for t0 in CUES["ring"]:
    place("sfx", tick(0.8, 4200), t0, 0.05, pan=0.1)
place("hits", tock(1250, 0.6), CUES["ring"][-1] + 0.03, 0.16, rev=0.35)
place("keys", bell(mtof(81), 2.4, 1.0), T["tier"], 0.05, pan=-0.15, rev=0.7)
place("keys", bell(mtof(85), 2.4, 1.0), T["tier"] + 0.05, 0.045, pan=0.15, rev=0.7)
for k in range(2):
    place("sfx", blip(800, 1600, 0.07, 0.8), T["badges"] + 0.12 * k, 0.07, pan=-0.2 + 0.4 * k, rev=0.2)
r = riser(0.9, 160, 2600, 1.0)
r[-int(0.03 * SR):] *= np.linspace(1, 0, int(0.03 * SR))
place("sfx", r, T["rep"] - 0.92, 0.36, rev=0.15)
place("sfx", reverse_swell(0.9, 0.5, 4000), T["rep"] - 0.92, 0.3)

# The report: the sheet springs up over the dark.
t9 = T["rep"]
place("hits", boom(1.2, 92, 44, 0.8), t9, 0.24)
place("hits", clap(1.0), t9, 0.3, rev=0.4)
place("hits", filt(noise(int(0.9 * SR)), "hp", 3000) * np.exp(-tt(0.9) / 0.22), t9, 0.16, rev=0.5)
place("sfx", whoosh(0.5, 300, 2600, 0.55, 1.2, 0.8), t9, 0.22, rev=0.2)
for m in (62, 69, 74, 78, 81):
    place("keys", fm_pluck(mtof(m), 1.4, 1.2, 0.5), t9, 0.06, pan=0.1 * (m - 72) / 6, rev=0.35)
place("sfx", tick(0.9, 3400), T["rows"] + 0.02, 0.07, pan=-0.3)
lr = 0
last = -1.0
for k in range(1, 800):                                              # the mini ring counts to 88
    t0 = T["rows"] + 0.1 + k * 0.001
    v = int(88 * (1 - (1 - min(1.0, (t0 - T["rows"] - 0.1) / 0.7)) ** 5))
    if v != lr:
        lr = v
        if t0 - last > 0.025:
            place("sfx", tick(0.7, 4600), t0, 0.035, pan=-0.35)
            last = t0
place("keys", bell(mtof(81), 1.8, 0.8), T["rows"] + 0.2, 0.03, pan=0.1, rev=0.6)
for k in range(2):
    place("sfx", blip(800, 1600, 0.06, 0.7), T["rows"] + 0.45 + 0.1 * k, 0.05, pan=0.1 + 0.2 * k, rev=0.2)
for t0, f0, m in ((T["act1"], 1050, 86), (T["act2"], 1250, 90)):   # two named actions
    place("hits", tock(f0, 0.7), t0, 0.18, pan=-0.35, rev=0.3)
    place("keys", fm_pluck(mtof(m), 0.9, 1.0, 0.3), t0 + 0.05, 0.07, pan=-0.1, rev=0.4)
place("sfx", whoosh(0.6, 2000, 7000, 0.4, 3.0, 0.45, -0.5, 0.5), T["act2"] + 0.3, 0.06)
# scheduled remeasurement: the loop turns, a swirl goes round the room
d = 0.9
tq = tt(d)
lp = svf(noise(len(tq)), 1400 + 900 * np.sin(np.pi * tq / d), 2.2, "bp") * np.sin(np.pi * tq / d) ** 2
ang = (0.55 * np.sin(2 * np.pi * tq / d) + 1) * np.pi / 4
place("sfx", np.stack([lp * np.cos(ang), lp * np.sin(ang)], axis=1) * np.sqrt(2), T["remeasure"], 0.14, rev=0.3)
place("keys", bell(mtof(88), 2.4, 1.0), T["remeasure"] + 0.05, 0.05, pan=-0.3, rev=0.7)
place("keys", bell(mtof(93), 2.0, 0.8), T["remeasure"] + 0.35, 0.03, pan=0.3, rev=0.7)

# The inhale, then the end card: paper floods back and the lockup lands.
place("sfx", reverse_swell(T["end"] - 26.4 + 0.05, 0.8, 2500), 26.4 - 0.05, 0.4)
place("sfx", riser(T["end"] - 26.4 - 0.03, 220, 1800, 0.9), 26.4, 0.28)
place("sfx", whoosh(0.55, 2000, 400, 0.4, 1.1, 0.6, 0.0, 0.0), T["end"] - 0.2, 0.12)   # the sheet drops away
te = T["end"]
place("hits", boom(2.4, 76, 34, 1.0), te, 0.4, rev=0.25)
place("hits", kick(1.0, 0.5, 170, 48, 0.04, 0.2), te, 0.42)
place("hits", filt(noise(int(1.8 * SR)), "hp", 2500) * np.exp(-tt(1.8) / 0.45), te, 0.13, rev=0.7)
place("sfx", whoosh(0.7, 500, 3000, 0.35, 1.0, 0.7, 0.0, 0.0), te, 0.2, rev=0.3)
for m in (62, 69, 74, 78, 81, 86):
    place("keys", bell(mtof(m), 4.5, 1.8), te, 0.05, pan=0.12 * (m - 74) / 6, rev=0.7)
place("hits", tock(1575, 1.0), te + 0.75, 0.4, rev=0.5)             # the lockup lands: the opening tock, a fifth up
place("keys", bell(mtof(86), 2.8, 1.2), te + 0.75, 0.05, rev=0.7)
place("keys", bell(mtof(81), 2.6, 1.4), T["tag1"], 0.045, pan=-0.2, rev=0.8)
place("keys", bell(mtof(78), 2.4, 1.4), T["tag2"], 0.045, pan=0.2, rev=0.8)
place("sfx", pop(700, 1.0, 0.12), T["cta"] + 0.02, 0.1, rev=0.3)
place("hits", tock(1050, 0.5), T["cta"] + 0.02, 0.12, rev=0.4)
place("keys", fm_pluck(mtof(74), 1.2, 0.9, 0.45), T["cta"] + 0.04, 0.07, rev=0.5)
place("sfx", whoosh(0.7, 5000, 9000, 0.5, 3.0, 0.6, -0.4, 0.4), T["cta"] + 0.6, 0.06, rev=0.4)   # the highlight sweep
place("keys", bell(mtof(93), 1.6, 0.8), T["cta"] + 1.25, 0.02, pan=0.35, rev=0.8)

S.master(OUT)

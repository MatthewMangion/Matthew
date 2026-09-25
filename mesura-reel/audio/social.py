"""Mesura social reels: one scoring engine for the whole series.

Each reel exports a cue sheet (audio/social/<id>.json): its length, the downbeat the end card
lands on, a small arrangement (chords, plus drum, bass and arpeggio sections) and the events the
animation produces: the opening hit, statements entering and leaving, dots lighting, bars
growing, list items, reveals. This script arranges and mixes it at 100 BPM, so every reel in the
series shares one sound and every sound sits on the picture.

    python3 audio/social.py audio/social/<id>.json [out.wav]
"""
import json
import sys
from pathlib import Path

import numpy as np

import synth as S
from synth import SR, mtof, tt, place, env_ad, filt, svf, noise, saw, clap, hat, tick, fm_pluck, bell, tock, blip, \
    whoosh, riser, reverse_swell, boom, kick, pad_chord, add_kick, tap, pop, bass

CUES = json.loads(Path(sys.argv[1]).read_text())
OUT = Path(sys.argv[2] if len(sys.argv) > 2 else "social.wav")
DUR, LAND = float(CUES["DUR"]), float(CUES["LAND"])
S.init(DUR)
N = S.N
M = CUES["music"]
var = np.random.default_rng(sum(map(ord, CUES["id"])))

BEAT = 0.6                      # 100 BPM; bars start at 0.0


def grid(a, b, step=BEAT):
    """Times in [a, b) on the beat grid."""
    t = np.ceil(a / step - 1e-6) * step
    out = []
    while t < b - 1e-6:
        out.append(round(float(t), 4))
        t += step
    return out


def idx(t0, step):
    return int(round(t0 / step))


def vpan(x):
    """Screen x (0..1080) to stereo pan; a vertical frame is narrow, so keep it inside."""
    return float(np.clip(x / 1080 * 2 - 1, -1, 1)) * 0.6


CHORDS = M["chords"]            # [t0, t1, bass note, voicing]


def chord_at(t0):
    return next((c for c in CHORDS if c[0] <= t0 < c[1]), CHORDS[-1])


PENT = [74, 76, 78, 81, 83, 86, 88, 90, 93, 95, 98]      # D major pentatonic from D5

# ------------------------------------------------------------- arrangement
for a, b, _, notes in CHORDS:
    at_end = abs(a - LAND) < 1e-6
    pad_chord(notes, max(0.0, a - (0.02 if a else 0)), b, gain=0.3 if at_end else 0.21, att=0.06 if a == 0 or at_end else 0.3)

# The pad opens with the drums and blooms when the mark lands.
CUT = {"groove": 2800, "pulse": 2200, "half": 1600, "clock": 1400, "none": 1200, "dark": 650}
pt, pv = [], []
for a, b, kind in M["drums"]:
    pt += [a + (0.2 if a else 0), b]
    pv += [CUT[kind], CUT[kind]]
pt += [LAND, LAND + 0.4, DUR]
pv += [4600, 4000, 1500]
order = np.argsort(pt, kind="stable")
tl = np.arange(N) / SR
S.BUS["pad"] = svf(S.BUS["pad"], np.interp(tl, np.array(pt)[order], np.array(pv)[order]), 0.8, "lp")

for a, b, kind in M["bass"]:
    if kind == "eighths":                                  # 8ths, an octave pop on the last of four
        for t0 in grid(a, b, BEAT / 2):
            i = idx(t0, BEAT / 2)
            bass(chord_at(t0)[2] + (12 if i % 4 == 3 else 0), t0, 0.24, 0.19 if i % 2 == 0 else 0.12)
    elif kind == "quarters":
        for t0 in grid(a, b):
            bass(chord_at(t0)[2], t0, 0.3, 0.17 if idx(t0, BEAT) % 2 == 0 else 0.11)
    elif kind == "hold":                                   # long notes, one per chord
        for c0, c1, root, _ in CHORDS:
            s0, s1 = max(a, c0), min(b, c1)
            if s1 > s0 + 0.05:
                bass(root, s0, s1 - s0, 0.13, att=0.08, rel=0.3, bite=0.12)
bass(chord_at(LAND)[2], LAND, DUR - LAND, 0.2, att=0.005, rel=0.3)

for a, b, kind in M["drums"]:
    if kind == "groove":                                   # four on the floor, claps on 2 and 4, 16th hats
        for t0 in grid(a, b):
            add_kick(t0, 1.0 if idx(t0, BEAT) % 4 == 0 else 0.82)
            if idx(t0, BEAT) % 2 == 1:
                place("drums", clap(1.0), t0, 0.26, rev=0.14)
        for t0 in grid(a, b, BEAT / 4):
            i = idx(t0, BEAT / 4)
            place("drums", hat(1.0 if i % 4 == 2 else 0.45 if i % 2 == 0 else 0.2), t0, 0.12, pan=0.22 if i % 2 else -0.1)
        for t0 in grid(a, b, 4 * BEAT):
            if t0 + 3.5 * BEAT < b:
                place("drums", hat(0.6, open_=True), t0 + 3.5 * BEAT, 0.08, pan=0.3)
    elif kind == "pulse":                                  # kick on 1 and 3, a rim tick on 2 and 4
        for t0 in grid(a, b):
            if idx(t0, BEAT) % 2 == 0:
                add_kick(t0, 0.66, dec=0.16)
            else:
                place("drums", tock(1900, 0.6), t0, 0.07, pan=-0.2, rev=0.15)
        for i, t0 in enumerate(grid(a, b, BEAT / 2)):
            place("drums", hat(0.5 if i % 2 else 0.28), t0, 0.1, pan=0.25)
    elif kind == "half":                                   # half time: kick on 1, clap on 3
        for t0 in grid(a, b):
            j = idx(t0, BEAT) % 4
            if j == 0:
                add_kick(t0, 0.62, dec=0.18)
            elif j == 2:
                place("drums", clap(0.7), t0, 0.16, rev=0.25)
        for i, t0 in enumerate(grid(a, b, BEAT / 2)):
            place("drums", hat(0.35 if i % 2 else 0.2), t0, 0.08, pan=0.25)
    elif kind == "clock":                                  # a ticking clock while the viewer decides
        for t0 in grid(a, b, BEAT / 2):
            k = idx(t0, BEAT / 2)
            place("drums", tick(1.0 if k % 2 == 0 else 0.75, 3000 if k % 2 == 0 else 2300), t0, 0.14, pan=-0.25 if k % 2 == 0 else 0.25, rev=0.2)
    elif kind == "dark":                                   # a heartbeat and a clock
        for t0 in grid(a, b, 4 * BEAT):
            add_kick(t0, 0.7, dec=0.2, f1=46)
            add_kick(t0 + 0.25, 0.36, dec=0.2, f1=46)
        for t0 in grid(a, b):
            k = idx(t0, BEAT)
            place("drums", tick(0.9 if k % 2 == 0 else 0.7, 2600 if k % 2 == 0 else 1900), t0, 0.12, pan=-0.3 if k % 2 == 0 else 0.3, rev=0.35)

ARP = [0, 2, 1, 3, 0, 4, 2, 3]
for a, b, step in M.get("arps", []):
    for t0 in grid(a, b, step):
        notes = chord_at(t0)[3]
        pool = sorted({n + o for n in notes for o in (0, 12, 24) if 72 <= n + o <= 90})
        i = idx(t0, step)
        m = pool[ARP[i % 8] % len(pool)]
        g = 0.06 if step < BEAT else 0.05
        place("keys", fm_pluck(mtof(m), 0.45, 0.8 if i % 4 == 0 else 0.45, 0.17 if step < BEAT else 0.2), t0,
              g * (1.25 if i % 2 == 0 else 1), pan=0.35 * np.sin(i * 1.3), rev=0.3)


# ------------------------------------------------------------ sound design
def ev_hit(e):                   # the hook: everything lands on the first downbeat
    t0 = e["t"]
    place("hits", boom(1.4, 92, 42, 0.9), t0, 0.3)
    place("hits", kick(1.0, 0.5, 170, 48, 0.04, 0.2), t0, 0.36)
    place("hits", clap(1.0), t0, 0.26, rev=0.35)
    place("hits", filt(noise(int(0.9 * SR)), "hp", 3000) * np.exp(-tt(0.9) / 0.22), t0, 0.14, rev=0.5)
    for m in chord_at(t0)[3]:
        place("keys", fm_pluck(mtof(m + 12), 1.2, 1.2, 0.45), t0, 0.05, pan=0.12 * (m - 64) / 6, rev=0.35)
    place("keys", bell(mtof(chord_at(t0)[3][-1] + 12), 2.2, 1.0), t0 + 0.02, 0.035, rev=0.6)


def ev_question(e):              # a softer hit for the closing question
    t0 = e["t"]
    place("sfx", reverse_swell(0.5, 0.5, 2500), t0 - 0.5, 0.22)
    place("hits", boom(1.6, 80, 40, 0.7), t0, 0.22, rev=0.2)
    place("keys", bell(mtof(81), 2.6, 1.3), t0 + 0.02, 0.05, pan=-0.15, rev=0.7)
    place("keys", bell(mtof(88), 2.2, 1.1), t0 + 0.1, 0.035, pan=0.15, rev=0.7)


def ev_in(e):
    place("sfx", whoosh(0.4, 700, 2400, 0.5, 1.4, 0.45, -0.25, 0.1), e["t"] + 0.02, 0.08 * e.get("v", 1))


def ev_out(e):
    place("sfx", whoosh(0.3, 2200, 700, 0.35, 1.4, 0.35, 0.1, -0.25), e["t"], 0.055 * e.get("v", 1))


def ev_swish(e):
    place("sfx", whoosh(0.45, 700, 2600, 0.5, 1.4, 0.45, -0.3, 0.1), e["t"], 0.1 * e.get("v", 1))


def ev_ping(e):                  # a dot lights up
    m = PENT[min(len(PENT) - 1, int(e.get("m", 0) * 0.5))]
    place("keys", fm_pluck(mtof(m), 0.5, 0.6, 0.14, ratio=3.0), e["t"] + 0.01, 0.045, pan=vpan(e.get("x", 540)), rev=0.35)
    place("sfx", tick(0.5, 5200), e["t"] + 0.01, 0.04, pan=vpan(e.get("x", 540)))


def ev_unping(e):                # a dot goes out
    f0 = 1300 - 80 * e.get("m", 0)
    place("sfx", blip(f0, f0 * 0.6, 0.08, 0.7), e["t"], 0.05, pan=0.2, rev=0.2)


def ev_suck(e):
    place("sfx", reverse_swell(e.get("d", 0.5), 0.5, 2000), e["t"], 0.2)


def ev_zip(e):                   # a bar grows
    place("sfx", whoosh(0.7, 500, 5200, 0.3, 2.2, 0.9, -0.5, 0.4), e["t"], 0.2 * e.get("v", 1), rev=0.1)


def ev_tape(e):                  # a measuring-tape zip
    place("sfx", whoosh(0.75, 2000, 7000, 0.4, 3.0, 0.6, -0.3, 0.5), e["t"], 0.1)


def ev_tick(e):
    place("sfx", tick(e.get("v", 1), e.get("f", 3000)), e["t"], 0.1, pan=e.get("p", 0.0), rev=0.1)


def ev_item(e):                  # a list item: a tick and a rising note
    place("sfx", tick(0.9, 3400), e["t"] + 0.02, 0.07, pan=-0.3)
    place("keys", fm_pluck(mtof([74, 78, 81, 86, 90][e.get("m", 0) % 5]), 0.8, 0.9, 0.28), e["t"] + 0.03, 0.07, pan=-0.2, rev=0.35)


def ev_drop(e):                  # the end-card point falls ...
    d = 0.4
    td = tt(d)
    fw = 1900 * (650 / 1900) ** (td / d) ** 1.6
    place("sfx", np.sin(2 * np.pi * np.cumsum(fw) / SR) * (td / d) ** 1.5 * 0.5, e["t"], 0.08, rev=0.3)
    place("sfx", whoosh(d, 900, 3800, 0.85, 1.0, 0.6), e["t"], 0.2, rev=0.2)


def ev_land(e):                  # ... and lands on the downbeat, where the final chord blooms
    t0 = e["t"]
    place("hits", boom(2.4, 76, 34, 1.0), t0, 0.36, rev=0.25)
    place("hits", kick(1.0, 0.5, 170, 48, 0.04, 0.2), t0, 0.38)
    place("hits", tock(1575, 1.0), t0, 0.36, rev=0.5)
    place("hits", filt(noise(int(1.8 * SR)), "hp", 2500) * np.exp(-tt(1.8) / 0.45), t0, 0.1, rev=0.7)
    for m in (62, 69, 74, 78, 81, 86):
        place("keys", bell(mtof(m), 4.0, 1.7), t0, 0.045, pan=0.12 * (m - 74) / 6, rev=0.7)


def ev_bell(e):
    place("keys", bell(mtof(e.get("m", 81)), 2.6, 1.4), e["t"], 0.045 * e.get("v", 1), pan=e.get("p", 0.0), rev=0.8)


def ev_cta(e):
    place("sfx", pop(700, 1.0, 0.12), e["t"] + 0.02, 0.1, rev=0.3)
    place("hits", tock(1050, 0.5), e["t"] + 0.02, 0.12, rev=0.4)
    place("keys", fm_pluck(mtof(74), 1.2, 0.9, 0.45), e["t"] + 0.04, 0.07, rev=0.5)
    place("sfx", whoosh(0.7, 5000, 9000, 0.5, 3.0, 0.6, -0.4, 0.4), e["t"] + 0.6, 0.05, rev=0.4)


def ev_dark(e):                  # the opening in the dark: a low boom and a slow breath in
    t0 = e["t"]
    place("hits", boom(2.4, 74, 34, 1.0), t0, 0.36, rev=0.2)
    place("hits", kick(0.8, 0.5, 130, 46, 0.05, 0.22), t0, 0.3)
    place("sfx", whoosh(1.4, 900, 200, 0.05, 0.7, 0.7, 0.0, 0.0), t0, 0.3, rev=0.6)
    for m, d in ((71, 0.0), (78, 0.12)):
        place("keys", bell(mtof(m), 2.6, 1.2), t0 + d, 0.045, pan=-0.2 + 0.4 * d / 0.12, rev=0.8)


def ev_focus(e):                 # a reversed breath as the text racks into focus
    place("sfx", reverse_swell(e.get("d", 0.8), 0.45, 1200), e["t"], 0.2, rev=0.4)


def ev_defocus(e):
    place("sfx", whoosh(0.5, 1800, 300, 0.2, 1.0, 0.5, 0.0, 0.0), e["t"], 0.12, rev=0.5)


def ev_hatch(e):                 # the gap is hatched in: quick scratches
    for j in range(9):
        place("sfx", tick(0.7, 5200 - 250 * j), e["t"] + j * e.get("d", 0.6) / 9, 0.05, pan=0.1 + 0.03 * j)
    place("keys", fm_pluck(mtof(64), 1.8, 0.4, 0.7, ratio=1.5), e["t"], 0.07, pan=0.2, rev=0.6)


def ev_name(e):                  # the name lands: a low hit and a bell
    place("hits", boom(1.4, 70, 36, 0.8), e["t"], 0.24, rev=0.3)
    place("keys", bell(mtof(83), 2.6, 1.2), e["t"] + 0.02, 0.06, rev=0.7)
    place("keys", bell(mtof(78), 2.2, 1.0), e["t"] + 0.1, 0.04, pan=0.2, rev=0.7)


def ev_strike(e):
    place("sfx", whoosh(0.3, 3000, 1200, 0.2, 2.0, 0.6, -0.4, 0.4), e["t"], 0.1)
    place("sfx", tick(0.8, 2400), e["t"] + 0.28, 0.06)


def ev_gather(e):                # everything drifts into one point
    place("sfx", reverse_swell(e.get("d", 0.9), 0.6, 2000), e["t"], 0.28)


def ev_card(e):                  # a card slides up
    place("sfx", whoosh(0.5, 400, 1800, 0.55, 1.2, 0.6), e["t"], 0.13, rev=0.15)
    place("hits", tock(620, 0.5), e["t"] + 0.3, 0.1, rev=0.1)


def ev_hop(e):                   # the selector hops between the choices
    place("sfx", blip(900 if e.get("m", 0) % 2 == 0 else 1200, 1500, 0.06, 0.8), e["t"], 0.07, pan=-0.2 if e.get("m", 0) % 2 == 0 else 0.2, rev=0.2)


def ev_cross(e):                 # a weakness: a low, dry knock
    place("hits", tock(420, 0.7), e["t"] + 0.08, 0.14, rev=0.1)
    place("sfx", blip(520, 300, 0.12, 0.8), e["t"] + 0.1, 0.06)


def ev_check(e):                 # a strength: a rising two-note chime
    place("keys", fm_pluck(mtof(81), 0.6, 0.8, 0.2), e["t"] + 0.08, 0.07, rev=0.3)
    place("keys", fm_pluck(mtof(86), 0.8, 0.9, 0.25), e["t"] + 0.16, 0.07, rev=0.3)


def ev_reveal(e):                # the answer: a bright bloom
    place("hits", boom(1.2, 92, 44, 0.7), e["t"], 0.2)
    place("hits", clap(0.9), e["t"], 0.2, rev=0.4)
    for m in (74, 78, 81, 86):
        place("keys", bell(mtof(m), 2.4, 1.0), e["t"] + 0.02 * (m - 74) / 4, 0.04, pan=0.1 * (m - 80) / 6, rev=0.6)


def ev_drop2(e):                 # things fall away
    place("sfx", whoosh(0.6, 2400, 300, 0.3, 1.2, 0.7, 0.0, 0.0), e["t"], 0.16, rev=0.2)


def ev_note(e):                  # a row arrives: one note of a rising line
    place("keys", fm_pluck(mtof(e.get("m", 74)), 0.8, 0.9, 0.28), e["t"] + 0.03, 0.075, pan=vpan(e.get("x", 540)), rev=0.35)
    place("sfx", tick(0.6, 3600), e["t"] + 0.02, 0.05, pan=vpan(e.get("x", 540)))


def ev_hmm(e):                   # an open question: a curious up-down blip
    place("sfx", blip(700, 1100, 0.09, 0.8), e["t"], 0.07, rev=0.3)
    place("sfx", blip(1100, 820, 0.12, 0.7), e["t"] + 0.13, 0.06, rev=0.3)
    place("keys", bell(mtof(83), 1.6, 0.8), e["t"] + 0.02, 0.03, rev=0.7)


def ev_take(e):                  # each new take rings a step higher, and its counter ticks
    i = e.get("m", 0)
    place("keys", bell(mtof([76, 78, 81, 83, 86][i % 5]), 2.4, 1.0), e["t"], 0.08, pan=0.3, rev=0.5)
    if i:
        place("sfx", blip(700, 1400, 0.05, 0.6), e["t"] + 0.35, 0.09, pan=-0.3)
    for j in range(8):
        place("sfx", tick(0.7, 4200), e["t"] + 0.02 + 0.6 * (j / 8) ** 1.8, 0.035, pan=0.2)


def ev_ring(e):                  # the rows become one ring: a sweep and a chord
    place("sfx", whoosh(0.9, 400, 3200, 0.6, 1.2, 0.7, -0.4, 0.4), e["t"] - 0.1, 0.18, rev=0.3)
    for j in range(12):
        place("sfx", tick(0.7, 4200), e["t"] + 0.02 + 1.0 * (j / 12) ** 1.8, 0.035, pan=0.1)
    place("hits", tock(1250, 0.7), e["t"] + 1.05, 0.16, rev=0.35)
    for m in (69, 74, 78):
        place("keys", bell(mtof(m + 12), 2.4, 1.0), e["t"] + 1.05 + 0.03 * (m - 69) / 4, 0.035, rev=0.6)


def ev_scroll(e):                # the report scrolls on to its next section
    place("sfx", whoosh(0.55, 1600, 500, 0.3, 1.2, 0.55, 0.0, 0.0), e["t"], 0.09, rev=0.2)


def ev_beep(e):                  # a countdown beep
    td = tt(0.14)
    y = np.sin(2 * np.pi * 880 * td) * env_ad(len(td), 0.003, 0.05)
    place("sfx", y, e["t"], 0.07, rev=0.25)


HANDLERS = {k[3:]: v for k, v in globals().items() if k.startswith("ev_")}
for e in CUES["events"]:
    HANDLERS[e["k"]](e)

S.master(OUT, fade_out=0.5)

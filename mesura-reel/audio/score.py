"""Mesura reel soundtrack: synthesised from scratch and locked to the animation.

120 BPM (one beat = 0.5 s). Bars start on odd seconds, so the big picture hits
(5.0 dive, 7.0 measure, 9.0 radar, 13.0 mark) are all downbeats.
Every sound-design event comes from cues.json, which the animation exports.

    python3 audio/score.py [cues.json] [out.wav]
"""
import json
import sys
from pathlib import Path

import numpy as np
from scipy import signal
from scipy.io import wavfile
from scipy.ndimage import minimum_filter1d, uniform_filter1d

SR = 48000
DUR = 15.0
N = int(SR * DUR)
HERE = Path(__file__).resolve().parent
CUES = json.loads(Path(sys.argv[1] if len(sys.argv) > 1 else HERE / "cues.json").read_text())
OUT = Path(sys.argv[2] if len(sys.argv) > 2 else HERE / "score.wav")
T = CUES["T"]
rng = np.random.default_rng(20260925)


# ------------------------------------------------------------------ helpers
def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def tt(dur):
    return np.arange(int(dur * SR)) / SR


def xpan(x):
    """Screen x (0..1920) to stereo pan (-1..1), kept inside the image."""
    return float(np.clip((x / 1920) * 2 - 1, -1, 1)) * 0.75


BUS = {k: np.zeros((N, 2)) for k in ("drums", "bass", "pad", "keys", "sfx", "hits")}
SEND = np.zeros((N, 2))  # reverb send


def place(bus, sig, t0, gain=1.0, pan=0.0, rev=0.0):
    """Mix a mono or stereo signal into a bus at time t0 (s), equal-power pan, optional reverb send."""
    sig = np.asarray(sig, dtype=float)
    if sig.ndim == 1:
        a = (pan + 1) * np.pi / 4
        sig = np.stack([sig * np.cos(a), sig * np.sin(a)], axis=1) * np.sqrt(2)
    i0 = int(round(t0 * SR))
    if i0 >= N:
        return
    s0 = max(0, -i0)
    i0 = max(0, i0)
    n = min(len(sig) - s0, N - i0)
    if n <= 0:
        return
    BUS[bus][i0:i0 + n] += sig[s0:s0 + n] * gain
    if rev:
        SEND[i0:i0 + n] += sig[s0:s0 + n] * gain * rev


def env_ad(n, att, dec_tau):
    t = np.arange(n) / SR
    a = np.clip(t / max(att, 1e-4), 0, 1)
    return a * np.exp(-np.maximum(t - att, 0) / dec_tau)


def sos(kind, f, order=2):
    if kind == "bp":
        return signal.butter(order, [f[0] / (SR / 2), f[1] / (SR / 2)], btype="band", output="sos")
    return signal.butter(order, f / (SR / 2), btype=kind, output="sos")


def filt(x, kind, f, order=2):
    return signal.sosfilt(sos(kind, f, order), x, axis=0)


def svf(x, fc, q=0.707, mode="lp"):
    """TPT state-variable filter with per-sample cutoff (for sweeps)."""
    fc = np.broadcast_to(np.asarray(fc, dtype=float), x.shape[:1])
    g = np.tan(np.pi * np.clip(fc, 10, SR * 0.45) / SR)
    k = 1.0 / q
    a1 = 1.0 / (1.0 + g * (g + k))
    a2 = g * a1
    a3 = g * a2
    out = np.zeros_like(x)
    chans = [x] if x.ndim == 1 else [x[:, c] for c in range(x.shape[1])]
    for c, xc in enumerate(chans):
        ic1 = ic2 = 0.0
        y = np.empty(len(xc))
        for n in range(len(xc)):
            v3 = xc[n] - ic2
            v1 = a1[n] * ic1 + a2[n] * v3
            v2 = ic2 + a2[n] * ic1 + a3[n] * v3
            ic1 = 2 * v1 - ic1
            ic2 = 2 * v2 - ic2
            y[n] = v2 if mode == "lp" else v1 if mode == "bp" else xc[n] - k * v1 - v2
        if x.ndim == 1:
            out = y
        else:
            out[:, c] = y
    return out


def saw(freq, n, phase=0.0):
    """Band-limited (polyBLEP) sawtooth; freq may be scalar or per-sample array."""
    freq = np.broadcast_to(np.asarray(freq, dtype=float), (n,))
    dt = freq / SR
    ph = (phase + np.cumsum(dt)) % 1.0
    y = 2 * ph - 1
    m = ph < dt
    x = ph[m] / dt[m]
    y[m] -= x + x - x * x - 1
    m = ph > 1 - dt
    x = (ph[m] - 1) / dt[m]
    y[m] -= x * x + x + x + 1
    return y


def noise(n):
    return rng.standard_normal(n)


# ------------------------------------------------------------ instruments
def kick(vel=1.0, dur=0.42, f0=160, f1=52, pd=0.03, dec=0.15, click=0.4):
    t = tt(dur)
    f = f1 + (f0 - f1) * np.exp(-t / pd)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / dec)
    body = np.tanh(body * 1.6) / np.tanh(1.6)
    c = filt(noise(len(t)), "hp", 2500) * np.exp(-t / 0.0035) * click
    out = (body + c) * vel
    out[: int(0.002 * SR)] *= np.linspace(0, 1, int(0.002 * SR))
    return out


def clap(vel=1.0):
    t = tt(0.35)
    n = noise(len(t))
    e = np.zeros(len(t))
    for d in (0.0, 0.009, 0.019):
        e += np.exp(-np.maximum(t - d, 0) / 0.006) * (t >= d)
    e += 0.6 * np.exp(-np.maximum(t - 0.024, 0) / 0.075) * (t >= 0.024)
    body = filt(n, "bp", (900, 3800)) * e
    tone = np.sin(2 * np.pi * 190 * t) * np.exp(-t / 0.05) * 0.25
    return (body + tone) * vel


def hat(vel=1.0, open_=False):
    t = tt(0.25 if open_ else 0.07)
    n = filt(noise(len(t)), "hp", 7200, 2)
    return n * np.exp(-t / (0.09 if open_ else 0.016)) * vel


def tick(vel=1.0, f=4200):
    t = tt(0.02)
    n = filt(noise(len(t)), "bp", (f * 0.7, f * 1.4))
    return n * np.exp(-t / 0.0022) * vel


def fm_pluck(freq, dur=0.6, bright=1.0, dec=0.28, ratio=2.0):
    t = tt(dur)
    idx = bright * 2.2 * np.exp(-t / 0.045)
    mod = np.sin(2 * np.pi * freq * ratio * t) * idx
    y = np.sin(2 * np.pi * freq * t + mod) * env_ad(len(t), 0.002, dec)
    return y


def bell(freq, dur=3.0, dec=1.4):
    t = tt(dur)
    parts = [(1.0, 1.0, 1.0), (2.0, 0.35, 0.6), (2.76, 0.28, 0.45), (5.4, 0.12, 0.22), (8.93, 0.05, 0.12)]
    y = np.zeros(len(t))
    for r, a, d in parts:
        y += a * np.sin(2 * np.pi * freq * r * t + rng.uniform(0, 6.28)) * np.exp(-t / (dec * d))
    y *= np.clip(t / 0.003, 0, 1)
    return y


def tock(freq=1050, vel=1.0):
    """The 'data point' sound: a warm woodblock tock with a sub thump."""
    t = tt(0.35)
    wood = (np.sin(2 * np.pi * freq * t) + 0.45 * np.sin(2 * np.pi * freq * 2.37 * t) * np.exp(-t / 0.012)) * np.exp(-t / 0.045)
    thump = np.sin(2 * np.pi * (90 + 70 * np.exp(-t / 0.02)) * t) * np.exp(-t / 0.07) * 0.55
    c = filt(noise(len(t)), "hp", 3000) * np.exp(-t / 0.002) * 0.3
    y = wood + thump + c
    y[: int(0.001 * SR)] *= np.linspace(0, 1, int(0.001 * SR))
    return y * vel


def blip(f0, f1, dur=0.09, vel=1.0):
    t = tt(dur)
    f = f0 * (f1 / f0) ** (t / dur)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env_ad(len(t), 0.003, dur * 0.35) * vel


def whoosh(dur, f0, f1, peak=0.6, q=1.4, vel=1.0, pan0=0.0, pan1=0.0):
    t = tt(dur)
    p = t / dur
    fc = f0 * (f1 / f0) ** p
    env = np.where(p < peak, (p / peak) ** 2, ((1 - p) / (1 - peak)) ** 1.6)
    y = svf(noise(len(t)), fc, q, "bp") * env * vel
    pan = pan0 + (pan1 - pan0) * p
    a = (pan + 1) * np.pi / 4
    return np.stack([y * np.cos(a), y * np.sin(a)], axis=1) * np.sqrt(2)


def riser(dur, f0=180, f1=2200, vel=1.0):
    t = tt(dur)
    p = t / dur
    f = f0 * (f1 / f0) ** (p ** 1.4)
    tone = saw(f, len(t)) + saw(f * 1.006, len(t), 0.3) + 0.5 * saw(f * 0.5, len(t), 0.6)
    tone = svf(tone, 300 + 6000 * p ** 2, 1.2, "lp")
    air = svf(noise(len(t)), 800 + 9000 * p ** 1.5, 1.0, "bp")
    env = p ** 2.2
    return (tone * 0.18 + air * 0.9) * env * vel


def reverse_swell(dur, vel=1.0, hp=3000):
    t = tt(dur)
    p = t / dur
    y = filt(noise(len(t)), "hp", hp) * (p ** 3.2)
    y2 = filt(noise(len(t)), "hp", hp)
    return np.stack([y, y2 * (p ** 3.2)], axis=1) * vel


def boom(dur=2.0, f0=82, f1=36, vel=1.0):
    t = tt(dur)
    f = f1 + (f0 - f1) * np.exp(-t / 0.35)
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.5)
    y = np.tanh(y * 2.0) / np.tanh(2.0)
    y[: int(0.004 * SR)] *= np.linspace(0, 1, int(0.004 * SR))
    return y * vel


def pad_chord(notes, t0, t1, gain=0.1, att=0.35, rel=0.6, detune=7, spread=0.55):
    dur = t1 - t0 + rel
    n = int(dur * SR)
    out = np.zeros((n, 2))
    t = np.arange(n) / SR
    env = np.clip(t / att, 0, 1) * np.clip((t1 - t0 + rel - t) / rel, 0, 1) ** 1.5
    for j, m in enumerate(notes):
        f = mtof(m)
        for k, c in enumerate((-detune, 0, detune)):
            ff = f * 2 ** (c / 1200) * (1 + 0.0015 * np.sin(2 * np.pi * (0.2 + 0.07 * k) * t + j))
            v = saw(ff, n, rng.uniform())
            pan = (k - 1) * spread * (1 if j % 2 else -1)
            a = (pan + 1) * np.pi / 4
            out[:, 0] += v * np.cos(a)
            out[:, 1] += v * np.sin(a)
    out *= (env * gain / np.sqrt(len(notes) * 3))[:, None]
    place("pad", out, t0)


def sub(note, t0, dur, gain=0.3, att=0.01, rel=0.08):
    t = tt(dur + rel)
    f = mtof(note)
    y = np.sin(2 * np.pi * f * t) + 0.18 * np.sin(4 * np.pi * f * t)
    env = np.clip(t / att, 0, 1) * np.clip((dur + rel - t) / rel, 0, 1)
    y = np.tanh(y * 1.3) * env
    place("bass", y, t0, gain)


# ------------------------------------------------------------- arrangement
BEAT = 0.5
KICKS = []


def add_kick(t0, vel=1.0, **kw):
    place("drums", kick(vel, **kw), t0, 0.5)
    KICKS.append((t0, vel))


# Harmony: bars start on odd seconds.
CHORDS = [
    (0.0, 3.0, 35, [59, 62, 66, 69, 73]),       # Bm9
    (3.0, 5.0, 31, [59, 62, 66, 69, 74]),       # Gmaj9 (add D5)
    (5.0, 7.0, 40, [55, 59, 62, 66]),           # Em9
    (7.0, 9.0, 38, [54, 57, 62, 64, 69]),       # Dadd9
    (9.0, 11.0, 42, [54, 57, 61, 64, 69]),      # F#m7(add A)
    (11.0, 13.0, 43, [55, 59, 62, 66, 69]),     # Gmaj9
    (13.0, 15.0, 26, [50, 54, 57, 61, 64, 69]),  # Dmaj9 (D1 sub)
]
for (a, b, bass, notes) in CHORDS:
    g = {0.0: 0.2, 3.0: 0.24, 5.0: 0.22, 7.0: 0.27, 9.0: 0.27, 11.0: 0.28, 13.0: 0.34}[a]
    pad_chord(notes, max(0.0, a - (0.05 if a else 0)), b, gain=g, att=0.9 if a == 0 else 0.12 if a in (7.0, 13.0) else 0.3)

# Pad filter: closed in the dark, opens at the measure, blooms at the mark.
tl = np.arange(N) / SR
cut = np.interp(tl, [0, 0.5, 2.5, 4.5, 5.0, 5.4, 6.3, 6.95, 7.0, 8.0, 12.2, 12.95, 13.0, 14.0, 15.0],
                [500, 900, 1400, 1700, 1200, 520, 700, 2400, 3200, 2800, 2600, 5200, 4200, 3000, 1600])
BUS["pad"] = svf(BUS["pad"], cut, 0.8, "lp")

# Bass
sub(47, 0.5, 1.9, 0.07, att=0.4)                   # soft B drone under the question
for k in range(4):                                      # data section: gentle 8ths
    for s in range(4):
        t0 = 2.5 + k * 0.5 + s * 0.125 * 2
        if t0 >= 4.75:
            break
        note = 47 if t0 < 3.0 else 43
        sub(note, t0, 0.2, 0.2 if s % 2 == 0 else 0.13)
sub(40, 5.4, 1.5, 0.12, att=0.05, rel=0.3)              # dark E drone
for (a, b, bass, _) in CHORDS[3:6]:                     # groove: 8th-note pulse with octave pops
    t0 = a
    i = 0
    while t0 < min(b, 12.25) - 1e-6:
        n_ = bass + (12 if i % 4 == 3 else 0)
        sub(n_, t0, 0.2, 0.2 if i % 2 == 0 else 0.13)
        t0 += 0.25
        i += 1
sub(38, 13.0, 1.9, 0.2, att=0.005, rel=0.2)

# Drums
for t0 in (2.5, 3.0, 3.5, 4.0, 4.5):
    add_kick(t0, 0.62, dec=0.16)
for t0 in (6.0, 6.25):
    add_kick(t0, 0.55 if t0 == 6.0 else 0.35, dec=0.18, f1=48)
t0 = 7.0
while t0 < 12.24:
    add_kick(t0, 1.0 if abs(t0 - 7.0) < 1e-6 else 0.85)
    t0 += 0.5
for t0 in np.arange(7.5, 12.2, 1.0):
    place("drums", clap(1.0), t0, 0.32, rev=0.12)
for i, t0 in enumerate(np.arange(2.5, 4.74, 0.125)):
    place("drums", hat(0.55 if i % 2 else 0.3), t0, 0.12, pan=0.25)
for i, t0 in enumerate(np.arange(7.0, 12.24, 0.125)):
    acc = 1.0 if i % 4 == 2 else 0.5 if i % 2 else 0.33
    place("drums", hat(acc), t0, 0.15, pan=0.22 if i % 2 else -0.1)
for t0 in np.arange(8.75, 12.2, 2.0):
    place("drums", hat(0.6, open_=True), t0, 0.09, pan=0.3)
for t0 in (5.5, 6.5):                                   # clock in the dark
    place("drums", tick(0.9, 2600), t0, 0.18, pan=-0.3, rev=0.35)
    place("drums", tick(0.7, 1900), t0 + 0.5, 0.14, pan=0.3, rev=0.35)

# Plucked arpeggio (groove sections)
ARP = {7.0: [74, 81, 76, 78, 81, 86, 78, 76], 9.0: [73, 78, 76, 81, 78, 85, 81, 76], 11.0: [74, 79, 78, 81, 83, 86, 81, 78]}
for a, pat in ARP.items():
    for i in range(16):
        t0 = a + i * 0.125
        if t0 >= 12.24:
            break
        place("keys", fm_pluck(mtof(pat[i % 8]), 0.35, 0.8 if i % 4 == 0 else 0.5, 0.16), t0, 0.06 if i % 2 else 0.085, pan=0.35 * np.sin(i * 1.3), rev=0.25)
for i in range(8):                                      # lighter 8ths in the data section
    t0 = 3.0 + i * 0.25
    if t0 >= 4.75:
        break
    pat = [74, 79, 81, 78, 74, 83, 81, 78]
    place("keys", fm_pluck(mtof(pat[i]), 0.4, 0.6, 0.2), t0, 0.07, pan=-0.3 + 0.08 * i, rev=0.3)

# ------------------------------------------------------------ sound design
# 0.0 - 0.5: the pull-out from inside the dot
place("sfx", whoosh(0.5, 3500, 380, peak=0.55, q=1.1, vel=0.9, pan0=0, pan1=0), 0.0, 0.5, rev=0.2)
place("sfx", reverse_swell(0.45, 0.5, 5000), 0.05, 0.25)
place("hits", tock(1050, 1.0), T["land"], 0.5, rev=0.35)
place("keys", bell(mtof(83), 2.0, 0.9), T["land"], 0.07, pan=0.1, rev=0.6)     # sonar ping
place("keys", bell(mtof(90), 1.5, 0.6), T["land"] + 0.09, 0.03, pan=-0.2, rev=0.7)
place("sfx", blip(420, 980, 0.12, 0.6), T["hop"] + 0.02, 0.18, pan=-0.3, rev=0.2)

# Line 1: the dot sweeps the baseline; each glyph plays a note of a rising run.
PENT_B = [59, 62, 64, 66, 69, 71, 74, 76, 78, 81, 83, 86]
for i, g in enumerate(CUES["glyphs1"]):
    m = PENT_B[min(len(PENT_B) - 1, int(round(i * 0.52)))]
    place("keys", fm_pluck(mtof(m), 0.5, 0.45, 0.14, ratio=3.0), g["t"] + 0.02, 0.05, pan=xpan(g["x"]), rev=0.3)
    place("sfx", tick(0.5, 5200), g["t"] + 0.02, 0.05, pan=xpan(g["x"]))
place("keys", fm_pluck(mtof(78), 0.9, 1.0, 0.35), T["dock1"], 0.13, pan=0.45, rev=0.35)
place("hits", tock(1250, 0.45), T["dock1"], 0.35, pan=0.45, rev=0.2)
for t0 in CUES["words2"]:
    place("sfx", tick(0.8, 3800), t0 + 0.03, 0.08, pan=0.0)
place("sfx", blip(900, 520, 0.14, 0.5), T["hop2"] + 0.03, 0.14, pan=0.4, rev=0.2)
place("keys", fm_pluck(mtof(83), 1.0, 1.0, 0.38), T["dock2"], 0.13, pan=0.35, rev=0.4)
place("hits", tock(1400, 0.45), T["dock2"], 0.35, pan=0.35, rev=0.25)
# exit + flight to the bar
place("sfx", whoosh(0.3, 1800, 350, 0.5, 1.2, 0.8, 0.4, -0.7), T["out1"] - 0.02, 0.28)
place("hits", tock(620, 0.8), T["bar1"], 0.3, pan=-0.75, rev=0.15)

# Bars: the zip of growth + odometer ticks
place("sfx", whoosh(0.55, 500, 5200, 0.3, 2.2, 0.9, -0.8, 0.4), T["bar1"], 0.26, rev=0.1)
place("sfx", whoosh(0.5, 400, 3400, 0.3, 2.2, 0.8, -0.8, -0.1), T["bar2"], 0.18, rev=0.1)
for i, t0 in enumerate(CUES["bar1"]):
    place("sfx", tick(1.0 - 0.02 * i, 4600), t0, 0.07, pan=0.3)
for i, t0 in enumerate(CUES["bar2"]):
    place("sfx", tick(0.9 - 0.015 * i, 3900), t0, 0.05, pan=-0.05)
# dimension line: a measuring-tape zip and three ticks
place("sfx", whoosh(0.5, 2000, 7000, 0.4, 3.0, 0.6, -0.7, 0.5), T["ghost"], 0.12)
for d in (0.0, 0.28, 0.5):
    place("sfx", tick(1.0, 3000), T["ghost"] + d, 0.12, pan=-0.6 + d * 2.4, rev=0.1)
# label flip (split-flap)
for k in range(7):
    place("sfx", tick(0.9 - k * 0.08, 2400 + 300 * (k % 3)), T["phaseB"] + 0.1 + k * 0.022, 0.1, pan=-0.6)
place("sfx", whoosh(0.35, 700, 2600, 0.5, 1.5, 0.5, -0.4, 0.2), T["head1"] - 0.05, 0.12)
place("sfx", whoosh(0.35, 700, 2600, 0.5, 1.5, 0.5, -0.4, 0.2), T["head2"] - 0.05, 0.12)
# the gap opens: an uneasy swell
place("keys", fm_pluck(mtof(64), 1.6, 0.4, 0.6, ratio=1.5), T["band"], 0.08, pan=0.2, rev=0.6)
place("sfx", reverse_swell(0.5, 0.35, 1800), T["zoom"] - 0.5, 0.35)

# 5.0: the dive into the gap
place("sfx", whoosh(0.42, 280, 4200, 0.82, 0.9, 1.0, 0.2, 0.0), T["zoom"], 0.75, rev=0.2)
place("sfx", riser(0.4, 120, 900, 0.8), T["zoom"], 0.3)
place("hits", boom(2.2, 74, 34, 1.0), T["dark"], 0.36, rev=0.2)
place("hits", kick(0.9, 0.5, 130, 46, 0.05, 0.22), T["dark"], 0.34)
place("sfx", whoosh(1.2, 900, 200, 0.05, 0.7, 0.7, 0.0, 0.0), T["dark"], 0.35, rev=0.6)
# Shadow AI: a reversed breath into the rack focus
place("sfx", reverse_swell(0.6, 0.4, 900), T["title3"] - 0.1, 0.25, rev=0.4)
for i, lab in enumerate(CUES["s3labels"]):
    place("keys", bell(mtof([78, 81, 76, 83][i]), 1.6, 0.5), lab["t"], 0.05, pan=xpan(lab["x"]), rev=0.8)
place("keys", fm_pluck(mtof(71), 1.4, 0.35, 0.5, ratio=1.5), T["sub3"], 0.08, pan=-0.3, rev=0.7)
# riser into the measure (cut dead at 6.97)
r = riser(0.66, 160, 2600, 1.0)
r[-int(0.03 * SR):] *= np.linspace(1, 0, int(0.03 * SR))
place("sfx", r, 6.31, 0.55, rev=0.15)
place("sfx", reverse_swell(0.7, 0.55, 4000), 6.27, 0.35)

# 7.0: the measure. Hit + a scan tone that follows the line across the stereo field.
place("hits", boom(1.2, 92, 44, 0.8), 7.0, 0.26)
place("hits", clap(1.0), 7.0, 0.35, rev=0.4)
place("hits", filt(noise(int(0.9 * SR)), "hp", 3000) * np.exp(-tt(0.9) / 0.22), 7.0, 0.18, rev=0.5)
for m in (62, 69, 74, 78, 81):
    place("keys", fm_pluck(mtof(m), 1.4, 1.2, 0.5), 7.0, 0.07, pan=0.1 * (m - 72) / 6, rev=0.35)
ts = tt(0.72)
lx = np.interp(7.0 + ts, [c["t"] for c in CUES["lineX"]], [c["x"] for c in CUES["lineX"]])
fsc = 300 * (3200 / 300) ** (ts / 0.72)
scan = (np.sin(2 * np.pi * np.cumsum(fsc) / SR) + 0.3 * np.sin(2 * np.pi * np.cumsum(fsc * 2.01) / SR)) * np.sin(np.pi * ts / 0.72) ** 0.7
pan = np.clip(lx / 1920 * 2 - 1, -1, 1) * 0.8
ang = (pan + 1) * np.pi / 4
place("sfx", np.stack([scan * np.cos(ang), scan * np.sin(ang)], axis=1) * np.sqrt(2), 7.0, 0.07, rev=0.3)
# every column that snaps into the grid plays a note of a rising pentatonic run
PENT_D = [62, 64, 66, 69, 71, 74, 76, 78, 81, 83, 86, 88, 90, 93, 95]
for c, col in enumerate(CUES["columns"]):
    t0 = max(col["t"], 7.0 + c * 0.004)
    place("keys", fm_pluck(mtof(PENT_D[min(14, c // 2)]), 0.4, 0.55, 0.12, ratio=3.0), t0 + 0.03, 0.045, pan=xpan(col["x"]), rev=0.35)

# 8.25: the grid pours into the radar
place("sfx", whoosh(0.8, 500, 3000, 0.45, 1.3, 0.8, -0.6, 0.5), T["flow"], 0.28, rev=0.3)
for i, t0 in enumerate(CUES["spokes"]):
    place("sfx", tick(0.9, 3400), t0, 0.08, pan=0.35)
for i, d in enumerate(CUES["dims"]):
    place("keys", fm_pluck(mtof([74, 76, 78, 81, 83, 86][i]), 0.7, 0.9, 0.25), d["t"], 0.09, pan=xpan(d["x"]), rev=0.35)
place("sfx", whoosh(0.5, 300, 1600, 0.3, 1.2, 0.6, 0.4, 0.4), T["poly"], 0.2, rev=0.3)
for k in range(3):
    place("keys", bell(mtof(88), 0.8, 0.3), 9.35 + k * 0.5, 0.025, pan=0.1, rev=0.6)
place("sfx", whoosh(0.55, 1200, 300, 0.5, 1.1, 0.6, 0.5, 0.4), T["morph6"], 0.2, rev=0.2)

# 10.5 - 12.0: each take rings a step higher; the ring counter ticks
for i, (t0, m) in enumerate(zip(T["take"], [76, 78, 81, 83])):
    place("keys", bell(mtof(m), 2.2, 0.9), t0, 0.09, pan=0.4, rev=0.5)
    if i:
        place("sfx", blip(700, 1400, 0.05, 0.6), t0 + 0.12, 0.1, pan=-0.45)
for t0 in CUES["ring"]:
    place("sfx", tick(0.8, 4200), t0, 0.045, pan=0.4)

# 12.25 - 13.0: everything inhales, then the mark lands
place("sfx", reverse_swell(0.62, 0.8, 2500), T["morph7"] - 0.1, 0.45)
place("sfx", whoosh(0.58, 300, 3800, 0.9, 1.0, 0.9, 0.35, 0.0), T["morph7"] - 0.08, 0.4, rev=0.2)
r2 = riser(0.52, 220, 1800, 0.9)
place("sfx", r2, 12.47, 0.3)

place("hits", boom(2.4, 76, 34, 1.0), T["hit"], 0.42, rev=0.25)
place("hits", kick(1.0, 0.5, 170, 48, 0.04, 0.2), T["hit"], 0.45)
place("hits", filt(noise(int(1.8 * SR)), "hp", 2500) * np.exp(-tt(1.8) / 0.45), T["hit"], 0.14, rev=0.7)
for m in (62, 69, 74, 78, 81, 86):
    place("keys", bell(mtof(m), 4.0, 1.6), T["hit"], 0.055, pan=0.12 * (m - 74) / 6, rev=0.7)
# the point flies out through the slot and lands as the full stop: the same tock as the opening, a fifth up
fl = tt(0.42)
ff = 500 + 900 * np.sin(np.pi * fl / 0.42)
place("sfx", np.sin(2 * np.pi * np.cumsum(ff) / SR) * np.sin(np.pi * fl / 0.42) ** 2 * 0.5, T["hit"] + 0.08, 0.12, pan=0.3, rev=0.4)
place("hits", tock(1575, 1.0), T["dot"], 0.46, pan=0.25, rev=0.5)
place("keys", bell(mtof(86), 3.0, 1.2), T["dot"], 0.06, pan=0.25, rev=0.7)
for w in CUES["word"]:
    if w["ch"] in "mesura":
        place("sfx", tick(0.7, 3000), w["t"] + 0.04, 0.06, pan=-0.2)
    elif w["ch"] == "idot":
        place("hits", tock(2100, 0.5), w["t"], 0.2, pan=0.45, rev=0.4)
# tagline: the last chord blooms
place("keys", bell(mtof(81), 3.0, 1.4), T["tag1"], 0.05, pan=-0.2, rev=0.8)
place("keys", bell(mtof(78), 2.5, 1.4), T["tag2"], 0.05, pan=0.2, rev=0.8)

# ------------------------------------------------------------------ mix
# Sidechain: pad and bass duck under every kick.
duck = np.ones(N)
for t0, vel in KICKS:
    i0 = int(t0 * SR)
    n = min(int(0.42 * SR), N - i0)
    e = np.exp(-np.arange(n) / (0.11 * SR)) * 0.55 * vel
    att = min(n, int(0.004 * SR))
    e[:att] *= np.linspace(0, 1, att)
    duck[i0:i0 + n] = np.minimum(duck[i0:i0 + n], 1 - e)
BUS["pad"] *= duck[:, None]
BUS["bass"] *= duck[:, None] ** 1.3
BUS["keys"] *= (0.35 + 0.65 * duck)[:, None]


def make_ir(dur=2.8, rt=2.1):
    n = int(dur * SR)
    t = np.arange(n) / SR
    ir = np.zeros((n, 2))
    for c in range(2):
        w = noise(n)
        lo, mid, hi = filt(w, "lp", 450), filt(w, "bp", (450, 4000)), filt(w, "hp", 4000)
        e = lambda r: np.exp(-6.91 * t / r)
        ir[:, c] = lo * e(rt * 1.1) * 0.9 + mid * e(rt) + hi * e(rt * 0.4) * 0.7
        for d, g in ((0.011, 0.5), (0.019, 0.35), (0.031, 0.3), (0.047, 0.2)):
            ir[int((d + 0.004 * c) * SR), c] += g * 6
    pre = int(0.018 * SR)
    ir = np.concatenate([np.zeros((pre, 2)), ir])[:n]
    ir /= np.sqrt(np.sum(ir ** 2) / 2)
    return ir


ir = make_ir()
wet = np.stack([signal.fftconvolve(SEND[:, c], ir[:, c])[:N] for c in range(2)], axis=1)
wet = filt(wet, "hp", 180)

LEVEL = {"drums": 1.0, "bass": 0.85, "pad": 1.0, "keys": 1.5, "sfx": 1.25, "hits": 1.0}
mix = sum(BUS[k] * g for k, g in LEVEL.items()) + wet * 0.42
mix = filt(mix, "hp", 30, 2)
mix *= 10 ** (2.5 / 20) * 0.89 / np.max(np.abs(mix))  # limiter works on the top ~2.5 dB only

# Look-ahead peak limiter
ceiling = 0.89
peak = np.max(np.abs(mix), axis=1)
look = int(0.004 * SR)
need = np.minimum(1.0, ceiling / np.maximum(peak, 1e-9))
need = minimum_filter1d(need, size=2 * look + 1, origin=-look)
rel = np.exp(-1 / (0.09 * SR))
g = np.empty(N)
s = 1.0
for i in range(N):
    v = need[i]
    s = v if v < s else v + (s - v) * rel
    g[i] = s
g = uniform_filter1d(g, look, mode="nearest")
mix *= g[:, None]
mix = np.tanh(mix / ceiling * 0.98) * ceiling

# Tail: fade the last 0.4 s so the picture and sound end together.
fade = np.clip((DUR - tl) / 0.4, 0, 1) ** 1.5
mix *= fade[:, None]
mix[: int(0.003 * SR)] *= np.linspace(0, 1, int(0.003 * SR))[:, None]

pk = np.max(np.abs(mix))
mix *= 0.89 / pk
rms = np.sqrt(np.mean(mix ** 2))
print(f"peak {20 * np.log10(np.max(np.abs(mix))):.2f} dBFS  rms {20 * np.log10(rms):.2f} dBFS  "
      f"limiter max gr {20 * np.log10(np.min(g)):.2f} dB")
wavfile.write(OUT, SR, (mix * 32767).astype(np.int16))
print("wrote", OUT)

#!/usr/bin/env python3
"""Mesura reel soundtrack composer.

Builds an original score plus frame-synced sound design for a reel from its cue sheet
(exported by `node tools/render.cjs --reel <id> --cues`). Everything is synthesised here:
no samples, no licensing questions.

  python3 tools/compose.py audio/flagship.cues.json audio/flagship.wav [--spectro out.png] [--stems]

The timeline is circular: tails past the end wrap to the start, so the reel loops seamlessly.
"""
import json
import math
import os
import subprocess
import sys

import numpy as np
from scipy import signal
from scipy.ndimage import minimum_filter1d
from scipy.signal import fftconvolve

SR = 48000
RNG = np.random.default_rng(29_6)


def N(sec):
    return max(0, int(round(sec * SR)))


def tt(n):
    return np.arange(n) / SR


def mtof(m):
    return 440.0 * 2.0 ** ((m - 69) / 12.0)


# ----------------------------------------------------------------------------- filters
def _sos(kind, fc, order=2):
    if isinstance(fc, (list, tuple)):
        fc = [min(max(f, 10), SR * 0.49) for f in fc]
    else:
        fc = min(max(fc, 10), SR * 0.49)
    return signal.butter(order, fc, btype=kind, fs=SR, output="sos")


def lp(x, fc, order=2):
    return signal.sosfilt(_sos("lowpass", fc, order), x)


def hp(x, fc, order=2):
    return signal.sosfilt(_sos("highpass", fc, order), x)


def bp(x, f1, f2, order=2):
    return signal.sosfilt(_sos("bandpass", [f1, f2], order), x)


def _biquad(kind, fc, q):
    fc = min(max(fc, 20.0), SR * 0.45)
    w0 = 2 * math.pi * fc / SR
    cw, sw = math.cos(w0), math.sin(w0)
    al = sw / (2 * q)
    if kind == "bp":
        b = [al, 0.0, -al]
    elif kind == "lp":
        b = [(1 - cw) / 2, 1 - cw, (1 - cw) / 2]
    else:
        b = [(1 + cw) / 2, -(1 + cw), (1 + cw) / 2]
    a = [1 + al, -2 * cw, 1 - al]
    return np.array([[b[0] / a[0], b[1] / a[0], b[2] / a[0], 1.0, a[1] / a[0], a[2] / a[0]]])


def sweep(x, f0, f1, q=0.9, kind="bp", curve=None, blk=64):
    """Time-varying biquad (exponential centre-frequency sweep)."""
    n = len(x)
    y = np.empty(n)
    zi = np.zeros((1, 2))
    for s in range(0, n, blk):
        p = s / max(1, n - 1)
        if curve:
            p = curve(p)
        sos = _biquad(kind, f0 * (f1 / f0) ** p, q)
        y[s:s + blk], zi = signal.sosfilt(sos, x[s:s + blk], zi=zi)
    return y


def fade(x, a=0.002, r=0.01):
    x = x.copy()
    na, nr = N(a), N(r)
    if na:
        x[..., :na] *= np.linspace(0, 1, na)
    if nr:
        x[..., -nr:] *= np.linspace(1, 0, nr)
    return x


def noise(n):
    return RNG.standard_normal(n)


def stereo(x, pan=0.0, width=0.0, haas=0.011):
    """Mono → stereo with equal-power pan and optional Haas widening."""
    a = (pan + 1) * math.pi / 4
    L, R = x * math.cos(a) * 1.4142, x * math.sin(a) * 1.4142
    if width > 0:
        d = N(haas)
        R2 = np.concatenate([np.zeros(d), R[:-d]]) if d else R
        R = R * (1 - width) + R2 * width
    return np.vstack([L, R])


# ----------------------------------------------------------------------------- bus (circular)
class Bus:
    def __init__(self, n):
        self.x = np.zeros((2, n))
        self.n = n

    def add(self, t, sig, gain=1.0, pan=0.0, width=0.0):
        st = stereo(sig, pan, width) if sig.ndim == 1 else sig
        st = st * gain
        i0 = int(round(t * SR)) % self.n
        m = st.shape[1]
        pos = 0
        while pos < m:
            seg = min(self.n - i0, m - pos)
            self.x[:, i0:i0 + seg] += st[:, pos:pos + seg]
            pos += seg
            i0 = 0


def wrap_add(dst, y):
    n = dst.shape[-1]
    dst += y[..., :n]
    tail = y[..., n:]
    while tail.shape[-1] > 0:
        seg = min(n, tail.shape[-1])
        dst[..., :seg] += tail[..., :seg]
        tail = tail[..., seg:]


# ----------------------------------------------------------------------------- reverb
def make_ir(rt60=2.3, dur=3.2, predelay=0.018, bright=2600):
    n = N(dur)
    t = tt(n)
    ir = np.zeros((2, n))
    for c in range(2):
        x = noise(n) * np.exp(-6.91 * t / rt60)
        dark = lp(x, bright)
        mix = np.clip(t / 0.9, 0, 1)
        x = x * (1 - mix) * 0.6 + dark * (0.4 + 0.6 * mix)
        ir[c] = x
    ir[:, : N(predelay)] = 0
    ir /= np.sqrt(np.sum(ir ** 2, axis=1, keepdims=True))
    return ir


def reverb(x, ir):
    out = np.zeros_like(x)
    for c in range(2):
        wrap_add(out[c], fftconvolve(x[c], ir[c]))
    return out


# ----------------------------------------------------------------------------- instruments
def kick(f0=165, f1=52, pd=0.042, ad=0.27, click=0.55, drive=2.2, dur=0.5):
    n = N(dur)
    t = tt(n)
    f = f1 + (f0 - f1) * np.exp(-t / pd)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / ad)
    c = hp(noise(n), 2500) * np.exp(-t / 0.002) * click
    x = np.tanh((body + c) * drive) / math.tanh(drive)
    return fade(x, 0.0005, 0.05)


def clap(dur=0.4, tone=1.0):
    n = N(dur)
    x = np.zeros(n)
    for k, off in enumerate([0, 0.010, 0.021, 0.030]):
        i = N(off)
        m = n - i
        tl = tt(m)
        x[i:] += noise(m) * np.exp(-tl / (0.007 if k < 3 else 0.11 * tone)) * (0.75 if k < 3 else 1.0)
    return fade(bp(x, 850, 2600) * 1.3, 0.0005, 0.03)


def hat(open_=False):
    dur = 0.32 if open_ else 0.07
    n = N(dur)
    t = tt(n)
    metal = sum(np.sign(np.sin(2 * np.pi * f * t)) for f in (205.3, 304.4, 369.6, 522.7, 540.0, 800.0)) / 6
    x = hp(0.55 * noise(n) + 0.45 * metal, 7200, 2)
    x *= np.exp(-t / (0.085 if open_ else 0.016))
    return fade(x, 0.0003, 0.01)


def tick(pitch=1.0, dur=0.05, body=1.0):
    n = N(dur)
    t = tt(n)
    f = 2900 * pitch
    x = np.sin(2 * np.pi * f * t) * np.exp(-t / 0.0045) + 0.5 * np.sin(2 * np.pi * f * 1.51 * t) * np.exp(-t / 0.002)
    x += hp(noise(n), 3500) * np.exp(-t / 0.0012) * 0.7
    x += body * 0.35 * np.sin(2 * np.pi * 520 * pitch * t) * np.exp(-t / 0.008)
    return fade(x, 0.0002, 0.005)


def pluck(m, dur=0.55, bright=1.0, decay=1.0):
    f = mtof(m)
    n = N(dur)
    t = tt(n)
    x = np.zeros(n)
    K = int(min(36, 9500 // f))
    for k in range(1, K + 1):
        x += (1.0 / k) * np.exp(-t * (3.2 / decay + 1.9 * k / bright)) * np.sin(2 * np.pi * k * f * t + 0.37 * k)
    return fade(x * 0.5, 0.0015, 0.02)


def bass(m, dur, drive=2.4, decay=None, sub=1.0):
    f = mtof(m)
    n = N(dur)
    t = tt(n)
    x = np.sin(2 * np.pi * f * t) * sub + 0.3 * np.sin(2 * np.pi * 2 * f * t) + 0.12 * np.sin(2 * np.pi * 3 * f * t)
    env = np.minimum(1, t / 0.005)
    if decay:
        env = env * (0.35 + 0.65 * np.exp(-t / decay))
    x = np.tanh(x * drive) / math.tanh(drive) * env
    return fade(x, 0.001, min(0.06, dur * 0.3))


def pad(notes, dur, attack=0.5, release=0.9, cutoff=2400, detune=(-9, -3, 3, 9), level=1.0, bright=1.0):
    n = N(dur + release)
    t = tt(n)
    L = np.zeros(n)
    R = np.zeros(n)
    for m in notes:
        f0 = mtof(m)
        for j, dc in enumerate(detune):
            f = f0 * 2 ** (dc / 1200)
            K = int(min(28, (cutoff * 2.2 * bright) // f))
            ph = RNG.uniform(0, 2 * np.pi)
            v = np.zeros(n)
            for k in range(1, K + 1):
                roll = 1.0 / (1.0 + (k * f / (cutoff * bright)) ** 2)
                v += (1.0 / k) * roll * np.sin(2 * np.pi * k * f * t + ph * k)
            p = (j / (len(detune) - 1)) * 2 - 1
            a = (p * 0.7 + 1) * math.pi / 4
            L += v * math.cos(a)
            R += v * math.sin(a)
    # envelope: smooth attack, sustain, exponential release
    env = np.ones(n)
    na = N(attack)
    if na:
        env[:na] = np.sin(np.linspace(0, np.pi / 2, na)) ** 2
    nd = N(dur)
    if nd < n:
        env[nd:] *= np.exp(-(t[nd:] - dur) / (release / 4))
    # gentle movement
    env *= 1 + 0.06 * np.sin(2 * np.pi * 0.27 * t)
    out = np.vstack([L, R]) * env * level / (len(notes) * len(detune)) * 3.2
    return out


def bell(m, dur=2.8, index=3.2, ratio=3.5, decay=1.0):
    f = mtof(m)
    n = N(dur)
    t = tt(n)
    I = index * np.exp(-t / (0.45 * decay))
    x = np.sin(2 * np.pi * f * t + I * np.sin(2 * np.pi * f * ratio * t)) * np.exp(-t / (0.95 * decay))
    x += 0.25 * np.sin(2 * np.pi * f * 2.0 * t) * np.exp(-t / (0.4 * decay))
    return fade(x, 0.001, 0.05)


# ----------------------------------------------------------------------------- sound design
def whoosh(dur=0.5, f0=350, f1=3200, q=0.75, peak=0.6):
    n = N(dur)
    t = tt(n) / dur
    x = sweep(noise(n), f0, f1, q, "bp")
    env = np.where(t < peak, (t / peak) ** 2, ((1 - t) / (1 - peak)) ** 1.6)
    return fade(x * env * 1.4, 0.001, 0.01)


def whoosh_st(dur=0.5, f0=350, f1=3200, q=0.75, peak=0.6, pan0=-0.7, pan1=0.7):
    x = whoosh(dur, f0, f1, q, peak)
    p = np.linspace(pan0, pan1, len(x))
    a = (p + 1) * math.pi / 4
    return np.vstack([x * np.cos(a), x * np.sin(a)]) * 1.4142


def riser(dur=1.0, f0=250, f1=7000):
    n = N(dur)
    t = tt(n)
    p = t / dur
    nz = sweep(noise(n), f0, f1, 1.3, "bp", curve=lambda q: q ** 1.4)
    f = 180 + 1500 * p ** 2.2
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.28
    tone2 = np.sin(2 * np.pi * np.cumsum(f * 1.5) / SR) * 0.14
    x = (nz * 0.9 + tone + tone2) * p ** 2.4
    return fade(x, 0.01, 0.004)


def impact(deep=False, gain=1.0):
    dur = 2.4 if deep else 1.8
    n = N(dur)
    t = tt(n)
    f = (24 + 50 * np.exp(-t / 0.16)) if deep else (32 + 70 * np.exp(-t / 0.11))
    sub = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / (0.9 if deep else 0.6))
    thump = lp(noise(n), 160) * np.exp(-t / 0.07) * 3.0
    crack = hp(noise(n), 2600) * np.exp(-t / 0.025) * 0.45
    x = np.tanh(1.6 * (sub + thump + crack)) * gain
    return fade(x, 0.0005, 0.1)


def pop(pitch=1.0):
    n = N(0.16)
    t = tt(n)
    f = (320 + 780 * (1 - np.exp(-t / 0.018))) * pitch
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.05)
    x += hp(noise(n), 3000) * np.exp(-t / 0.002) * 0.3
    return fade(x, 0.0005, 0.02)


def thunk(pitch=1.0):
    n = N(0.3)
    t = tt(n)
    f = (125 + 60 * np.exp(-t / 0.02)) * pitch
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.09)
    x += lp(noise(n), 900) * np.exp(-t / 0.015) * 0.5
    return fade(np.tanh(1.5 * x), 0.0005, 0.03)


def tape_click():
    n = N(0.05)
    t = tt(n)
    return fade(bp(noise(n), 1500, 6000) * np.exp(-t / 0.004), 0.0002, 0.005)


def glide(f0, f1, dur, wave="sine", curve=1.0):
    n = N(dur)
    t = tt(n)
    p = (t / dur) ** curve
    f = f0 * (f1 / f0) ** p
    ph = 2 * np.pi * np.cumsum(f) / SR
    if wave == "saw":
        x = sum((1 / k) * np.sin(k * ph) for k in range(1, 12))
    else:
        x = np.sin(ph)
    env = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 1.2
    return fade(x * env, 0.002, 0.01)


def scan(dur):
    n = N(dur)
    t = tt(n)
    trem = 0.55 + 0.45 * np.sin(2 * np.pi * 11 * t)
    tone = np.sin(2 * np.pi * 1760 * t + 0.6 * np.sin(2 * np.pi * 5 * t)) * trem * 0.25
    nz = sweep(noise(n), 900, 5200, 3.0, "bp") * 0.5
    env = np.minimum(1, t / 0.08) * np.minimum(1, (dur - t) / 0.15)
    x = (tone + nz) * env
    for k in range(int(dur / 0.25)):
        i = N(k * 0.25 + 0.05)
        m = N(0.05)
        if i + m < n:
            x[i:i + m] += np.sin(2 * np.pi * 2400 * tt(m)) * np.exp(-tt(m) / 0.012) * 0.35
    return fade(x, 0.005, 0.02)


def glitch(dur):
    n = N(dur)
    x = np.zeros(n)
    pos = 0
    while pos < n:
        seg = N(RNG.uniform(0.012, 0.045))
        f = RNG.choice([180, 240, 330, 520, 900, 1400])
        tl = tt(min(seg, n - pos))
        sq = np.sign(np.sin(2 * np.pi * f * tl)) * (RNG.uniform(0.3, 1.0) if RNG.random() > 0.25 else 0)
        sq = np.round(sq * 4) / 4
        x[pos:pos + len(tl)] = sq
        pos += seg + N(RNG.uniform(0, 0.02))
    return fade(bp(x, 200, 5000) * 0.5, 0.001, 0.02)


def shimmer(dur, rising=True):
    n = N(dur)
    t = tt(n)
    x = np.zeros(n)
    for k in range(9):
        f = RNG.uniform(2600, 8200)
        x += np.sin(2 * np.pi * f * t + RNG.uniform(0, 6)) * (0.5 + 0.5 * np.sin(2 * np.pi * RNG.uniform(3, 9) * t + k))
    env = (t / dur) ** 2 if rising else np.exp(-t / (dur * 0.35))
    return fade(x / 9 * env, 0.01, 0.02)


def reverse_swell(dur):
    n = N(dur)
    t = tt(n)
    x = hp(noise(n), 3500) * (t / dur) ** 3
    return fade(x, 0.01, 0.003)


def typewriter(n_keys, dur):
    out = np.zeros(N(dur + 0.1))
    for k in range(n_keys):
        tk = (k / max(1, n_keys - 1)) * dur * 0.95 + RNG.uniform(-0.012, 0.012)
        m = N(0.04)
        tl = tt(m)
        c = bp(noise(m), 1800, 5200) * np.exp(-tl / 0.004) + np.sin(2 * np.pi * 190 * tl) * np.exp(-tl / 0.012) * 0.6
        i = N(max(0, tk))
        out[i:i + m] += c[: len(out) - i] * RNG.uniform(0.75, 1.0)
    return out


def ui_tap():
    n = N(0.09)
    t = tt(n)
    x = np.sin(2 * np.pi * 1350 * t) * np.exp(-t / 0.008) * 0.6
    x += bp(noise(n), 2000, 7000) * np.exp(-t / 0.0015) * 0.8
    x += np.sin(2 * np.pi * 160 * t) * np.exp(-t / 0.02) * 0.5
    return fade(x, 0.0002, 0.01)


def card_flick():
    n = N(0.12)
    t = tt(n)
    return fade(bp(noise(n), 1800, 6500) * np.exp(-t / 0.018) * 0.8, 0.0005, 0.01)


# ----------------------------------------------------------------------------- arrangement
CHORDS = {
    "Dm": {"pad": [50, 57, 62, 65, 69], "arp": [62, 65, 69, 74], "bass": 38},
    "Bb": {"pad": [46, 53, 57, 62, 65], "arp": [58, 62, 65, 70], "bass": 34},
    "F": {"pad": [41, 48, 55, 57, 60, 65], "arp": [60, 65, 69, 72], "bass": 41},
    "C": {"pad": [48, 55, 60, 64, 67], "arp": [60, 64, 67, 72], "bass": 36},
    "Gm": {"pad": [43, 50, 55, 58, 62], "arp": [55, 58, 62, 67], "bass": 43},
    "Am": {"pad": [45, 52, 57, 60, 64], "arp": [57, 60, 64, 69], "bass": 45},
}
ARP_PAT = [0, 1, 2, 3, 2, 1, 0, 2, 0, 1, 2, 3, 2, 3, 1, 2]
ARP_OCT = [0, 0, 0, 0, 12, 0, 0, 0, 0, 0, 0, 0, 12, 0, 0, 0]

# per-profile instrument patterns (16 steps per bar)
PROFILES = {
    "groove": dict(kick=[0, 4, 8, 12], clap=[4, 12], hat=[2, 6, 10, 14], tick=list(range(16)), bass="off", arp=[0, 2, 4, 6, 8, 10, 12, 14], pad="soft"),
    "groove2": dict(kick=[0, 4, 8, 12], clap=[4, 12], hat=[2, 6, 10, 14], ohat=[14], tick=list(range(16)), bass="off", arp=[0, 2, 3, 6, 8, 10, 11, 14], pad="soft"),
    "sparse": dict(tick=[0, 2, 4, 6, 8, 10, 12, 14], bass="drone", pad="low"),
    "dark": dict(kick=[0, 10], tick=[0, 4, 8, 12], bass="drone", pad="dark", heart=True),
    "build": dict(kick=[0, 4, 8, 12], tick=list(range(16)), bass="drone", pad="dark", roll=True),
    "sunrise": dict(bass="swell", pad="bright", bells=True),
    "lift": dict(hat=[2, 6, 10, 14], tick=list(range(16)), bass="off", arp=[0, 2, 4, 6, 8, 10, 12, 14], pad="soft"),
}

ARRANGEMENTS = {
    "flagship": {
        "bars": ["Dm", "Bb", "F", "C", "Dm", "Dm", "Bb", "C", "F", "C", "Dm", "Bb", "F", "Bb", "C"],
        "sections": [(0, 15.5, "groove"), (16, 20, "sparse"), (20, 28, "dark"), (28, 32, "build"),
                     (32, 36.5, "sunrise"), (36.5, 59, "groove2"), (59, 60, "lift")],
        "stop": 16.0,
        "fills": [(15.0, 15.5), (36.0, 36.5)],
        "auto": [(0, 0), (15.9, 0), (16.0, -12), (19.85, -12), (20.0, -6), (27.9, -7), (28.0, -7), (31.95, 0), (32.0, 1.5), (36.4, 0), (60, 0)],
    },
    "guess": {
        "bars": ["Dm", "Dm", "Bb", "F", "Dm", "Dm", "F", "C"],
        "sections": [(0, 7.5, "sparse"), (8, 16, "groove"), (16, 20, "dark"), (20, 24, "sunrise"), (24, 31, "groove2"), (31, 32, "lift")],
        "stop": None,
        "fills": [(7.0, 7.5)],
        "auto": [(0, -8), (7.9, -8), (8.0, 0), (15.9, 0), (16.0, -6), (19.95, 0), (20.0, 1.5), (24, 0), (32, 0)],
    },
    "loop": {
        "bars": ["Dm", "Bb", "C", "F", "F"],
        "sections": [(0, 4, "groove"), (4, 8, "dark"), (8, 11.5, "build"), (12, 16, "sunrise"), (16, 20, "groove2")],
        "stop": None,
        "fills": [(11.0, 11.5)],
        "auto": [(0, 0), (3.95, 0), (4.0, -6), (7.95, -6), (8.0, -6), (11.95, 0), (12.0, 1.5), (16, 0), (20, 0)],
    },
}


def compose_music(arr, B, n):
    """Returns dict of stereo stems (circular timeline), plus kick times."""
    stems = {k: Bus(n) for k in ("drums", "bass", "keys", "pad", "tick")}
    kicks = []
    bars = arr["bars"]
    for (b0, b1, prof) in arr["sections"]:
        P = PROFILES[prof]
        first_bar = int(b0 // 4)
        last_bar = int(math.ceil(b1 / 4))
        for bar in range(first_bar, last_bar):
            ch = CHORDS[bars[bar % len(bars)]]
            bar_start = bar * 4
            # pads (one event per bar, clipped to section)
            ps, pe = max(bar_start, b0), min(bar_start + 4, b1)
            if pe > ps and P.get("pad"):
                kind = P["pad"]
                dur = (pe - ps) * B
                if kind == "soft":
                    stems["pad"].add(ps * B, pad(ch["pad"], dur, attack=0.25, release=0.8, cutoff=2200), 0.4)
                elif kind == "low":
                    stems["pad"].add(ps * B, pad([m - 12 for m in ch["pad"][:3]] + ch["pad"][:2], dur, attack=0.6, release=1.2, cutoff=900), 0.42)
                elif kind == "dark":
                    stems["pad"].add(ps * B, pad(ch["pad"][:4], dur, attack=0.7, release=1.2, cutoff=700, detune=(-14, -5, 5, 14)), 0.5)
                elif kind == "bright":
                    notes = ch["pad"] + [ch["pad"][-1] + 12, ch["pad"][-2] + 12]
                    stems["pad"].add(ps * B, pad(notes, dur, attack=0.06, release=2.4, cutoff=4200, bright=1.3), 0.62)
            for step in range(16):
                beat = bar_start + step / 4
                if beat < b0 - 1e-9 or beat >= b1 - 1e-9:
                    continue
                t = beat * B
                if step in P.get("kick", []):
                    stems["drums"].add(t, kick(), 0.95)
                    kicks.append(t)
                if step in P.get("clap", []):
                    stems["drums"].add(t, clap(), 0.42, width=0.3)
                if step in P.get("hat", []):
                    stems["drums"].add(t, hat(), 0.22, pan=0.25)
                if step in P.get("ohat", []):
                    stems["drums"].add(t, hat(True), 0.14, pan=-0.25)
                if step in P.get("tick", []):
                    acc = 1.0 if step % 4 == 0 else 0.55
                    stems["tick"].add(t, tick(1.0 + (0.12 if step % 4 == 0 else 0)), 0.07 * acc, pan=-0.35 + 0.7 * ((step % 2)))
                if step in (P.get("arp") or []):
                    k = ARP_PAT[step]
                    m = ch["arp"][k] + ARP_OCT[step]
                    vel = 0.9 if step % 4 == 0 else 0.62
                    stems["keys"].add(t, pluck(m, 0.5), 0.2 * vel, pan=(-0.3 if step % 2 else 0.3), width=0.25)
                if P.get("bass") == "off" and step % 4 == 2:
                    stems["bass"].add(t, bass(ch["bass"], B * 0.45, decay=0.12, drive=3.2, sub=0.8), 0.5)
                if P.get("heart") and step in (0, 3):
                    stems["drums"].add(t, kick(f0=110, f1=40, ad=0.25, click=0.1, drive=1.4), 0.55 if step == 0 else 0.35)
                if P.get("roll"):
                    # snare roll accelerating across the build: quarters → 8ths → 16ths
                    frac = (beat - b0) / max(1e-6, b1 - b0)
                    every = 4 if frac < 0.25 else 2 if frac < 0.5 else 1
                    if step % every == 0:
                        stems["drums"].add(t, clap(0.22, 0.6), 0.1 + 0.32 * frac, width=0.4)
                    if frac >= 0.5 and step % 2 == 1:
                        stems["drums"].add(t, kick(), 0.5 * frac)
                        kicks.append(t)
            # long bass
            if P.get("bass") == "drone" and pe > ps:
                stems["bass"].add(ps * B, bass(ch["bass"], (pe - ps) * B + 0.1, drive=2.2, sub=0.8), 0.32)
            if P.get("bass") == "swell" and pe > ps:
                stems["bass"].add(ps * B, bass(ch["bass"], (pe - ps) * B + 0.4, drive=1.8), 0.45)
            if P.get("bells") and bar_start >= b0 and bar_start < b1:
                for i, m in enumerate([ch["arp"][0] + 12, ch["arp"][1] + 12, ch["arp"][2] + 12, ch["arp"][3] + 12]):
                    stems["keys"].add((bar_start + 1 + i * 0.5) * B, bell(m, 2.6, 2.2), 0.09, pan=-0.4 + i * 0.27, width=0.3)
    # fills: 16th claps rising into the next section
    for (f0, f1) in arr.get("fills", []):
        k = 0
        b = f0
        while b < f1 - 1e-9:
            stems["drums"].add(b * B, clap(0.2, 0.5), 0.15 + 0.25 * k / max(1, (f1 - f0) * 4), width=0.4)
            b += 0.25
            k += 1
    return stems, kicks


def pingpong(x, delay, fb=0.38, taps=6, damp=3200):
    """Tempo-synced ping-pong delay (circular), each repeat darker and on the opposite side."""
    n = x.shape[1]
    out = x.copy()
    mono = x.mean(axis=0)
    cur = mono
    for k in range(1, taps + 1):
        cur = lp(cur, damp) * fb
        sh = np.roll(cur, N(delay * k))
        out[k % 2] += sh
    return out


def automation(n, B, pts):
    beats = np.arange(n) / SR / B
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    return 10 ** (np.interp(beats, xs, ys) / 20)


def peq(x, fc, gain_db, q=0.8, kind="peak"):
    A = 10 ** (gain_db / 40)
    w0 = 2 * math.pi * fc / SR
    al = math.sin(w0) / (2 * q)
    cw = math.cos(w0)
    if kind == "peak":
        b = [1 + al * A, -2 * cw, 1 - al * A]
        a = [1 + al / A, -2 * cw, 1 - al / A]
    elif kind == "lowshelf":
        sA = 2 * math.sqrt(A) * al
        b = [A * ((A + 1) - (A - 1) * cw + sA), 2 * A * ((A - 1) - (A + 1) * cw), A * ((A + 1) - (A - 1) * cw - sA)]
        a = [(A + 1) + (A - 1) * cw + sA, -2 * ((A - 1) + (A + 1) * cw), (A + 1) + (A - 1) * cw - sA]
    else:  # highshelf
        sA = 2 * math.sqrt(A) * al
        b = [A * ((A + 1) + (A - 1) * cw + sA), -2 * A * ((A - 1) + (A + 1) * cw), A * ((A + 1) + (A - 1) * cw - sA)]
        a = [(A + 1) - (A - 1) * cw + sA, 2 * ((A - 1) - (A + 1) * cw), (A + 1) - (A - 1) * cw - sA]
    sos = np.array([[b[0] / a[0], b[1] / a[0], b[2] / a[0], 1.0, a[1] / a[0], a[2] / a[0]]])
    return signal.sosfilt(sos, x, axis=-1)


def sidechain(n, kicks, depth=0.55, release=0.16):
    g = np.ones(n)
    m = N(release * 5)
    tl = tt(m)
    env = depth * np.exp(-tl / release) * np.minimum(1, tl / 0.003)
    for kt in kicks:
        i0 = N(kt) % n
        idx = (i0 + np.arange(m)) % n
        g[idx] = np.minimum(g[idx], 1 - env)
    return g


def tape_stop(x, T, L=0.42):
    i1 = N(T)
    i0 = max(0, i1 - N(L))
    m = i1 - i0
    seg = x[:, i0:i1].copy()
    r = (1 - np.arange(m) / m) ** 1.4
    pos = np.cumsum(r) - r[0]
    for c in range(2):
        x[c, i0:i1] = np.interp(pos, np.arange(m), seg[c]) * np.linspace(1, 0.6, m)
    x[:, i1:] = 0
    return x


# ----------------------------------------------------------------------------- cues → sfx
def counter_ticks(c):
    dur, to, step = c["dur"], c["to"], c.get("step", 1.0)
    ts = np.linspace(0, dur, 4000)
    v = to * (1 - (1 - ts / dur) ** 4)
    k = np.floor(v / step + 1e-9)
    idx = np.nonzero(np.diff(k) > 0)[0] + 1
    out, last = [], -1
    for i in idx:
        if ts[i] - last >= 0.014:
            out.append((ts[i], v[i] / to))
            last = ts[i]
    return out


def render_sfx(cues, n, B):
    sfx = Bus(n)
    send = Bus(n)  # reverb send

    def put(t, sig, gain, pan=0.0, rev=0.2, width=0.0):
        sfx.add(t, sig, gain, pan, width)
        if rev > 0:
            send.add(t, sig, gain * rev, pan, width)

    for c in cues:
        t, ty, g = c["t"], c["type"], c.get("gain", 1.0)
        d = c.get("dur", 0.5)
        if ty == "impact":
            put(t, impact(), 0.9 * g, rev=0.45, width=0.2)
        elif ty == "boom":
            put(t, impact(deep=True), 1.0 * g, rev=0.6, width=0.3)
        elif ty == "sunrise":
            put(t, impact(deep=True), 0.95 * g, rev=0.7, width=0.3)
            put(t, shimmer(3.0, rising=False), 0.35 * g, rev=0.8, width=0.6)
            put(t, bell(77, 4.0, 2.0, decay=2.2), 0.16 * g, pan=-0.2, rev=0.9)
            put(t + 0.08, bell(84, 4.0, 1.6, decay=2.0), 0.12 * g, pan=0.25, rev=0.9)
        elif ty == "whoosh":
            up = c.get("dir", "up") == "up"
            put(t - d * 0.55, whoosh_st(d, 300 if up else 3500, 3800 if up else 280, 0.7, 0.6), 0.5 * g, rev=0.25)
        elif ty == "swipe":
            put(t - 0.05, whoosh_st(d, 900, 6500, 1.1, 0.35, -0.3, 0.4), 0.28 * g, rev=0.15)
        elif ty == "tick":
            put(t, tick(c.get("pitch", 1.0)), 0.5 * g, pan=RNG.uniform(-0.3, 0.3), rev=0.12)
        elif ty == "pop":
            put(t, pop(c.get("pitch", 1.0)), 0.45 * g, rev=0.25)
        elif ty == "riser":
            put(t, riser(d), 0.55 * g, rev=0.35, width=0.5)
        elif ty == "counter":
            for (dt, frac) in counter_ticks(c):
                put(t + dt, tick(0.85 + 0.5 * frac, body=0.6), 0.34 * g * (0.7 + 0.3 * frac), pan=RNG.uniform(-0.2, 0.2), rev=0.1)
        elif ty == "land":
            put(t, thunk(), 0.8 * g, rev=0.3)
            put(t, bell(81, 1.8, 1.5, decay=0.8), 0.12 * g, rev=0.6)
            put(t, tick(1.3), 0.4 * g, rev=0.1)
        elif ty == "morph":
            put(t, glide(170, 520, d, "saw", 1.2) * 0.25, 0.5 * g, rev=0.35, width=0.4)
            put(t, whoosh_st(d, 400, 2600, 0.9, 0.5, 0.4, -0.4), 0.3 * g, rev=0.2)
        elif ty == "rise":
            put(t, glide(240, 620, d), 0.16 * g, rev=0.3)
        elif ty == "measure":
            put(t, whoosh(min(d, 0.5), 1200, 7500, 2.0, 0.85), 0.22 * g, rev=0.15, width=0.4)
            put(t + min(d, 0.5), tick(1.4), 0.3 * g, rev=0.1)
        elif ty == "suck":
            put(t, reverse_swell(d), 0.45 * g, rev=0.1, width=0.5)
        elif ty == "stop":
            put(t, thunk(0.7), 0.7 * g, rev=0.5)
            put(t - 0.35, glide(420, 60, 0.4, "saw", 0.8) * 0.2, 0.35 * g, rev=0.2)
        elif ty == "sweep":
            put(t - 0.15, whoosh_st(d + 0.3, 90, 600, 0.6, 0.55, 0.8, -0.8), 0.7 * g, rev=0.5)
        elif ty == "scan":
            put(t, scan(d), 0.16 * g, pan=-0.2, rev=0.3, width=0.5)
        elif ty == "glitch":
            put(t, glitch(d), 0.22 * g, pan=0.2, rev=0.15)
        elif ty == "down":
            put(t, whoosh_st(d, 3800, 180, 0.8, 0.3, -0.4, 0.4), 0.35 * g, rev=0.4)
        elif ty == "glint":
            put(t, shimmer(d), 0.35 * g, rev=0.7, width=0.6)
        elif ty == "chime":
            base = 65 + (7 if c.get("pitch", 1) > 1.2 else 0)
            for i, m in enumerate([base, base + 4, base + 7, base + 12]):
                put(t + i * 0.07, bell(m + 12, 2.6, 2.4), 0.16 * g, pan=-0.45 + i * 0.3, rev=0.7)
        elif ty == "card":
            put(t - 0.12, whoosh_st(0.32, 700, 4200, 0.9, 0.7, -0.2, 0.3), 0.32 * g, rev=0.15)
            put(t, card_flick(), 0.35 * g, rev=0.1)
        elif ty == "tap":
            put(t, ui_tap(), 0.5 * g, rev=0.12)
        elif ty == "scroll":
            put(t, whoosh_st(d, 500, 1800, 0.8, 0.5, 0.2, -0.2), 0.2 * g, rev=0.15)
            for k in range(6):
                put(t + k * d / 6, tick(1.6, body=0.2), 0.1 * g, rev=0.05)
        elif ty == "slide":
            put(t, glide(300, 560, d, "sine", 0.7), 0.13 * g, rev=0.3)
            put(t, whoosh_st(d, 400, 2400, 0.8, 0.4, -0.5, 0.5), 0.2 * g, rev=0.15)
        elif ty == "confirm":
            put(t, bell(81, 1.6, 1.6, decay=0.7), 0.2 * g, rev=0.55)
            put(t + 0.11, bell(86, 2.0, 1.6, decay=0.9), 0.2 * g, rev=0.6)
        elif ty == "type":
            put(t, typewriter(c.get("n", 8), d), 0.4 * g, rev=0.12)
        else:
            print("unknown cue", ty, file=sys.stderr)
    return sfx, send


# ----------------------------------------------------------------------------- master
def limiter(x, ceiling=0.891, look=0.004, rel=0.06):
    # true-peak aware: detect peaks on a 4× oversampled copy
    n = x.shape[1]
    up = signal.resample_poly(x, 4, 1, axis=1)
    peak = np.max(np.abs(up), axis=0)[: n * 4].reshape(n, 4).max(axis=1)
    need = np.minimum(1.0, ceiling / np.maximum(peak, 1e-9))
    L = max(1, N(look))
    g = minimum_filter1d(need, size=2 * L + 1, mode="wrap")
    g = signal.sosfiltfilt(_sos("lowpass", 1.0 / rel), g)
    g = np.minimum(g, minimum_filter1d(need, size=3, mode="wrap"))
    return x * g


def lufs(path):
    r = subprocess.run([FFMPEG, "-hide_banner", "-nostats", "-i", path, "-af", "ebur128=peak=true", "-f", "null", "-"],
                       capture_output=True, text=True)
    txt = r.stderr
    i = txt.rfind("I:")
    val = float(txt[i + 2:].split("LUFS")[0])
    j = txt.rfind("Peak:")
    tp = float(txt[j + 5:].split("dBFS")[0]) if j > 0 else None
    return val, tp


def write_wav(path, x):
    from scipy.io import wavfile
    y = np.clip(x.T, -1, 1)
    wavfile.write(path, SR, (y * 32767).astype(np.int16))


def spectrogram(x, B, cues, beats, path):
    from PIL import Image, ImageDraw
    mono = x.mean(axis=0)
    f, t, Z = signal.stft(mono, SR, nperseg=2048, noverlap=2048 - 480)
    mag = 20 * np.log10(np.abs(Z) + 1e-6)
    H, W = 420, min(1800, len(t))
    fl = np.geomspace(30, 16000, H)
    rows = np.searchsorted(f, fl).clip(0, len(f) - 1)
    cols = np.linspace(0, len(t) - 1, W).astype(int)
    img = mag[rows][:, cols][::-1]
    img = np.clip((img + 90) / 80, 0, 1)
    rgb = np.stack([img ** 0.8 * 255, img ** 1.4 * 210, img ** 3 * 120], -1).astype(np.uint8)
    im = Image.fromarray(rgb).convert("RGB")
    canvas = Image.new("RGB", (W, H + 60), (18, 22, 20))
    canvas.paste(im, (0, 60))
    d = ImageDraw.Draw(canvas)
    dur = x.shape[1] / SR
    for b in range(int(beats) + 1):
        xx = int(b * B / dur * W)
        d.line([(xx, 60), (xx, 64 if b % 4 else 72)], fill=(200, 200, 190) if b % 4 == 0 else (90, 90, 90))
        if b % 4 == 0:
            d.text((xx + 2, 72), str(b), fill=(160, 160, 150))
    for c in cues:
        xx = int(c["t"] / dur * W)
        d.line([(xx, 0), (xx, 56)], fill=(209, 156, 63))
        d.text((xx + 2, 2 + (hash(c["type"]) % 4) * 12), c["type"][:6], fill=(230, 220, 200))
    canvas.save(path)


FFMPEG = None


def main():
    global FFMPEG
    import imageio_ffmpeg
    FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
    src, out = sys.argv[1], sys.argv[2]
    spec_png = sys.argv[sys.argv.index("--spectro") + 1] if "--spectro" in sys.argv else None
    data = json.load(open(src))
    dur, B = data["duration"], data["beat"]
    n = N(dur)
    arr = ARRANGEMENTS[data.get("music") or data["id"]]

    def mix(s, g):
        keys = pingpong(s["keys"].x, 0.75 * B)
        return s["drums"].x * 0.9 + s["bass"].x * 0.9 * g + keys * g + s["pad"].x * (0.35 + 0.65 * g) + s["tick"].x

    if arr.get("stop") is None:
        stems, kicks = compose_music(arr, B, n)
        music = mix(stems, sidechain(n, kicks))
    else:
        # everything before the stop point gets a tape stop; later sections play on untouched
        T = arr["stop"] * B
        arr_a = dict(arr, sections=[s for s in arr["sections"] if s[1] <= arr["stop"]], fills=[f for f in arr["fills"] if f[1] <= arr["stop"]])
        arr_b = dict(arr, sections=[s for s in arr["sections"] if s[0] >= arr["stop"]], fills=[f for f in arr["fills"] if f[0] >= arr["stop"]])
        sa, ka = compose_music(arr_a, B, n)
        sb, kb = compose_music(arr_b, B, n)
        music = tape_stop(mix(sa, sidechain(n, ka)), T) + mix(sb, sidechain(n, kb))

    if arr.get("auto"):
        music = music * automation(n, B, arr["auto"])
    sfx, send = render_sfx(data["cues"], n, B)
    ir = make_ir()
    music_send = music * 0.18
    wet = reverb(send.x + music_send, ir) * 0.55
    mixbus = music * 0.62 + sfx.x * 1.45 + wet
    # phone-friendly master EQ: tame sub, lift presence and air
    mixbus = hp(mixbus, 34, 4)
    mixbus = peq(mixbus, 95, -4.5, 0.7, "lowshelf")
    mixbus = peq(mixbus, 2800, 2.0, 0.8, "peak")
    mixbus = peq(mixbus, 9000, 1.5, 0.7, "highshelf")
    # glue: gentle soft clip
    mixbus = np.tanh(mixbus * 1.1) / 1.1

    tmp = out + ".tmp.wav"
    write_wav(tmp, limiter(mixbus / (np.max(np.abs(mixbus)) + 1e-9) * 0.8))
    I, _ = lufs(tmp)
    gain = 10 ** ((-14.0 - I) / 20)
    y = mixbus / (np.max(np.abs(mixbus)) + 1e-9) * 0.8 * gain
    y = limiter(y, ceiling=10 ** (-2.0 / 20))
    write_wav(out, y)
    os.remove(tmp)
    I2, TP = lufs(out)
    print(f"{out}: {dur:.2f}s  integrated {I2:.1f} LUFS  peak {TP:.1f} dBFS")
    if spec_png:
        spectrogram(y, B, data["cues"], data["beats"], spec_png)
        print("spectrogram →", spec_png)
    if "--stems" in sys.argv:
        base = os.path.splitext(out)[0]
        write_wav(base + "_music.wav", np.clip(music * 0.62 * gain / (np.max(np.abs(mixbus)) + 1e-9) * 0.8, -1, 1))
        write_wav(base + "_sfx.wav", np.clip((sfx.x * 1.45) * gain / (np.max(np.abs(mixbus)) + 1e-9) * 0.8, -1, 1))


if __name__ == "__main__":
    main()

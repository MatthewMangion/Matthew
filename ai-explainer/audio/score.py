#!/usr/bin/env python3
"""
Original score + sound design for "Raising an AI", synthesized from scratch (numpy/scipy, no samples).

  * Music: 120 BPM, D major (I–V–vi–IV), glockenspiel hook, side-chained pads, arranged to the edit.
  * SFX:   every hit is placed from out/cues.json, which the animation exports, so sound and picture
           are frame-locked.

Writes out/soundtrack_raw.wav (48 kHz stereo float); render/encode.py loudness-normalises it.
"""
import json, os, sys, wave
import numpy as np
from scipy import signal

SR = 48000
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
META = json.load(open(os.path.join(ROOT, 'out', 'cues.json')))
DUR = META['duration']
N = int(DUR * SR)
PAD = SR * 4                       # tail room for reverbs etc. (folded back for the loop)
RNG = np.random.default_rng(1234)

# ----------------------------------------------------------------------------- utils
def ns(d): return int(round(d * SR))
def secs(n): return np.arange(n) / SR
def db(x): return 10 ** (x / 20)
def mtof(m): return 440.0 * 2 ** ((m - 69) / 12)

_SOS = {}
def _sos(kind, a, b=None, order=2):
    key = (kind, round(a, 1), None if b is None else round(b, 1), order)
    if key not in _SOS:
        ny = SR / 2
        if kind == 'band':
            _SOS[key] = signal.butter(order, [max(20, a) / ny, min(b, ny * 0.95) / ny], 'bandpass', output='sos')
        else:
            _SOS[key] = signal.butter(order, min(max(a, 20), ny * 0.95) / ny, kind, output='sos')
    return _SOS[key]
def lp(x, fc, order=2): return signal.sosfilt(_sos('low', fc, order=order), x, axis=0)
def hp(x, fc, order=2): return signal.sosfilt(_sos('high', fc, order=order), x, axis=0)
def bp(x, lo, hi, order=2): return signal.sosfilt(_sos('band', lo, hi, order), x, axis=0)

def sweep(x, fcs, kind='low', block=96):
    """time-varying 2-pole filter (block-wise coefficient updates, state carried)."""
    fcs = np.broadcast_to(np.asarray(fcs, float), (len(x),))
    y = np.empty_like(x); zi = np.zeros((1, 2))
    for i in range(0, len(x), block):
        fc = float(np.clip(fcs[i], 30, SR * 0.45))
        fc = round(fc / 10) * 10 if fc > 200 else round(fc)
        y[i:i + block], zi = signal.sosfilt(_sos(kind, fc), x[i:i + block], zi=zi)
    return y

def bsweep(x, centers, q=1.2, block=96):
    """time-varying band-pass (constant Q)."""
    centers = np.broadcast_to(np.asarray(centers, float), (len(x),))
    y = np.empty_like(x); zi = np.zeros((2, 2))
    for i in range(0, len(x), block):
        c = float(np.clip(centers[i], 60, SR * 0.4)); c = round(c / 10) * 10
        lo, hi = c / (1 + 1 / (2 * q)), c * (1 + 1 / (2 * q))
        y[i:i + block], zi = signal.sosfilt(_sos('band', lo, hi), x[i:i + block], zi=zi)
    return y

def _ph(f, n):
    f = np.full(n, float(f)) if np.ndim(f) == 0 else np.asarray(f, float)[:n]
    return np.cumsum(f) / SR, f
def sine(f, n, ph0=0.0): return np.sin(2 * np.pi * (_ph(f, n)[0] + ph0))
def saw(f, n, ph0=0.0):
    ph, f = _ph(f, n); ph = (ph + ph0) % 1.0; dt = np.maximum(f / SR, 1e-9)
    y = 2 * ph - 1
    m = ph < dt; x = ph[m] / dt[m]; y[m] -= x + x - x * x - 1
    m = ph > 1 - dt; x = (ph[m] - 1) / dt[m]; y[m] -= x * x + x + x + 1
    return y
def square(f, n, ph0=0.0): return 0.5 * (saw(f, n, ph0) - saw(f, n, ph0 + 0.5))
def tri(f, n): return (2 / np.pi) * np.arcsin(np.clip(sine(f, n), -1, 1))
def noise(n, seed=None): return (np.random.default_rng(seed) if seed is not None else RNG).standard_normal(n)

def env(n, decay, attack=0.002):
    e = np.exp(-secs(n) / decay); a = min(n, ns(attack))
    if a > 1: e[:a] *= np.linspace(0, 1, a)
    return e
def adsr(n, a, d, s, r, gate):
    t = secs(n); e = np.zeros(n)
    g = min(gate, n / SR)
    e = np.where(t < a, t / max(a, 1e-4), 0)
    dec = (t >= a) & (t < g); e[dec] = s + (1 - s) * np.exp(-(t[dec] - a) / max(d, 1e-4))
    lvl = s + (1 - s) * np.exp(-(g - a) / max(d, 1e-4)) if g > a else g / max(a, 1e-4)
    rel = t >= g; e[rel] = lvl * np.exp(-(t[rel] - g) / max(r, 1e-4))
    return e
def fade(x, fin=0.003, fout=0.01):
    x = x.copy(); a, b = min(len(x), ns(fin)), min(len(x), ns(fout))
    if a > 1: x[:a] *= np.linspace(0, 1, a)[:, None] if x.ndim == 2 else np.linspace(0, 1, a)
    if b > 1: x[-b:] *= np.linspace(1, 0, b)[:, None] if x.ndim == 2 else np.linspace(1, 0, b)
    return x

class Bus:
    def __init__(self, name): self.name = name; self.x = np.zeros((N + PAD, 2))
    def put(self, sig, t, gain=1.0, pan=0.0):
        i = int(round(t * SR))
        if sig.ndim == 1:
            l, r = np.cos((pan + 1) * np.pi / 4) * 1.4142, np.sin((pan + 1) * np.pi / 4) * 1.4142
            sig = np.stack([sig * l, sig * r], 1)
        if i < 0: sig = sig[-i:]; i = 0
        if i >= len(self.x): return
        sig = sig[: len(self.x) - i]
        self.x[i:i + len(sig)] += sig * gain

# ----------------------------------------------------------------------------- reverb
def make_ir(dur, seed, bright=6500, dark=1800, pre=0.014):
    n = ns(dur); t = secs(n); r = np.random.default_rng(seed); out = []
    e = np.exp(-6.9 * t / dur)
    for ch in range(2):
        x = r.standard_normal(n) * e
        a, b = lp(x, bright), lp(x, dark)
        w = np.clip(t / dur * 1.6, 0, 1)
        x = a * (1 - w) + b * w
        x = np.concatenate([np.zeros(ns(pre + 0.003 * ch)), x])
        out.append(x / np.sqrt(np.sum(x ** 2)))
    return out
IR_HALL = make_ir(2.6, 7)
IR_ROOM = make_ir(0.9, 9, bright=8000, dark=3000, pre=0.006)
def reverb(x, ir):
    y = np.zeros_like(x)
    for ch in range(2): y[:, ch] = signal.fftconvolve(x[:, ch], ir[ch])[: len(x)]
    return y

def delay(x, time, fb=0.35, mix=0.3, pingpong=True, lp_fc=4500):
    d = ns(time); y = np.zeros_like(x); src = x.copy()
    for k in range(1, 6):
        g = mix * fb ** (k - 1)
        if g < 0.01: break
        sh = np.zeros_like(x); sh[d * k:] = src[: len(x) - d * k]
        if pingpong and k % 2 == 1: sh = sh[:, ::-1]
        y += lp(sh, lp_fc) * g
    return y

# ----------------------------------------------------------------------------- instruments
def kick(v=1.0, tight=False):
    n = ns(0.5); t = secs(n)
    f = 52 + 150 * np.exp(-t / 0.026) + 70 * np.exp(-t / 0.004)
    body = sine(f, n) * np.exp(-t / (0.16 if tight else 0.22))
    knock = bp(noise(n, 6), 180, 900) * np.exp(-t / 0.012) * 0.35
    click = hp(noise(n, 5), 2500) * np.exp(-t / 0.0025) * 0.35
    return np.tanh(1.8 * (body + knock + click)) * 0.85 * v

def clap(v=1.0):
    n = ns(0.35); t = secs(n); x = np.zeros(n); nz = noise(n, 11)
    for k, off in enumerate([0, 0.011, 0.023]):
        i = ns(off); seg = n - i
        x[i:] += nz[:seg] * np.exp(-secs(seg) / 0.006) * (0.8 + 0.1 * k)
    x += noise(n, 12) * np.exp(-t / 0.11) * 0.55
    return bp(x, 900, 5200) * 0.55 * v

def snare(v=1.0):
    n = ns(0.4); t = secs(n)
    tone = sine(190 * (1 + 0.3 * np.exp(-t / 0.01)), n) * np.exp(-t / 0.07)
    nz = bp(noise(n, 21), 1500, 9000) * np.exp(-t / 0.13)
    return np.tanh(1.3 * (0.6 * tone + 0.8 * nz)) * 0.55 * v

def hat(v=1.0, open_=False, seed=0):
    n = ns(0.45 if open_ else 0.08); t = secs(n)
    metal = sum(square(f, n) for f in [3140, 4273, 5217, 6400, 7870, 9050]) / 6
    x = hp(0.6 * noise(n, 30 + seed) + 0.5 * metal, 7200, order=4)
    return x * np.exp(-t / (0.16 if open_ else 0.028)) * 0.3 * v

def shaker(v=1.0):
    n = ns(0.1); t = secs(n)
    e = np.minimum(1, t / 0.012) * np.exp(-np.maximum(0, t - 0.012) / 0.03)
    return bp(noise(n, 44), 5000, 12000) * e * 0.28 * v

def crash(v=1.0):
    n = ns(2.4); t = secs(n)
    metal = sum(square(f, n) * np.exp(-t / d) for f, d in [(3520, 0.6), (4870, 0.5), (6130, 0.4), (7920, 0.35)]) / 4
    nz = hp(noise(n, 50), 4000) * np.exp(-t / 0.9)
    x = hp(0.8 * nz + 0.3 * metal, 3200)
    return np.stack([x, np.roll(x, 37)], 1) * 0.22 * v

def glock(m, v=1.0, dur=1.6, bright=1.0):
    n = ns(dur); t = secs(n); f = mtof(m); x = np.zeros(n)
    for ratio, amp, dec in [(1, 1, 0.9), (2.756, 0.45 * bright, 0.35), (5.404, 0.22 * bright, 0.16), (8.933, 0.1 * bright, 0.08)]:
        if f * ratio < SR * 0.45: x += amp * sine(f * ratio, n) * np.exp(-t / dec)
    x += hp(noise(n, 60), 4000) * np.exp(-t / 0.004) * 0.25
    return fade(x, 0.001, 0.05) * 0.32 * v

def musicbox(m, v=1.0):
    n = ns(1.3); t = secs(n); f = mtof(m); x = np.zeros(n)
    for ratio, amp, dec in [(1, 1, 0.7), (3.01, 0.35, 0.25), (5.33, 0.15, 0.12), (7.9, 0.06, 0.06)]:
        if f * ratio < SR * 0.45: x += amp * sine(f * ratio, n) * np.exp(-t / dec)
    return fade(x, 0.001, 0.05) * 0.3 * v

def pluck(ms, v=1.0, dur=0.3, fc0=5200, fc1=500, decay=0.16, detune=0.08):
    n = ns(dur); t = secs(n); x = np.zeros(n)
    for m in ms:
        f = mtof(m)
        x += saw(f * (1 + detune / 100), n) + saw(f * (1 - detune / 100), n, 0.3)
    fcs = fc1 + (fc0 - fc1) * np.exp(-t / 0.05)
    x = sweep(x / (2 * len(ms)), fcs) * env(n, decay, 0.002)
    return fade(x, 0.001, 0.02) * v

def pad(ms, dur, v=1.0, fc=2000, attack=0.25, release=0.5, seed=0):
    n = ns(dur + release); out = np.zeros((n, 2)); r = np.random.default_rng(seed)
    for m in ms:
        f = mtof(m)
        for k, c in enumerate([-11, -4, 0, 5, 12]):
            ph = r.random()
            s = saw(f * 2 ** (c / 1200), n, ph)
            pan = [-0.8, -0.35, 0, 0.35, 0.8][k]
            out[:, 0] += s * np.cos((pan + 1) * np.pi / 4); out[:, 1] += s * np.sin((pan + 1) * np.pi / 4)
    out = lp(out, fc)
    e = adsr(n, attack, 0.6, 0.8, release, dur)
    return out * e[:, None] * (0.05 / len(ms) ** 0.5) * v

def bass(m, dur, v=1.0, fc=420):
    n = ns(dur + 0.08); t = secs(n); f = mtof(m)
    x = 0.62 * sine(f, n) + 0.55 * lp(saw(f * 2, n), max(fc, 700)) + 0.18 * lp(square(f, n), 1200)
    e = adsr(n, 0.004, 0.25, 0.75, 0.05, dur)
    return np.tanh(1.6 * x * e) * 0.46 * v

def bass808(m, dur, v=1.0, glide_from=None):
    n = ns(dur + 0.3); t = secs(n); f1 = mtof(m)
    f = f1 if glide_from is None else f1 + (mtof(glide_from) - f1) * np.exp(-t / 0.06)
    x = sine(f, n) * adsr(n, 0.003, 0.5, 0.6, 0.25, dur)
    return np.tanh(3.2 * x) * 0.42 * v

# ----------------------------------------------------------------------------- SFX library
PENT = [74, 76, 78, 81, 83, 86, 88, 90, 93, 95]
def S_pop(n=0, v=1.0, **_):
    k = ns(0.14); t = secs(k); f0 = mtof(79 + [0, 2, 4, 7, 9, 12, 14, 16][int(n) % 8])
    f = f0 * (1 + 0.45 * np.exp(-t / 0.012))
    x = sine(f, k) * env(k, 0.05, 0.001) + 0.25 * sine(f * 2.01, k) * env(k, 0.02, 0.001)
    return x * 0.42 * v
def S_tick(v=1.0, **_):
    k = ns(0.06); t = secs(k)
    x = bp(noise(k, 3), 2500, 7000) * np.exp(-t / 0.004) * 1.4 + sine(3150, k) * np.exp(-t / 0.008) * 0.45
    return x * 0.45 * v
def S_type(dur=0.5, v=1.0, **_):
    x = np.zeros(ns(dur + 0.1)); t = 0.0; r = np.random.default_rng(8)
    while t < dur:
        k = ns(0.03); tt = secs(k)
        c = bp(noise(k, int(t * 997)), 1500, 6000) * np.exp(-tt / 0.003) + 0.4 * sine(210 + r.random() * 60, k) * np.exp(-tt / 0.01)
        i = ns(t); x[i:i + k] += c[: len(x) - i]; t += 0.028 + r.random() * 0.03
    return x * 0.28 * v
def S_swipe(v=1.0, **_):
    k = ns(0.22); u = np.linspace(0, 1, k)
    x = bsweep(noise(k, 4), 700 * (8 ** u), q=1.5) * np.sin(np.pi * u) ** 1.5
    return x * 0.5 * v
def _whoosh(dur, lo, hi, dirn, seed, bright=1.0):
    k = ns(dur); u = np.linspace(0, 1, k)
    if dirn == 'up': c = lo * (hi / lo) ** u
    elif dirn == 'down': c = hi * (lo / hi) ** u
    else: c = lo + (hi - lo) * np.sin(np.pi * u) ** 1.2
    x = bsweep(noise(k, seed), c, q=0.9 * bright) * np.sin(np.pi * u) ** 1.6
    pan = np.linspace(-0.7, 0.7, k)
    return np.stack([x * np.cos((pan + 1) * np.pi / 4), x * np.sin((pan + 1) * np.pi / 4)], 1) * 1.4
def S_whoosh(dur=0.3, dir='side', v=1.0, **_): return _whoosh(max(dur, 0.12), 350, 3200, dir, 70) * 0.55 * v
def S_swoosh(dur=0.4, v=1.0, **_):
    x = _whoosh(max(dur, 0.2), 500, 6500, 'side', 71, bright=1.3)
    k = len(x); u = np.linspace(0, 1, k)
    tone = lp(saw(180 * (4 ** u), k), 1400) * np.sin(np.pi * u) ** 2 * 0.12
    return (x + tone[:, None]) * 0.6 * v
def S_riser(dur=1.0, v=1.0, **_):
    k = ns(dur); u = np.linspace(0, 1, k)
    nz = sweep(noise(k, 80), 400 * (20 ** u), 'high') * u ** 2.2
    tone = lp(saw(170 * (5 ** (u ** 1.4)), k) + saw(171.5 * (5 ** (u ** 1.4)), k, 0.5), 3500) * u ** 2.5 * 0.35
    x = nz + tone
    return np.stack([x, np.roll(x, 90)], 1) * 0.42 * v
def S_impact(size=1.0, v=1.0, **_):
    k = ns(1.6); t = secs(k)
    sub = sine(36 + 60 * np.exp(-t / 0.07), k) * np.exp(-t / (0.55 * size))
    body = lp(noise(k, 90), 5000) * np.exp(-t / 0.18) * 0.6
    tail = hp(noise(k, 91), 4500) * np.exp(-t / 0.7) * 0.18
    click = noise(k, 92) * np.exp(-t / 0.002) * 0.5
    x = np.tanh(1.8 * (1.1 * sub + body + click)) + tail
    return np.stack([x, x * 0.96 + np.roll(tail, 40) * 0.2], 1) * 0.62 * v * min(1.25, size)
def S_hit(v=1.0, **_):
    k = ns(0.35); t = secs(k)
    x = sine(52 + 90 * np.exp(-t / 0.03), k) * np.exp(-t / 0.13) + bp(noise(k, 93), 1200, 6000) * np.exp(-t / 0.05) * 0.5
    return np.tanh(1.5 * x) * 0.5 * v
def S_confetti(v=1.0, **_):
    k = ns(1.1); x = np.zeros((k, 2)); r = np.random.default_rng(94)
    pop = bp(noise(ns(0.05), 95), 700, 3500) * env(ns(0.05), 0.012, 0.001)
    x[: len(pop)] += np.stack([pop, pop], 1) * 0.9
    for _ in range(26):
        i = ns(0.03 + r.random() * 0.8); f = 2800 + r.random() * 5500; g = ns(0.05)
        s = sine(f, g) * env(g, 0.015, 0.001) * (0.15 + 0.15 * r.random()); p = r.random() * 2 - 1
        x[i:i + g, 0] += s * np.cos((p + 1) * np.pi / 4); x[i:i + g, 1] += s * np.sin((p + 1) * np.pi / 4)
    return x * 0.6 * v
def S_chime(v=1.0, **_):
    x = np.zeros(ns(2.0))
    for k, m in enumerate([86, 90, 93, 98]):
        g = glock(m, 0.8, 1.6); i = ns(k * 0.045); x[i:i + len(g)] += g[: len(x) - i]
    return x * 0.8 * v
def S_boing(v=1.0, **_):
    k = ns(0.42); t = secs(k)
    f = 190 + 260 * (1 - np.exp(-t / 0.05)) + 90 * np.sin(2 * np.pi * 11 * t) * np.exp(-t / 0.12)
    x = (sine(f, k) + 0.3 * tri(f * 2, k)) * env(k, 0.14, 0.003)
    return x * 0.38 * v
def S_suck(dur=0.6, v=1.0, **_):
    k = ns(dur); u = np.linspace(0, 1, k)
    x = bsweep(noise(k, 96), 3500 * (0.12 ** u), q=0.8) * u ** 2.5
    th = S_hit(0.8); y = np.zeros(k + len(th)); y[:k] += x * 0.8; y[k:] += th
    return y * 0.6 * v
def S_bars(dur=0.8, v=1.0, **_):
    k = ns(dur + 0.3); t = secs(k); u = np.clip(t / dur, 0, 1)
    x = sine(420 * 2.4 ** u, k) * (0.5 + 0.5 * np.sin(2 * np.pi * 14 * t)) * np.sin(np.pi * np.clip(t / (dur + 0.3), 0, 1))
    return x * 0.16 * v
def S_select(v=1.0, **_):
    a = lp(square(880, ns(0.07)), 3000) * env(ns(0.07), 0.03, 0.001)
    b = lp(square(1320, ns(0.1)), 3500) * env(ns(0.1), 0.04, 0.001)
    return np.concatenate([a, b]) * 0.22 * v
def S_blip(n=0, v=1.0, **_):
    m = PENT[int(n) % len(PENT)] - 12; k = ns(0.1)
    x = lp(square(mtof(m), k), 2600) * env(k, 0.04, 0.001) + 0.4 * sine(mtof(m + 12), k) * env(k, 0.03, 0.001)
    return x * 0.24 * v
def S_ding(v=1.0, **_):
    k = ns(2.2); t = secs(k); f = mtof(88); x = np.zeros(k)
    for ratio, amp, dec in [(1, 1, 1.2), (2.0, 0.35, 0.7), (2.76, 0.3, 0.45), (4.07, 0.14, 0.3), (5.4, 0.1, 0.18)]:
        x += amp * sine(f * ratio, k) * np.exp(-t / dec)
    return x * 0.24 * v
def S_sparkle(v=1.0, **_):
    k = ns(0.9); x = np.zeros((k, 2)); r = np.random.default_rng(97)
    for j in range(16):
        i = ns(j * 0.035 + r.random() * 0.03); f = mtof(PENT[r.integers(0, len(PENT))] + 12); g = ns(0.25)
        s = sine(f, g) * env(g, 0.07, 0.001) * 0.2; p = r.random() * 2 - 1
        seg = min(g, k - i); x[i:i + seg, 0] += s[:seg] * np.cos((p + 1) * np.pi / 4); x[i:i + seg, 1] += s[:seg] * np.sin((p + 1) * np.pi / 4)
    return x * 0.8 * v
def S_vortex(dur=4.0, v=1.0, **_):
    k = ns(dur); t = secs(k); u = t / dur
    rate = 0.6 + 2.2 * u
    c = 900 + 700 * np.sin(2 * np.pi * np.cumsum(rate) / SR)
    x = bsweep(noise(k, 98), c * (1 + u), q=1.6)
    flutter = hp(noise(k, 99), 2500) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * (18 + 10 * u) * t))) * 0.15
    e = np.sin(np.pi * np.clip(u * 1.05, 0, 1)) ** 0.8
    pan = np.sin(2 * np.pi * np.cumsum(0.4 + u) / SR) * 0.8
    y = (x + flutter) * e
    return np.stack([y * np.cos((pan + 1) * np.pi / 4), y * np.sin((pan + 1) * np.pi / 4)], 1) * 0.5 * v
def S_flip(n=0, v=1.0, **_):
    k = ns(0.06); t = secs(k)
    x = bp(noise(k, 100 + int(n)), 1500, 7500) * np.exp(-t / 0.012) + sine(1800 + 150 * int(n), k) * np.exp(-t / 0.006) * 0.2
    return x * 0.36 * v
def S_odometer(dur=1.3, v=1.0, **_):
    x = np.zeros(ns(dur + 0.2)); t = 0.0; r = np.random.default_rng(101)
    while t < dur:
        rate = 34 * (1 - t / dur) ** 1.5 + 6
        c = S_ratchet(0.5 + 0.3 * r.random()); i = ns(t); x[i:i + len(c)] += c[: len(x) - i]
        t += 1 / rate
    return x * 0.8 * v
def S_lock(v=1.0, **_):
    k = ns(0.3); t = secs(k)
    x = sine(95 * (1 + 0.5 * np.exp(-t / 0.01)), k) * np.exp(-t / 0.07) + bp(noise(k, 102), 2000, 6000) * np.exp(-t / 0.01) * 0.6
    return x * 0.5 * v
def S_dizzy(dur=0.9, v=1.0, **_):
    k = ns(dur); t = secs(k); u = t / dur
    f = (950 - 450 * u) * (1 + 0.12 * np.sin(2 * np.pi * 7 * t))
    return sine(f, k) * np.sin(np.pi * u) ** 0.6 * 0.18 * v
def S_kid(v=1.0, **_):
    k = ns(0.28); t = secs(k); u = t / 0.28
    f = 620 + 520 * np.sin(np.pi * u) ** 0.7 + 25 * np.sin(2 * np.pi * 30 * t)
    x = (sine(f, k) + 0.5 * sine(f * 2, k) + 0.2 * sine(f * 3, k)) * np.sin(np.pi * u) ** 0.5
    return bp(x, 400, 4000) * 0.22 * v
def S_page(dur=0.5, v=1.0, **_):
    k = ns(dur + 0.1); u = np.clip(secs(k) / dur, 0, 1)
    x = bsweep(noise(k, 103), 900 + 4000 * u, q=0.7) * np.sin(np.pi * u) ** 1.3
    crinkle = hp(noise(k, 104), 3000) * (noise(k, 105) > 2.2) * 0.4
    return (x + crinkle) * 0.5 * v
def S_thud(n=0, v=1.0, **_):
    k = ns(0.5); t = secs(k); f0 = 70 + 6 * (int(n) % 8)
    x = sine(f0 * (1 + 0.8 * np.exp(-t / 0.02)), k) * np.exp(-t / 0.2) + bp(noise(k, 106 + int(n)), 250, 1400) * np.exp(-t / 0.03) * 0.7
    return np.tanh(1.4 * x) * 0.55 * v
def S_buzzer(v=1.0, **_):
    k = ns(0.55); t = secs(k)
    x = lp(square(146, k) + square(153, k), 1600) * adsr(k, 0.005, 0.2, 0.9, 0.05, 0.48)
    return x * 0.2 * v
def S_stamp(v=1.0, **_):
    k = ns(0.35); t = secs(k)
    x = sine(105 * (1 + np.exp(-t / 0.015)), k) * np.exp(-t / 0.09) + bp(noise(k, 107), 400, 3200) * np.exp(-t / 0.035) * 0.8
    return np.tanh(1.5 * x) * 0.55 * v
def S_fall(dur=0.6, v=1.0, **_):
    k = ns(dur); t = secs(k); u = t / dur
    f = 1400 * (0.25 ** u) * (1 + 0.02 * np.sin(2 * np.pi * 9 * t))
    return (sine(f, k) + 0.2 * sine(2 * f, k)) * np.sin(np.pi * np.clip(u * 1.1, 0, 1)) ** 0.4 * 0.16 * v
def S_ratchet(v=1.0, **_):
    k = ns(0.04); t = secs(k)
    x = bp(noise(k, 108), 2200, 7000) * np.exp(-t / 0.003) + sine(2600, k) * np.exp(-t / 0.012) * 0.35
    return x * 0.34 * v
def S_multiply(dur=0.5, v=1.0, **_):
    x = np.zeros(ns(dur + 0.2))
    for j in range(8):
        p = S_pop(j, 0.6); i = ns(j * dur / 8); x[i:i + len(p)] += p[: len(x) - i]
    return x * v
def S_zoomout(dur=2.3, v=1.0, **_):
    k = ns(dur); u = np.linspace(0, 1, k)
    w = _whoosh(dur, 180, 5000, 'down', 109)
    rumble = lp(noise(k, 110), 160) * np.sin(np.pi * u) * 1.2
    shimmer = hp(noise(k, 111), 7000) * u ** 2 * 0.25
    return (w + np.stack([rumble + shimmer, rumble + np.roll(shimmer, 70)], 1)) * 0.5 * v
def S_reveal(dur=1.0, v=1.0, **_):
    x = np.zeros(ns(dur + 1.6))
    for j, m in enumerate([74, 78, 81, 86, 90, 93, 98]):
        g = glock(m, 0.8, 1.5); i = ns(j * dur / 9); x[i:i + len(g)] += g[: len(x) - i]
    return x * 0.9 * v
def S_shimmer(dur=1.2, v=1.0, **_):
    k = ns(dur); u = np.linspace(0, 1, k); t = secs(k)
    x = hp(noise(k, 112), 6500) * (0.6 + 0.4 * np.sin(2 * np.pi * 7 * t)) * np.sin(np.pi * u)
    return np.stack([x, np.roll(x, 120)], 1) * 0.16 * v
def S_twinkle(n=0, v=1.0, **_):
    return glock(PENT[int(n) % len(PENT)] + 12, 0.7, 1.2, bright=0.6) * 0.8 * v
def S_swell(dur=1.3, v=1.0, **_):
    k = ns(dur + 0.2); u = np.clip(secs(k) / dur, 0, 1)
    x = sum(saw(mtof(m), k, j * 0.2) for j, m in enumerate([50, 57, 62, 66, 69]))
    x = sweep(x / 5, 250 + 3500 * u ** 2) * u ** 2 * (1 - np.clip((secs(k) - dur) / 0.2, 0, 1))
    return np.stack([x, np.roll(x, 60)], 1) * 0.35 * v
def S_warp(dur=0.7, v=1.0, **_):
    k = ns(dur); u = np.linspace(0, 1, k)
    tone = sine(160 * (14 ** (u ** 1.6)), k) * u ** 1.5 * 0.35
    nz = sweep(noise(k, 113), 500 * (16 ** u), 'high') * u ** 2 * 0.8
    x = tone + nz
    return np.stack([x, np.roll(x, 50)], 1) * 0.5 * v
def S_arcs(dur=1.0, v=1.0, **_):
    x = np.zeros((ns(dur + 0.3), 2))
    for j in range(8):
        k = ns(0.12); u = np.linspace(0, 1, k)
        z = sine(700 * 2.6 ** u, k) * np.sin(np.pi * u) * 0.22; i = ns(j * dur / 8); p = -0.8 + 1.6 * j / 7
        x[i:i + k, 0] += z * np.cos((p + 1) * np.pi / 4); x[i:i + k, 1] += z * np.sin((p + 1) * np.pi / 4)
    return x * v
def S_scramble(dur=0.35, v=1.0, **_):
    x = np.zeros(ns(dur + 0.05)); r = np.random.default_rng(114); t = 0.0
    while t < dur:
        k = ns(0.03); z = lp(square(300 + r.random() * 1800, k), 4000) * 0.15; i = ns(t); x[i:i + k] += z[: len(x) - i]; t += 0.035
    return x * v
def S_counter(dur=0.6, v=1.0, **_):
    x = np.zeros(ns(dur + 0.1)); t = 0.0
    while t < dur:
        c = S_tick(0.5); i = ns(t); x[i:i + len(c)] += c[: len(x) - i]; t += 1 / (10 + 40 * (t / dur))
    return x * v
def S_nope(v=1.0, **_):
    out = []
    for m in [52, 47]:
        k = ns(0.2); t = secs(k)
        z = sweep(square(mtof(m), k), 400 + 1600 * np.sin(np.pi * np.clip(t / 0.2, 0, 1))) * adsr(k, 0.01, 0.1, 0.8, 0.04, 0.17)
        out.append(z)
    return np.concatenate(out) * 0.3 * v
def S_squeak(n=0, v=1.0, **_):
    k = ns(0.13); t = secs(k); u = t / 0.13; f0 = 1100 + 170 * (int(n) % 5)
    f = f0 * (1 + 0.25 * np.sin(np.pi * u)) + 60 * np.sin(2 * np.pi * 45 * t)
    return sine(f, k) * np.sin(np.pi * u) ** 0.5 * 0.13 * v
def S_wah(v=1.0, **_):
    out = []
    for m, d in [(58, 0.32), (57, 0.32), (56, 0.55)]:
        k = ns(d); t = secs(k)
        f = mtof(m) * (1 + 0.012 * np.sin(2 * np.pi * 6 * t))
        z = sweep(saw(f, k), 400 + 1400 * np.sin(np.pi * np.clip(t / d, 0, 1)) ** 2) * adsr(k, 0.02, 0.2, 0.8, 0.05, d - 0.05)
        out.append(z)
    return np.concatenate(out) * 0.3 * v
def S_plop(n=0, v=1.0, **_):
    k = ns(0.12); t = secs(k)
    f = (380 + 30 * (int(n) % 5)) * (1 + 1.8 * (1 - np.exp(-t / 0.025)))
    return sine(f, k) * env(k, 0.035, 0.002) * 0.3 * v
def S_star(n=0, v=1.0, **_):
    m = PENT[int(n) % len(PENT)] + (12 if int(n) >= 10 else 0) - 12
    g = glock(m, 1.0, 0.9, 0.8); p = S_pop(int(n), 0.35)
    x = np.zeros(max(len(g), len(p))); x[: len(g)] += g; x[: len(p)] += p
    return x * 0.8 * v
def S_hum(dur=3.0, v=1.0, **_):
    k = ns(dur); t = secs(k); u = t / dur
    x = (sine(mtof(62), k) + 0.7 * sine(mtof(69), k) + 0.4 * sine(mtof(74), k)) * (0.75 + 0.25 * np.sin(2 * np.pi * 5 * t))
    return x * np.sin(np.pi * u) ** 0.7 * 0.05 * v
def S_bubble(v=1.0, **_):
    k = ns(0.1); t = secs(k)
    return sine(300 * (1 + 2 * (1 - np.exp(-t / 0.02))), k) * env(k, 0.03, 0.002) * 0.3 * v
def S_chomp(v=1.0, **_):
    x = np.zeros(ns(0.3))
    for j in range(3):
        k = ns(0.05); z = bp(noise(k, 115 + j), 900, 4500) * env(k, 0.012, 0.001) * 0.7; i = ns(j * 0.07); x[i:i + k] += z
    return x * v
def S_poof(v=1.0, **_):
    k = ns(0.5); t = secs(k)
    return sweep(noise(k, 116), 2500 * np.exp(-t / 0.2) + 200) * env(k, 0.14, 0.01) * 0.6 * v
def S_scratch(v=1.0, **_):
    k = ns(0.42); t = secs(k)
    f = 260 * (1 + 1.4 * np.sin(2 * np.pi * 6.5 * t) ** 2)
    x = bp(saw(f, k) * 0.6 + noise(k, 117) * 0.5, 300, 4000) * np.sin(np.pi * np.clip(t / 0.42, 0, 1)) ** 0.4
    return x * 0.5 * v
def S_glitch(dur=0.3, v=1.0, **_):
    k = ns(dur); x = noise(k, 118)
    hold = 12; x = np.repeat(x[::hold], hold)[:k]
    gate = (np.floor(secs(k) / 0.022) % 2 == 0).astype(float)
    return lp(np.round(x * 3) / 3, 6000) * gate * 0.18 * v
def S_shades(v=1.0, **_):
    b = bass808(38, 1.1, 1.2, glide_from=50)
    k = ns(0.05); chk = bp(noise(k, 119), 2000, 8000) * env(k, 0.01, 0.001)
    x = np.zeros(len(b)); x += b; x[: len(chk)] += chk * 0.8
    return x * 0.9 * v
def S_pfft(v=1.0, **_):
    k = ns(0.45); t = secs(k)
    return sweep(noise(k, 120), 3500 * np.exp(-t / 0.12) + 150) * np.exp(-t / 0.2) * 0.55 * v
def S_scribble(dur=0.5, v=1.0, **_):
    k = ns(dur); t = secs(k); r = np.random.default_rng(121)
    strokes = np.zeros(k); j = 0.0
    while j < dur:
        i = ns(j); L = ns(0.05 + r.random() * 0.05); seg = min(L, k - i)
        strokes[i:i + seg] += np.sin(np.pi * np.linspace(0, 1, seg)) * (0.6 + 0.4 * r.random()); j += 0.06 + r.random() * 0.05
    x = bp(noise(k, 122), 1800, 7000) * strokes
    return x * 0.22 * v

SFX = {k[2:]: v for k, v in globals().items() if k.startswith('S_')}
LEVEL = {  # per-type trims (dB)
    'pop': -2, 'tick': -3, 'type': -2, 'whoosh': -1, 'swoosh': -1, 'impact': 0, 'hit': -1, 'chime': -2,
    'boing': -2, 'ding': -1, 'star': -3, 'plop': -3, 'thud': -1, 'ratchet': -4, 'twinkle': -6, 'flip': -3,
    'scribble': -3, 'vortex': -2, 'odometer': -3, 'confetti': -1, 'zoomout': -1,
}

# ----------------------------------------------------------------------------- arrangement
T0, BAR, BEAT = 3.0, 2.0, 0.5
def bt(bar, beat=0.0): return T0 + bar * BAR + beat * BEAT
CH = {'D': ([62, 66, 69, 76], 38), 'A': ([61, 64, 69, 73], 33), 'Bm': ([62, 66, 71, 74], 35), 'G': ([62, 67, 71, 74], 31)}
PROG = ['D', 'A', 'Bm', 'G']
PROG_BRK = ['Bm', 'G', 'D', 'A']
# (start_bar, end_bar, section)
SECTIONS = [(0, 2, 'A1'), (2, 6, 'A'), (6, 11, 'B'), (11, 15, 'A2'), (15, 18, 'BRK'), (18, 22, 'HALF'), (22, 24, 'POUND'),
            (24, 28, 'CHORUS'), (28, 31, 'THINK'), (31, 32, 'STOP'), (32, 35, 'SWAG'), (35, 38, 'CHORUS2'), (38, 39, 'OUTRO')]
CFG = {
    'A1':      dict(kick='four', clap=1, hat='8', bass='drive', pad=0.8, stab=0.0, glock=1.0, arp=0),
    'A':       dict(kick='four', clap=1, hat='8', bass='drive', pad=1.0, stab=0.8, glock=1.0, arp=0),
    'B':       dict(kick='four', clap=1, hat='16', bass='drive', pad=1.0, stab=0.8, glock=0.0, arp=1),
    'A2':      dict(kick='four', clap=1, hat='8', bass='drive', pad=1.0, stab=0.6, glock=1.0, arp=0),
    'BRK':     dict(kick=None, clap=0, hat=None, bass='long', pad=1.4, stab=0.0, glock=0.6, arp=0, prog=PROG_BRK),
    'HALF':    dict(kick='half', clap=0, snare='half', hat='16soft', bass='808', pad=1.0, stab=0.0, glock=0.0, arp=1),
    'POUND':   dict(kick='four', clap=1, hat='16', bass='drive', pad=1.3, stab=1.0, glock=0.0, arp=1),
    'CHORUS':  dict(kick='four', clap=1, hat='16', bass='drive', pad=1.1, stab=0.9, glock=1.2, arp=1, octave=1),
    'THINK':   dict(kick='soft', clap=0, hat='shaker', bass='long', pad=0.9, stab=0.0, glock=0.0, arp=0, box=1),
    'STOP':    dict(kick=None, clap=0, hat=None, bass='pulse', pad=0.0, stab=0.0, glock=0.0, arp=0),
    'SWAG':    dict(kick='swag', clap=0, snare='back', hat='8swing', bass='808', pad=0.7, stab=0.0, glock=0.0, arp=0),
    'CHORUS2': dict(kick='four', clap=1, hat='16', bass='drive', pad=1.1, stab=0.9, glock=1.2, arp=1, octave=1),
    'OUTRO':   dict(kick=None, clap=0, hat=None, bass=None, pad=0.8, stab=0.0, glock=0.5, arp=0),
}
HOOK = [(0, 78, .5), (0.5, 81, .5), (1.5, 83, .5), (2, 81, .5), (2.5, 78, 1), (3.5, 76, .5),
        (4, 76, .5), (4.5, 78, .5), (5, 81, 1), (6.5, 78, .5), (7, 76, 1),
        (8, 74, .5), (8.5, 78, .5), (9.5, 83, .5), (10, 81, .5), (10.5, 78, 1), (11.5, 81, .5),
        (12, 79, .5), (12.5, 78, .5), (13, 76, .5), (13.5, 74, 1.5), (15, 76, .5), (15.5, 78, .5)]

drums, bassb, music, lead, fx = Bus('drums'), Bus('bass'), Bus('music'), Bus('lead'), Bus('fx')
kicks = []

def section_of(bar):
    for a, b, name in SECTIONS:
        if a <= bar < b: return name, bar - a
    return None, 0

# pre-render one-shots
K, KT, CL, SN, SH = kick(), kick(tight=True), clap(), snare(), shaker()
HC = [hat(1, False, s) for s in range(4)]; HO = hat(1, True)

for bar in range(0, 39):
    name, rel = section_of(bar)
    if name is None: continue
    c = CFG[name]; prog = c.get('prog', PROG)
    chord, root = CH[prog[bar % 4]]
    t0 = bt(bar)
    # --- drums
    kk = c.get('kick')
    kpos = {'four': [0, 1, 2, 3], 'half': [0, 2.5], 'soft': [0], 'swag': [0, 1.75, 2.5]}.get(kk, [])
    for b in kpos:
        tt = t0 + b * BEAT
        if name == 'CHORUS2' and tt < 74.0: continue
        drums.put(K if kk != 'soft' else KT, tt, db(-4 if kk != 'soft' else -9)); kicks.append(tt)
    if c.get('clap'):
        for b in [1, 3]:
            tt = t0 + b * BEAT
            if name == 'CHORUS2' and tt < 74.0: continue
            drums.put(CL, tt, db(-7), 0.05)
    sn = c.get('snare')
    if sn == 'half': drums.put(SN, t0 + 2 * BEAT, db(-6))
    if sn == 'back':
        for b in [1, 3]: drums.put(SN, t0 + b * BEAT, db(-6))
    hh = c.get('hat')
    if hh in ('8', '16', '16soft', '8swing'):
        step = 0.5 if hh in ('8', '8swing') else 0.25
        for j in range(int(4 / step)):
            b = j * step
            if hh == '8swing' and j % 2: b += 0.08
            tt = t0 + b * BEAT
            if name == 'CHORUS2' and tt < 74.0: continue
            off = abs(b % 1 - 0.5) < 0.01
            g = db(-10 if off else -15) * (0.6 if hh == '16soft' else 1)
            drums.put(HO if (off and hh == '8' and j % 4 == 1) else HC[j % 4], tt, g, 0.25 if j % 2 else -0.15)
    if hh == 'shaker':
        for j in range(8): drums.put(SH, t0 + j * 0.5 * BEAT, db(-12 if j % 2 else -16), 0.3)
    # --- bass
    bs = c.get('bass')
    if bs == 'drive':
        pat = [(0, 0, .45), (0.5, 12, .4), (1, 0, .45), (1.5, 12, .4), (2, 0, .45), (2.5, 12, .4), (3, 7, .45), (3.5, 12, .4)]
        for b, iv, d in pat:
            tt = t0 + b * BEAT
            if name == 'CHORUS2' and tt < 74.0: continue
            bassb.put(bass(root + iv, d * BEAT * 1.6), tt, db(-3))
    elif bs == 'long':
        bassb.put(bass(root, 3.6 * BEAT, 0.8, fc=250), t0, db(-5))
    elif bs == '808':
        glide = None if bar % 2 == 0 else root + 5
        bassb.put(bass808(root, 1.4, 1.0, glide), t0, db(-3))
        bassb.put(bass808(root + (12 if bar % 2 else 7), 0.4, 0.8), t0 + 2.5 * BEAT, db(-6))
    elif bs == 'pulse':
        for b in [0, 1, 2, 3]: bassb.put(bass(38, 0.25, 0.7, fc=200), t0 + b * BEAT, db(-8))
    # --- pads
    if c.get('pad', 0) > 0:
        fc = 1400 if name in ('BRK', 'THINK', 'OUTRO') else 2200
        music.put(pad(chord, BAR, c['pad'], fc=fc, attack=0.35 if name in ('BRK', 'OUTRO') else 0.08, release=0.6, seed=bar), t0, db(-2))
    # --- stabs (offbeats)
    if c.get('stab', 0) > 0:
        for b in [0.5, 1.5, 2.5, 3.5]:
            tt = t0 + b * BEAT
            if name == 'CHORUS2' and tt < 74.0: continue
            music.put(pluck([m + 12 for m in chord[:3]], 1.0, 0.28, 4200, 600, 0.12), tt, db(-11) * c['stab'], 0.2 if b in (0.5, 2.5) else -0.2)
    # --- arp (16ths, chord tones)
    if c.get('arp'):
        tones = [chord[0] + 12, chord[1] + 12, chord[2] + 12, chord[1] + 24]
        for j in range(16 if name != 'HALF' else 8):
            step = 0.25 if name != 'HALF' else 0.5
            tt = t0 + j * step * BEAT
            if name == 'CHORUS2' and tt < 74.0: continue
            m = tones[j % 4] + (12 if (j // 4) % 2 and name in ('CHORUS', 'CHORUS2', 'POUND') else 0)
            lead.put(pluck([m], 0.9, 0.2, 6500, 1500, 0.07, 0.03), tt, db(-19), -0.5 + (j % 4) * 0.33)
    # --- glockenspiel hook
    gv = c.get('glock', 0)
    if gv > 0:
        phrase_bar = (bar - (0 if name == 'A1' else 0)) % 4
        for off, m, d in HOOK:
            if phrase_bar * 4 <= off < phrase_bar * 4 + 4:
                tt = t0 + (off - phrase_bar * 4) * BEAT
                if name == 'CHORUS2' and tt < 74.0: continue
                if name == 'BRK' and off % 2 != 0: continue
                lead.put(glock(m, gv), tt, db(-7), 0.1)
                if c.get('octave'): lead.put(glock(m + 12, gv * 0.5, 1.0, 0.7), tt + 0.004, db(-12), -0.3)
    if c.get('box'):
        for j, m in enumerate([81, 78, 76, 74] if bar % 2 == 0 else [76, 78, 81, 83]):
            lead.put(musicbox(m + 12), t0 + j * BEAT, db(-7), 0.2 * (j % 2 * 2 - 1))
    # --- fills / crashes at section starts
    if rel == 0 and name in ('A1', 'B', 'POUND', 'CHORUS', 'SWAG'): drums.put(crash(1.0), t0, db(-8))
drums.put(crash(1.0), 74.0, db(-6))

# intro (0-3 s): Dmaj9 swell + a muffled kick that builds into the drop; outro strips back for the loop
music.put(pad([62, 66, 69, 76], 3.0, 0.9, fc=1500, attack=0.6, release=0.3, seed=99), 0.0, db(0))
bassb.put(bass(38, 0.4, 0.6, fc=200), 0.0, db(-6))
INTRO = Bus('intro')
for j, tt in enumerate([0.0, 0.5, 1.0, 1.5, 2.0, 2.25, 2.5, 2.625, 2.75, 2.875]):
    INTRO.put(K, tt, db(-8 + 4 * tt / 3))
for j in range(12): INTRO.put(HC[j % 4], 0.5 + j * 0.25, db(-20 + 6 * j / 12), 0.2)
iu = np.clip(np.arange(N + PAD) / SR / 3.0, 0, 1)
INTRO.x[:, 0] = sweep(INTRO.x[:, 0], 250 * (40 ** iu), block=256); INTRO.x[:, 1] = sweep(INTRO.x[:, 1], 250 * (40 ** iu), block=256)
INTRO.x[ns(3.0):] = 0
music.put(pad([62, 66, 69, 76], 2.0, 0.6, fc=1100, attack=0.3, release=0.3, seed=98), 79.0, db(-4))
lead.put(glock(86, 0.5, 1.8, 0.6), 79.0, db(-10))
# snare roll fills into big sections
for (t_end, dur) in [(15.0, 1.0), (51.0, 1.0), (74.0, 0.5)]:
    steps = int(dur / (BEAT / 4))
    for j in range(steps):
        tt = t_end - dur + j * BEAT / 4
        drums.put(SN, tt, db(-18 + 12 * j / steps), 0.1)

# ----------------------------------------------------------------------------- SFX placement
DUCK = []  # (time, depth_db, length) -> music ducking under big moments
for cu in META['cues']:
    typ = cu['type']; fn = SFX.get(typ)
    if fn is None:
        print('missing sfx', typ); continue
    params = {k: v for k, v in cu.items() if k not in ('t', 'type')}
    sig = fn(**params)
    pan = 0.0
    if typ in ('pop', 'blip', 'star', 'twinkle', 'plop', 'squeak', 'flip', 'ratchet'):
        pan = ((int(cu.get('n', 0)) * 5 + 3) % 7 - 3) / 6.0
    fx.put(sig, cu['t'], db(LEVEL.get(typ, 0)), pan)
    if typ in ('impact', 'scratch', 'buzzer', 'stamp'):
        DUCK.append((cu['t'], -6 if typ != 'impact' else -5, 0.5))

# music cut for the "BUT." record scratch (65 s), resumes on the downbeat at 67 s
for b in (music, lead, drums, bassb):
    i0, i1 = ns(65.0), ns(65.0) + ns(0.03)
    b.x[i1:ns(67.0)] *= 0.0
    b.x[i0:i1] *= np.linspace(1, 0, i1 - i0)[:, None]
# ...but keep a low tension bed (ticking clock + dark drone) so it never goes dead
music.put(pad([59, 62, 66], 1.55, 0.8, fc=650, attack=0.4, release=0.3, seed=77), 65.45, db(1))
for j in range(12): drums.put(S_tick(0.9), 65.5 + j * 0.125 * 1.0 + (0.0 if j % 2 == 0 else 0.0), db(-8 if j % 2 == 0 else -13), 0.3 if j % 2 else -0.3)
for b_ in [65.5, 66.0, 66.5]: bassb.put(bass(35, 0.2, 0.8, fc=250), b_, db(-7))

# ----------------------------------------------------------------------------- mix
L = N + PAD
tt = np.arange(L) / SR
sc = np.ones(L)
for tk in kicks:  # side-chain pump
    i = ns(tk); k = min(ns(0.42), L - i)
    seg = 1 - 0.55 * np.exp(-secs(k) / 0.11) * np.minimum(1, secs(k) / 0.004 + 0.4)
    sc[i:i + k] = np.minimum(sc[i:i + k], seg)
duck = np.ones(L)
for (t, d, length) in DUCK:
    i = ns(t); k = min(ns(length + 0.3), L - i)
    seg = 1 - (1 - db(d)) * np.exp(-secs(k) / length)
    duck[i:i + k] = np.minimum(duck[i:i + k], seg)

# zoom-out moment: muffle the band, then open back up as Bub is revealed
filt = np.full(L, 18000.0)
a, b2, c2 = ns(29.35), ns(30.9), ns(31.9)
filt[a:b2] = 18000 * (700 / 18000) ** np.linspace(0, 1, b2 - a)
filt[b2:c2] = 700 * (18000 / 700) ** np.linspace(0, 1, c2 - b2)
# "So... is it magic?" (73-74 s): filtered anticipation before the final chorus
d2, e2 = ns(72.9), ns(74.0)
filt[d2:e2] = np.minimum(filt[d2:e2], 900)

# section dynamics: verses sit back, choruses and drops hit harder
SEC_GAIN = {'A1': 0.82, 'A': 0.86, 'B': 0.95, 'A2': 0.9, 'BRK': 0.8, 'HALF': 0.88, 'POUND': 1.0, 'CHORUS': 1.0,
            'THINK': 0.78, 'STOP': 0.7, 'SWAG': 0.92, 'CHORUS2': 1.0, 'OUTRO': 0.75}
secg = np.full(L, 0.8)
for a_, b_, nm in SECTIONS:
    secg[ns(bt(a_)):ns(bt(b_))] = SEC_GAIN[nm]
secg = lp(secg, 6)
music_mix = (music.x * db(2.5) + lead.x * db(2)) * (sc * duck * secg)[:, None]
bass_mix = bassb.x * (sc * duck * secg)[:, None]
drum_mix = drums.x * (duck * secg)[:, None] + INTRO.x
music_mix = np.stack([sweep(music_mix[:, 0], filt, block=256), sweep(music_mix[:, 1], filt, block=256)], 1)
bass_mix = np.stack([sweep(bass_mix[:, 0], np.maximum(filt, 400), block=256), sweep(bass_mix[:, 1], np.maximum(filt, 400), block=256)], 1)
drum_mix = np.stack([sweep(drum_mix[:, 0], filt, block=256), sweep(drum_mix[:, 1], filt, block=256)], 1)
bass_mix = hp(bass_mix, 36)

lead_delay = delay(lead.x, 0.375, fb=0.35, mix=0.22)  # dotted-8th ping-pong on the hook
verb_send = music_mix * 0.35 + lead.x * 0.5 + lead_delay * 0.5 + fx.x * 0.18 + drums.x * 0.04
hall = reverb(verb_send, IR_HALL)
room = reverb(drums.x * 0.5 + fx.x * 0.25, IR_ROOM)

mix = (music_mix * db(-2) + bass_mix * db(-1) + drum_mix * db(-1) + lead_delay * db(-8) * (sc * duck)[:, None]
       + fx.x * db(1) + hall * db(-8) + room * db(-14))
# fold the tail back onto the head so the loop point is seamless
tail = mix[N:]
mix = mix[:N].copy(); mix[: len(tail)] += tail * np.linspace(1, 0, len(tail))[:, None] * 0.6
mix = hp(mix, 28)
def biquad(kind, f0, gdb, q=0.707):
    A = 10 ** (gdb / 40); w = 2 * np.pi * f0 / SR; al = np.sin(w) / (2 * q); cw = np.cos(w)
    if kind == 'peak':
        b = [1 + al * A, -2 * cw, 1 - al * A]; a = [1 + al / A, -2 * cw, 1 - al / A]
    elif kind == 'low':
        sq = 2 * np.sqrt(A) * al
        b = [A * ((A + 1) - (A - 1) * cw + sq), 2 * A * ((A - 1) - (A + 1) * cw), A * ((A + 1) - (A - 1) * cw - sq)]
        a = [(A + 1) + (A - 1) * cw + sq, -2 * ((A - 1) + (A + 1) * cw), (A + 1) + (A - 1) * cw - sq]
    else:
        sq = 2 * np.sqrt(A) * al
        b = [A * ((A + 1) + (A - 1) * cw + sq), -2 * A * ((A - 1) + (A + 1) * cw), A * ((A + 1) + (A - 1) * cw - sq)]
        a = [(A + 1) - (A - 1) * cw + sq, 2 * ((A - 1) - (A + 1) * cw), (A + 1) - (A - 1) * cw - sq]
    return np.array(b) / a[0], np.array(a) / a[0]
for kind, f0, g, q in [('low', 55, -2.5, 0.7), ('peak', 420, 2.0, 0.8), ('peak', 2500, 1.5, 0.9), ('high', 6000, 3.0, 0.7)]:
    b_, a_ = biquad(kind, f0, g, q); mix = signal.lfilter(b_, a_, mix, axis=0)

def measure(name, x):
    r = np.sqrt(np.mean(x ** 2)) + 1e-12; p = np.max(np.abs(x)) + 1e-12
    print(f'  {name:10s} rms {20*np.log10(r):6.1f} dBFS   peak {20*np.log10(p):6.1f} dBFS')
print('bus levels:')
for nm, x in [('music', music_mix[:N]), ('bass', bass_mix[:N]), ('drums', drum_mix[:N]), ('lead', lead.x[:N]), ('fx', fx.x[:N]), ('hall', hall[:N])]:
    measure(nm, x)

# ---------------------------------------------------------------- mastering (BS.1770 loudness + limiter)
def lufs(x):
    b1, a1 = [1.53512485958697, -2.69169618940638, 1.19839281085285], [1.0, -1.69065929318241, 0.73248077421585]
    b2, a2 = [1.0, -2.0, 1.0], [1.0, -1.99004745483398, 0.99007225036621]
    y = signal.lfilter(b2, a2, signal.lfilter(b1, a1, x, axis=0), axis=0)
    blk, hop = ns(0.4), ns(0.1)
    ms = np.array([np.sum(np.mean(y[i:i + blk] ** 2, 0)) for i in range(0, len(y) - blk, hop)])
    ld = -0.691 + 10 * np.log10(ms + 1e-12)
    g1 = ms[ld > -70]; rel = -0.691 + 10 * np.log10(np.mean(g1)) - 10
    g2 = ms[(ld > -70) & (ld > rel)]
    return -0.691 + 10 * np.log10(np.mean(g2))

def limiter(x, ceiling_db=-1.5, release=0.1, block=32):
    c = db(ceiling_db); nb = int(np.ceil(len(x) / block))
    xp = np.pad(x, ((0, nb * block - len(x)), (0, 0)))
    pk = np.max(np.abs(xp).reshape(nb, block, 2), axis=(1, 2))
    need = np.minimum(1.0, c / np.maximum(pk, 1e-9))
    need = np.minimum.reduce([need, np.roll(need, -1), np.roll(need, -2), np.roll(need, 1)])
    g = np.empty(nb); cur = 1.0; a = np.exp(-block / SR / release)
    for k in range(nb):
        cur = min(need[k], 1 - (1 - cur) * a); g[k] = cur
    gs = np.interp(np.arange(len(x)), np.arange(nb) * block + block / 2, g)
    y = x * gs[:, None]
    return np.clip(y, -c, c), 20 * np.log10(np.min(g))

TARGET = -13.0
mix *= db(-3) / np.max(np.abs(mix))
for it in range(3):
    cur_l = lufs(mix)
    lim, gr = limiter(mix * db(TARGET - cur_l + (0.6 if it else 0)))
    got = lufs(lim)
    print(f'  pass {it}: in {cur_l:.1f} LUFS -> out {got:.1f} LUFS, max GR {gr:.1f} dB')
    if abs(got - TARGET) < 0.3: break
    mix = mix * db(TARGET - got)
mix = lim
measure('MASTER', mix)

out = os.path.join(ROOT, 'out', 'soundtrack_raw.wav')
pcm = (np.clip(mix, -1, 1) * 32767).astype('<i2')
with wave.open(out, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print('wrote', out, f'{len(mix)/SR:.2f}s')

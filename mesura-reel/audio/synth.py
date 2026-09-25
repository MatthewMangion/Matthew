"""Shared synthesis toolkit for the Mesura films: instruments, buses, reverb and mastering.

A film script calls init(duration), places events with place(), then master(path).
"""
import numpy as np
from scipy import signal
from scipy.io import wavfile
from scipy.ndimage import minimum_filter1d, uniform_filter1d

SR = 48000
rng = np.random.default_rng(20260925)
DUR = 0.0
N = 0
BUS = {}
SEND = None
KICKS = []


def init(duration):
    global DUR, N, BUS, SEND
    DUR = float(duration)
    N = int(SR * DUR)
    BUS = {k: np.zeros((N, 2)) for k in ("drums", "bass", "pad", "keys", "sfx", "hits")}
    SEND = np.zeros((N, 2))
    KICKS.clear()


# ------------------------------------------------------------------ helpers
def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def tt(dur):
    return np.arange(int(dur * SR)) / SR


def xpan(x):
    """Screen x (0..1920) to stereo pan (-1..1), kept inside the image."""
    return float(np.clip((x / 1920) * 2 - 1, -1, 1)) * 0.75


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



def add_kick(t0, vel=1.0, **kw):
    place("drums", kick(vel, **kw), t0, 0.5)
    KICKS.append((t0, vel))


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


LEVEL = {"drums": 1.0, "bass": 0.85, "pad": 1.0, "keys": 1.5, "sfx": 1.25, "hits": 1.0}


def master(out, level=LEVEL, fade_out=0.6):
    """Sidechain, reverb, sum, look-ahead limit, fade and write a 16-bit WAV."""
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

    ir = make_ir()
    wet = np.stack([signal.fftconvolve(SEND[:, c], ir[:, c])[:N] for c in range(2)], axis=1)
    wet = filt(wet, "hp", 180)

    mix = sum(BUS[k] * g for k, g in level.items()) + wet * 0.42
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

    # Tail: fade the last 0.6 s so the picture and sound end together.
    tl = np.arange(N) / SR
    fade = np.clip((DUR - tl) / fade_out, 0, 1) ** 1.5
    mix *= fade[:, None]
    mix[: int(0.003 * SR)] *= np.linspace(0, 1, int(0.003 * SR))[:, None]

    pk = np.max(np.abs(mix))
    mix *= 0.89 / pk
    rms = np.sqrt(np.mean(mix ** 2))
    print(f"peak {20 * np.log10(np.max(np.abs(mix))):.2f} dBFS  rms {20 * np.log10(rms):.2f} dBFS  "
          f"limiter max gr {20 * np.log10(np.min(g)):.2f} dB")
    wavfile.write(out, SR, (mix * 32767).astype(np.int16))
    print("wrote", out)

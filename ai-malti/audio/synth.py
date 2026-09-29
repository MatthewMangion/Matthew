"""
synth.py — original soundtrack + sound design for "AI bil-Malti — Kif Naħdem"
Everything is synthesized from scratch (no samples): 120 BPM, D minor, 64 s, seamless loop.

    python3 audio/synth.py  →  audio/mix.wav (48 kHz stereo float) + stems
"""
import json, os, sys
import numpy as np
from numba import njit
from scipy import signal

HERE = os.path.dirname(os.path.abspath(__file__))
SR = 48000
DUR = 64.0
N = int(SR * DUR)
PAD = SR * 6  # tail room
BEAT, BAR = 0.5, 2.0
RNG = np.random.default_rng(1234)

cues = json.load(open(os.path.join(HERE, 'cues.json')))['CUES']


def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12.0)


def tt(dur):
    return np.arange(int(dur * SR)) / SR


def noise(n, rng=RNG):
    return rng.standard_normal(n)


# ─────────────────────────── DSP primitives (numba) ───────────────────────────
@njit(cache=True)
def _saw(freq, sr, ph):
    n = freq.shape[0]
    out = np.empty(n)
    for i in range(n):
        dt = freq[i] / sr
        ph += dt
        if ph >= 1.0:
            ph -= 1.0
        v = 2.0 * ph - 1.0
        if ph < dt:
            t = ph / dt
            v -= t + t - t * t - 1.0
        elif ph > 1.0 - dt:
            t = (ph - 1.0) / dt
            v -= t * t + t + t + 1.0
        out[i] = v
    return out


@njit(cache=True)
def _svf(x, fc, q, mode, sr):
    n = x.shape[0]
    out = np.empty(n)
    ic1 = 0.0
    ic2 = 0.0
    k = 1.0 / q
    for i in range(n):
        f = fc[i]
        if f > sr * 0.45:
            f = sr * 0.45
        if f < 10.0:
            f = 10.0
        g = np.tan(np.pi * f / sr)
        a1 = 1.0 / (1.0 + g * (g + k))
        a2 = g * a1
        a3 = g * a2
        v3 = x[i] - ic2
        v1 = a1 * ic1 + a2 * v3
        v2 = ic2 + a2 * ic1 + a3 * v3
        ic1 = 2.0 * v1 - ic1
        ic2 = 2.0 * v2 - ic2
        if mode == 0:
            out[i] = v2
        elif mode == 1:
            out[i] = v1
        else:
            out[i] = x[i] - k * v1 - v2
    return out


@njit(cache=True)
def _pingpong(xl, xr, d, fb, mix):
    n = xl.shape[0]
    bl = np.zeros(n)
    br = np.zeros(n)
    for i in range(n):
        dl = bl[i - d] if i >= d else 0.0
        dr = br[i - d] if i >= d else 0.0
        bl[i] = xr[i] + dr * fb
        br[i] = dl * fb
    ol = xl + mix * bl
    orr = xr + mix * br
    return ol, orr


@njit(cache=True)
def _release(g, ar):
    out = np.empty_like(g)
    s = 1.0
    for i in range(g.shape[0]):
        r = ar * s + (1 - ar) * g[i]
        s = g[i] if g[i] < r else r
        out[i] = s
    return out


@njit(cache=True)
def _limiter_gain(peak, ceil, look, rel, sr):
    # peak: per-sample max |x| over channels. Returns smooth gain with lookahead (min over window), exp release.
    n = peak.shape[0]
    need = np.ones(n)
    for i in range(n):
        if peak[i] > ceil:
            need[i] = ceil / peak[i]
    # lookahead min filter (window `look` samples ahead)
    g = np.ones(n)
    for i in range(n - 1, -1, -1):
        m = need[i]
        # running min over [i, i+look] computed incrementally below
        g[i] = m
    out = np.ones(n)
    # simple O(n*look/8) min with stride for speed
    for i in range(n):
        m = 1.0
        j1 = i + look
        if j1 > n:
            j1 = n
        j = i
        while j < j1:
            if need[j] < m:
                m = need[j]
            j += 4
        out[i] = m
    # smoothing: instant attack toward lower gain (already looked ahead), exponential release
    ar = np.exp(-1.0 / (rel * sr))
    aa = np.exp(-1.0 / (0.0015 * sr))
    s = 1.0
    for i in range(n):
        tgt = out[i]
        if tgt < s:
            s = aa * s + (1 - aa) * tgt
        else:
            s = ar * s + (1 - ar) * tgt
        out[i] = s
    return out


@njit(cache=True)
def _comp(x, sc, thr, ratio, att, rel, sr):
    # feed-forward compressor, returns gain curve (linear) from sidechain level
    n = x.shape[0]
    g = np.ones(n)
    env = 0.0
    aa = np.exp(-1.0 / (att * sr))
    ar = np.exp(-1.0 / (rel * sr))
    for i in range(n):
        v = abs(sc[i])
        if v > env:
            env = aa * env + (1 - aa) * v
        else:
            env = ar * env + (1 - ar) * v
        db = 20.0 * np.log10(env + 1e-9)
        over = db - thr
        if over > 0:
            gr = over - over / ratio
            g[i] = 10 ** (-gr / 20.0)
    return g


def saw(freq, ph=None):
    freq = np.asarray(freq, dtype=np.float64)
    return _saw(freq, float(SR), RNG.random() if ph is None else ph)


def square(freq, pw=0.5):
    freq = np.asarray(freq, dtype=np.float64)
    ph = RNG.random()
    a = _saw(freq, float(SR), ph)
    b = _saw(freq, float(SR), (ph + pw) % 1.0)
    return 0.5 * (a - b)


def svf(x, fc, q=0.707, mode='lp'):
    fc = np.broadcast_to(np.asarray(fc, dtype=np.float64), x.shape).copy()
    return _svf(x.astype(np.float64), fc, float(q), {'lp': 0, 'bp': 1, 'hp': 2}[mode], float(SR))


def shelf(f0, gain_db, S=0.8):
    # RBJ high-shelf biquad
    A = 10 ** (gain_db / 40)
    w0 = 2 * np.pi * f0 / SR
    alpha = np.sin(w0) / 2 * np.sqrt((A + 1 / A) * (1 / S - 1) + 2)
    cw = np.cos(w0)
    b0 = A * ((A + 1) + (A - 1) * cw + 2 * np.sqrt(A) * alpha)
    b1 = -2 * A * ((A - 1) + (A + 1) * cw)
    b2 = A * ((A + 1) + (A - 1) * cw - 2 * np.sqrt(A) * alpha)
    a0 = (A + 1) - (A - 1) * cw + 2 * np.sqrt(A) * alpha
    a1 = 2 * ((A - 1) - (A + 1) * cw)
    a2 = (A + 1) - (A - 1) * cw - 2 * np.sqrt(A) * alpha
    return np.array([b0, b1, b2]) / a0, np.array([1, a1 / a0, a2 / a0])


def sos_filter(x, kind, f, order=2):
    sos = signal.butter(order, f, btype=kind, fs=SR, output='sos')
    return signal.sosfilt(sos, x)


def expenv(n, rate):
    return np.exp(-np.arange(n) / SR * rate)


def adsr(n, a, d, s, r, gate):
    t = np.arange(n) / SR
    env = np.where(t < a, t / max(a, 1e-4), s + (1 - s) * np.exp(-(t - a) / max(d, 1e-4)))
    rel = np.clip((t - gate) / max(r, 1e-4), 0, 1)
    env = env * np.where(t > gate, np.exp(-5 * rel), 1.0)
    env[t > gate + r * 1.2] = 0
    return env


def pan2(sig, pan=0.0):
    l = np.cos((pan + 1) * np.pi / 4) * np.sqrt(2)
    r = np.sin((pan + 1) * np.pi / 4) * np.sqrt(2)
    return np.vstack([sig * l, sig * r])


class Bus:
    def __init__(self, name):
        self.name = name
        self.b = np.zeros((2, N + PAD))

    def add(self, t, sig, gain=1.0, pan=0.0):
        if sig.ndim == 1:
            sig = pan2(sig, pan)
        i = int(round(t * SR))
        n = sig.shape[1]
        if i < 0:
            sig = sig[:, -i:]
            n = sig.shape[1]
            i = 0
        n = min(n, self.b.shape[1] - i)
        if n <= 0:
            return
        self.b[:, i:i + n] += sig[:, :n] * gain


DRUMS, BASS, MUSIC, LEAD, FX, VERB, DLY = (Bus(n) for n in ['drums', 'bass', 'music', 'lead', 'fx', 'verb', 'dly'])


def send(bus_to, t, sig, gain, pan=0.0):
    bus_to.add(t, sig, gain, pan)


# ─────────────────────────── instruments ───────────────────────────
def kick(vel=1.0, dur=0.5, low=45.0):
    t = tt(dur)
    f = low + 125 * np.exp(-t * 36) + 28 * np.exp(-t * 7)
    ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(ph) * np.exp(-t * 5.8)
    click = sos_filter(noise(len(t)), 'highpass', 2500) * np.exp(-t * 260) * 0.45
    thump = np.sin(2 * np.pi * 95 * t) * np.exp(-t * 30) * 0.3
    return np.tanh((body + click + thump) * 1.7) * 0.92 * vel


def clap(vel=1.0):
    t = tt(0.45)
    env = np.zeros_like(t)
    for d in [0.0, 0.010, 0.021, 0.033]:
        env += np.where(t >= d, np.exp(-(t - d) * 160), 0)
    env += np.exp(-t * 11) * 0.45
    nz = noise(len(t))
    s = sos_filter(nz, 'bandpass', [900, 3200]) * env
    s += sos_filter(nz, 'bandpass', [5000, 9000]) * np.exp(-t * 30) * 0.12
    return s * 0.9 * vel


def snare(vel=1.0, tune=1.0):
    t = tt(0.3)
    body = np.sin(2 * np.pi * np.cumsum(185 * tune + 40 * np.exp(-t * 40)) / SR) * np.exp(-t * 22)
    nz = sos_filter(noise(len(t)), 'bandpass', [1500, 7000]) * np.exp(-t * 16)
    return np.tanh((body * 0.7 + nz * 0.9) * 1.3) * 0.8 * vel


def hat(vel=1.0, open_=False):
    d = 0.4 if open_ else 0.07
    t = tt(d)
    # metallic: sum of detuned squares + noise
    m = np.zeros_like(t)
    for f in [317, 413, 567, 801, 1055, 1407]:
        m += np.sign(np.sin(2 * np.pi * f * 3.1 * t + RNG.random() * 6))
    s = sos_filter(m * 0.3 + noise(len(t)), 'bandpass', [6500, 11500])
    return s * np.exp(-t * (8 if open_ else 65)) * 0.13 * vel


def crash(vel=1.0, dur=2.6):
    t = tt(dur)
    m = np.zeros_like(t)
    for f in [211, 347, 503, 667, 889, 1201, 1573]:
        m += np.sign(np.sin(2 * np.pi * f * 2.3 * t + RNG.random() * 6))
    s = sos_filter(m * 0.25 + noise(len(t)), 'bandpass', [3800, 10000])
    env = np.exp(-t * 1.5) * (1 - np.exp(-t * 400))
    return s * env * 0.2 * vel


def supersaw(notes, dur, cutoff=4200, a=0.004, d=0.25, s=0.75, r=0.18, vel=1.0, fenv=0.0, width=1.0):
    n = int((dur + r * 1.5) * SR)
    L = np.zeros(n)
    R = np.zeros(n)
    det = [-19, -11, -5, 0, 5, 11, 19]
    t = np.arange(n) / SR
    for note in notes:
        f0 = mtof(note)
        for k, c in enumerate(det):
            v = saw(np.full(n, f0 * 2 ** (c / 1200)))
            p = (k - 3) / 3 * 0.8 * width
            L += v * np.cos((p + 1) * np.pi / 4)
            R += v * np.sin((p + 1) * np.pi / 4)
    fc = cutoff * (1 + fenv * np.exp(-t * 9))
    env = adsr(n, a, d, s, r, dur) * vel / (len(notes) * 3.2)
    return np.vstack([svf(L, fc, 0.9) * env, svf(R, fc, 0.9) * env])


def pluck(note, dur=0.28, vel=1.0, bright=1.0):
    n = int((dur + 0.2) * SR)
    t = np.arange(n) / SR
    f = mtof(note)
    v = saw(np.full(n, f)) * 0.6 + square(np.full(n, f * 1.003)) * 0.4
    fc = 400 + 7000 * bright * np.exp(-t * 22)
    out = svf(v, fc, 1.4) * np.exp(-t * 8.5) * np.clip(t / 0.002, 0, 1) * vel * 0.5
    return out


def sub(note, dur, vel=1.0):
    n = int((dur + 0.05) * SR)
    t = np.arange(n) / SR
    s = np.sin(2 * np.pi * mtof(note) * t)
    env = np.clip(t / 0.006, 0, 1) * np.clip((dur + 0.04 - t) / 0.04, 0, 1)
    return np.tanh(s * 1.2) * env * vel * 0.42


def midbass(note, dur, vel=1.0):
    n = int((dur + 0.05) * SR)
    t = np.arange(n) / SR
    f = mtof(note)
    v = saw(np.full(n, f * 2 ** (-7 / 1200))) + saw(np.full(n, f * 2 ** (7 / 1200)))
    fc = 180 + 1400 * np.exp(-t * 14)
    env = np.clip(t / 0.004, 0, 1) * np.clip((dur + 0.03 - t) / 0.03, 0, 1)
    return np.tanh(svf(v, fc, 1.2) * 1.6) * env * vel * 0.26


def lead(note, dur, vel=1.0):
    n = int((dur + 0.25) * SR)
    t = np.arange(n) / SR
    vib = 1 + 0.004 * np.sin(2 * np.pi * 5.6 * t) * np.clip((t - 0.15) / 0.2, 0, 1)
    f = mtof(note) * vib
    v = saw(f * 2 ** (6 / 1200)) + saw(f * 2 ** (-6 / 1200)) + 0.5 * square(f * 0.5)
    fc = 900 + 4200 * np.exp(-t * 6) + 900
    env = adsr(n, 0.008, 0.2, 0.7, 0.18, dur)
    return svf(v, fc, 1.1) * env * vel * 0.22


def vox(note, dur, vel=1.0):
    # formant synth whose vowels glide /a/ → /i/: the hook literally sings "AI"
    n = int((dur + 0.12) * SR)
    t = np.arange(n) / SR
    f = mtof(note) * (1 + 0.004 * np.sin(2 * np.pi * 5.2 * t))
    src = saw(f) * 0.6 + square(f * 1.001) * 0.4
    u = np.clip(t / max(dur, 1e-3), 0, 1) ** 0.7
    F1 = 820 - 520 * u
    F2 = 1250 + 1050 * u
    F3 = 2650 + 350 * u
    y = svf(src, F1, 5.0, 'bp') * 0.55 + svf(src, F2, 7.0, 'bp') * 0.8 + svf(src, F3, 9.0, 'bp') * 0.4
    env = adsr(n, 0.012, 0.12, 0.8, 0.08, dur)
    return y * env * vel * 0.55


def pad(notes, dur, vel=1.0, cutoff=1100):
    n = int((dur + 1.2) * SR)
    t = np.arange(n) / SR
    L = np.zeros(n)
    R = np.zeros(n)
    for note in notes:
        for k, c in enumerate([-14, -6, 0, 7, 15]):
            v = saw(np.full(n, mtof(note) * 2 ** (c / 1200)))
            p = (k - 2) / 2 * 0.9
            L += v * np.cos((p + 1) * np.pi / 4)
            R += v * np.sin((p + 1) * np.pi / 4)
    fc = cutoff * (1 + 0.25 * np.sin(2 * np.pi * 0.3 * t))
    env = adsr(n, 0.5, 1.0, 0.85, 1.0, dur) * vel / (len(notes) * 3)
    return np.vstack([svf(L, fc, 0.8) * env, svf(R, fc, 0.8) * env])


def bell(note, dur=1.6, vel=1.0, ratio=3.5):
    t = tt(dur)
    f = mtof(note)
    idx = 5.5 * np.exp(-t * 3.2)
    m = np.sin(2 * np.pi * f * ratio * t) * idx
    return np.sin(2 * np.pi * f * t + m) * np.exp(-t * 2.4) * vel * 0.35


# ─────────────────────────── sound design ───────────────────────────
def fx_impact(size=1.0):
    t = tt(3.0)
    f = 28 + 60 * np.exp(-t * 3.2)
    boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 1.4)
    nz = sos_filter(noise(len(t)), 'lowpass', 900) * np.exp(-t * 6) * 0.8
    hit = kick(1.0, 0.5)
    out = np.tanh(boom * 1.3) * 0.55 + nz * 0.8
    out[:len(hit)] += hit * 0.7
    return out * min(size, 1.2)


def fx_hit(note=50, soft=False):
    g = 0.55 if soft else 1.0
    k = kick(0.9 * g)
    c = clap(0.8 * g)
    st = supersaw([note, note + 7, note + 12], 0.18, cutoff=3800, d=0.12, s=0.3, r=0.1, vel=1.3 * g, fenv=1.5)
    return k, c, st


def fx_stab(note=62, big=False):
    # rising D-minor inversions whose top voice is `note`
    lo = note - (24 if big else 15)
    tones = [m for m in range(lo, note + 1) if m % 12 in (2, 5, 9)]
    chord = tones[-(6 if big else 4):]
    return supersaw(chord, 0.32 if not big else 0.5, cutoff=5000, d=0.2, s=0.4, r=0.2, vel=1.4, fenv=2.0)


def fx_glitch(dur):
    n = int(dur * SR)
    out = np.zeros(n)
    i = 0
    while i < n:
        seg = int(SR * RNG.choice([0.012, 0.018, 0.025, 0.035]))
        seg = min(seg, n - i)
        kind = RNG.integers(0, 3)
        tseg = np.arange(seg) / SR
        if kind == 0:
            f = RNG.choice([220, 440, 880, 1760, 3520]) * RNG.uniform(0.9, 1.1)
            s = np.sign(np.sin(2 * np.pi * f * tseg))
        elif kind == 1:
            s = noise(seg)
            s = np.round(s * 3) / 3
        else:
            s = np.zeros(seg)
        out[i:i + seg] = s * RNG.uniform(0.3, 0.8)
        i += seg
    return sos_filter(out, 'highpass', 150) * 0.5


def fx_drop808(dur=0.9):
    t = tt(dur)
    f = 40 + 90 * np.exp(-t * 5)
    return np.tanh(np.sin(2 * np.pi * np.cumsum(f) / SR) * 2.0) * np.exp(-t * 2.5) * 0.8


def fx_type(n_clicks, dur, accel=False):
    total = int((dur + 0.1) * SR)
    out = np.zeros(total)
    for k in range(n_clicks):
        u = k / max(1, n_clicks - 1)
        tk = (1 - (1 - u) ** 1.8) * dur if accel else u * dur + RNG.uniform(-0.012, 0.012)
        tk = max(0, tk)
        t = tt(0.05)
        c = sos_filter(noise(len(t)), 'highpass', 2500) * np.exp(-t * 420) * 0.6
        c += np.sin(2 * np.pi * RNG.uniform(1500, 2300) * t) * np.exp(-t * 350) * 0.25
        c += np.sin(2 * np.pi * 160 * t) * np.exp(-t * 90) * 0.3
        i = int(tk * SR)
        out[i:i + len(t)] += c[: max(0, min(len(t), total - i))] * RNG.uniform(0.6, 1.0)
    return out * 0.7


def fx_whoosh(dur, up=False):
    n = int(dur * SR)
    t = np.arange(n) / SR
    u = t / dur
    if up:
        fc = 350 * (20 ** u)
        env = u ** 1.6 * np.clip((1 - u) / 0.08, 0, 1)
    else:
        fc = 500 + 3500 * np.sin(np.pi * u)
        env = np.sin(np.pi * u) ** 1.5
    s = svf(noise(n), fc, 2.2, 'bp') * env * 1.1
    pan = -0.8 + 1.6 * u
    return np.vstack([s * np.cos((pan + 1) * np.pi / 4), s * np.sin((pan + 1) * np.pi / 4)]) * np.sqrt(2)


def fx_riser(dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    u = t / dur
    fc = 300 * (30 ** (u ** 1.3))
    nz = svf(noise(n), fc, 3.5, 'bp') * (u ** 2) * 1.2
    tone = saw(180 * (6 ** u)) * 0.12 * u ** 2
    tone = svf(tone, 1500 + 5000 * u, 0.8)
    return nz + tone


def fx_reverse(dur):
    c = crash(1.0, dur + 0.2)[: int(dur * SR)]
    r = c[::-1].copy()
    n = len(r)
    r *= np.linspace(0, 1, n) ** 2
    return r * 1.6


def fx_implode(dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    u = t / dur
    f = 40 * (12 ** (u ** 2))
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * u ** 2
    nz = svf(noise(n), 200 + 8000 * u ** 2, 1.5, 'bp') * u ** 3
    s = tone * 0.6 + nz * 0.9
    s[-int(0.01 * SR):] *= np.linspace(1, 0, int(0.01 * SR))
    return s


def fx_zap():
    t = tt(0.16)
    f = 300 + 2600 * np.exp(-t * 30)
    s = np.sin(2 * np.pi * np.cumsum(f * (1 + 0.1 * np.sin(2 * np.pi * 70 * t))) / SR)
    s = np.tanh(s * 2) * np.exp(-t * 18) * 0.5
    s += sos_filter(noise(len(t)), 'highpass', 3000) * np.exp(-t * 60) * 0.25
    return s


def fx_pop(note):
    t = tt(0.16)
    f = mtof(note) * (1 + 1.2 * np.exp(-t * 55))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 30) * 0.45


def fx_flip():
    t = tt(0.06)
    return sos_filter(noise(len(t)), 'bandpass', [1800, 5000]) * np.exp(-t * 120) * 0.5


def fx_blip(note):
    t = tt(0.1)
    s = square(np.full(len(t), mtof(note)))
    return sos_filter(s, 'lowpass', 5000) * np.exp(-t * 40) * 0.2


def fx_shimmer(dur):
    notes = [74, 77, 81, 84, 86, 89, 93]
    out = np.zeros(int((dur + 1.6) * SR))
    k = 0
    step = 0.0625
    while k * step < dur:
        b = bell(notes[(k * 3) % len(notes)], 1.4, 0.35 * (0.6 + 0.4 * np.sin(k)), ratio=2.0)
        i = int(k * step * SR)
        out[i:i + len(b)] += b[: len(out) - i]
        k += 1
    return out


def fx_swoop(dur, up=True):
    t = tt(dur)
    u = t / dur
    f = 300 * (3 ** (u if up else 1 - u))
    s = np.sin(2 * np.pi * np.cumsum(f * (1 + 0.01 * np.sin(2 * np.pi * 7 * t))) / SR)
    return s * np.sin(np.pi * u) * 0.25


def fx_eye():
    b = bell(81, 2.4, 0.9, ratio=3.01) + bell(88, 2.4, 0.5, ratio=2.0)
    sw = fx_reverse(0.5)
    out = np.zeros(len(b) + len(sw))
    out[:len(sw)] += sw * 0.6
    out[len(sw) - int(0.02 * SR):len(sw) - int(0.02 * SR) + len(b)] += b
    return out, 0.5


def fx_ding():
    a = bell(81, 1.2, 0.8, ratio=2.0)
    b = bell(88, 1.4, 0.8, ratio=2.0)
    out = np.zeros(len(b) + int(0.09 * SR))
    out[:len(a)] += a
    out[int(0.09 * SR):int(0.09 * SR) + len(b)] += b
    return out


def fx_buzz():
    t = tt(0.4)
    s = square(np.full(len(t), 118.0)) + square(np.full(len(t), 125.0))
    s = sos_filter(np.tanh(s * 2), 'lowpass', 1800)
    return s * np.clip((0.4 - t) / 0.05, 0, 1) * 0.35


def fx_horn():
    out = np.zeros(int(0.6 * SR))
    for st, d in [(0.0, 0.13), (0.2, 0.26)]:
        t = tt(d)
        droop = 1 - 0.01 * t / d
        s = saw(np.full(len(t), 349.2) * droop) + saw(np.full(len(t), 440.0) * droop) + 0.6 * square(np.full(len(t), 523.0) * droop)
        s = sos_filter(np.tanh(s * 1.5), 'lowpass', 2600)
        env = np.clip(t / 0.01, 0, 1) * np.clip((d - t) / 0.02, 0, 1)
        i = int(st * SR)
        out[i:i + len(t)] += s * env * 0.4
    return out


def fx_race(dur):
    out = np.zeros(int((dur + 0.1) * SR))
    tk = 0.0
    while tk < dur:
        u = tk / dur
        t = tt(0.03)
        c = np.sin(2 * np.pi * (1200 + 800 * u) * t) * np.exp(-t * 200) * 0.3
        i = int(tk * SR)
        out[i:i + len(t)] += c
        tk += 0.12 - 0.09 * u
    return out


def fx_heartbeat():
    out = np.zeros(int(1.0 * SR))
    for st, v in [(0.0, 1.0), (0.24, 0.7)]:
        k = kick(v, 0.5, low=38)
        k = sos_filter(k, 'lowpass', 300)
        i = int(st * SR)
        out[i:i + len(k)] += k
    return out * 1.2


def fx_stream(dur):
    out = np.zeros((2, int((dur + 0.2) * SR)))
    k = 0
    tk = 0.0
    while tk < dur:
        u = tk / dur
        t = tt(0.018)
        f = RNG.uniform(2200, 6500)
        b = np.sin(2 * np.pi * f * t) * np.exp(-t * 220) * 0.18 * np.sin(np.pi * u) ** 0.5
        p = RNG.uniform(-0.9, 0.9)
        i = int(tk * SR)
        out[:, i:i + len(t)] += pan2(b, p)
        tk += RNG.uniform(0.006, 0.03)
        k += 1
    return out


def fx_fireworks():
    out = np.zeros((2, int(4.0 * SR)))
    bursts = [0.0, 0.26, 0.48, 0.74, 1.01, 1.26, 1.56]
    for j, bt in enumerate(bursts):
        t = tt(1.2)
        boom = np.sin(2 * np.pi * np.cumsum(55 + 80 * np.exp(-t * 20)) / SR) * np.exp(-t * 7) * 0.7
        boom += sos_filter(noise(len(t)), 'lowpass', 1200) * np.exp(-t * 14) * 0.5
        p = RNG.uniform(-0.6, 0.6)
        i = int(bt * SR)
        out[:, i:i + len(t)] += pan2(boom, p) * 0.8
        # crackle
        for c in range(70):
            ct = bt + 0.25 + RNG.exponential(0.45)
            if ct > 3.8:
                continue
            tc = tt(0.006)
            cl = noise(len(tc)) * np.exp(-tc * 900) * RNG.uniform(0.1, 0.35)
            ii = int(ct * SR)
            out[:, ii:ii + len(tc)] += pan2(cl, RNG.uniform(-1, 1))
    return out


def fx_crickets(dur):
    # the universal sound of an awkward silence
    out = np.zeros(int((dur + 0.2) * SR))
    tk = 0.0
    k = 0
    while tk < dur:
        for p_ in range(3):
            t = tt(0.022)
            c = np.sin(2 * np.pi * 4700 * t) * np.sin(np.pi * t / 0.022) ** 2 * 0.22
            i = int((tk + p_ * 0.03) * SR)
            out[i:i + len(t)] += c
        tk += 0.28 + 0.04 * (k % 2)
        k += 1
    return out


def fx_montage(dur):
    # beat-repeat style stutter that accelerates
    out = np.zeros((2, int((dur + 0.4) * SR)))
    tk = 0.0
    while tk < dur:
        u = tk / dur
        step = 0.125 if u < 0.4 else 0.0625 if u < 0.8 else 0.03125
        s = snare(0.5 + 0.4 * u, tune=1 + u * 0.6)
        out[:, int(tk * SR):int(tk * SR) + len(s)] += pan2(s, RNG.uniform(-0.3, 0.3))
        tk += step
    return out


# ─────────────────────────── arrangement ───────────────────────────
CHORDS = {
    'Dm': ([62, 65, 69, 74], 38), 'Bb': ([58, 62, 65, 70], 34), 'F': ([57, 60, 65, 69], 41),
    'C': ([55, 60, 64, 67], 36), 'D': ([62, 66, 69, 74], 38), 'Gm': ([55, 58, 62, 67], 43), 'A': ([57, 61, 64, 69], 45),
}
PROG = ['Dm', 'Bb', 'F', 'C']
KICKS = []  # kick times for sidechain


def groove_bar(t0, chord, dens=1.0, clap_on=True, hats=True, openhats=True, kick_on=True, bass_on=True, saws=True, arp=True, saw_cut=5200, arp_vel=0.8):
    notes, root = CHORDS[chord]
    for b in range(4):
        tb = t0 + b * BEAT
        if kick_on:
            DRUMS.add(tb, kick(1.0))
            KICKS.append(tb)
        if clap_on and b in (1, 3):
            c = clap(0.85)
            DRUMS.add(tb, c)
            VERB.add(tb, c, 0.18)
        if hats:
            for s in range(4):
                v = [0.35, 0.22, 0.75, 0.22][s] * dens
                DRUMS.add(tb + s * 0.125, hat(v), pan=0.25)
        if openhats and dens > 0.5:
            DRUMS.add(tb + 0.25, hat(0.5, True), pan=-0.2)
        if bass_on:
            BASS.add(tb + 0.25, midbass(root + 12, 0.2, 1.0))
    if bass_on:
        BASS.add(t0, sub(root, BAR - 0.02, 0.9))
    if saws:
        # rhythmic supersaw chords (offbeat stabs + sustained)
        MUSIC.add(t0, supersaw(notes, BAR - 0.05, cutoff=saw_cut, d=0.6, s=0.55, r=0.2, vel=0.9))
    if arp:
        pat = [0, 2, 1, 2, 3, 2, 1, 2, 0, 2, 1, 3, 2, 1, 2, 3]
        tones = [notes[0] + 12, notes[1] + 12, notes[2] + 12, notes[3] + 12]
        for s in range(16):
            n = tones[pat[s]]
            p = pluck(n, 0.2, arp_vel * (1.0 if s % 4 == 0 else 0.7))
            MUSIC.add(t0 + s * 0.125, p, 0.55, pan=0.35 if s % 2 else -0.35)
            DLY.add(t0 + s * 0.125, p, 0.25)


def snare_roll(t0, t1, steps, vel0=0.3, vel1=1.0):
    t = t0
    k = 0
    total = t1 - t0
    while t < t1 - 1e-6:
        u = (t - t0) / total
        step = steps[min(int(u * len(steps)), len(steps) - 1)]
        DRUMS.add(t, snare(vel0 + (vel1 - vel0) * u, tune=1 + 0.5 * u), pan=0.1)
        t += step
        k += 1


def arrange():
    # ── 0–4 hook: stabs over a filtered drone ──
    MUSIC.add(0.0, pad([50, 57, 62, 65], 3.9, 0.7, cutoff=700), 0.8)
    for tb in [0.0]:
        KICKS.append(tb)
    # 2.0–3.5 kicks under the ascending stabs
    for tb in [0.5, 1.0, 2.0, 2.5, 3.0, 3.5]:
        KICKS.append(tb)
    # ── 4–8 build ──
    MUSIC.add(4.0, pad([48, 55, 60, 64], 3.8, 0.8, cutoff=900), 0.8)  # C chord, leading
    for k in range(7):
        tb = 4.0 + k * 0.5
        DRUMS.add(tb, kick(0.55 + 0.06 * k, low=44))
        KICKS.append(tb)
    snare_roll(6.0, 7.5, [0.25, 0.125, 0.0625, 0.03125], 0.25, 0.9)
    FX.add(5.0, fx_riser(2.75), 0.8)
    sw = supersaw([60, 64, 67, 72], 1.7, cutoff=1200, a=1.2, d=1.0, s=1.0, r=0.1, vel=0.8)
    MUSIC.add(6.0, sw, 0.8)
    # ── 8–24 drop A ──
    for b in range(8):
        t0 = 8.0 + b * BAR
        groove_bar(t0, PROG[b % 4], dens=1.0 if b >= 1 else 0.8)
    DRUMS.add(8.0, crash(1.0))
    DRUMS.add(16.0, crash(0.7))
    # "AI" vox call-and-response in the second half of each phrase
    VOXPAT = [(0.25, 0), (0.625, 1), (1.0, 2), (1.375, 1), (1.75, 3)]
    for b in [2, 3, 6, 7]:
        t0 = 8.0 + b * BAR
        notes, root = CHORDS[PROG[b % 4]]
        for off, k in VOXPAT:
            v = vox(notes[k] + 12 if k < 3 else notes[k], 0.22, 0.9)
            LEAD.add(t0 + off, v, 0.4, pan=0.15 if k % 2 else -0.15)
            DLY.add(t0 + off, v, 0.25)
            VERB.add(t0 + off, v, 0.2)
    snare_roll(15.5, 16.0, [0.0625], 0.3, 0.7)
    snare_roll(23.0, 24.0, [0.125, 0.0625, 0.03125], 0.3, 0.8)
    # ── 24–32 breakdown ──
    bd = ['Bb', 'C', 'Dm', 'Dm']
    for b in range(4):
        t0 = 24.0 + b * BAR
        notes, root = CHORDS[bd[b]]
        MUSIC.add(t0, pad([n - 12 for n in notes], BAR, 0.95, cutoff=1300), 1.0)
        BASS.add(t0, sub(root, BAR - 0.05, 0.6))
        pat = [0, 1, 2, 3, 2, 1]
        for s in range(8):
            n = notes[pat[s % len(pat)]] + 12
            p = pluck(n, 0.3, 0.5, bright=0.6)
            MUSIC.add(t0 + s * 0.25, p, 0.4, pan=0.4 if s % 2 else -0.4)
            DLY.add(t0 + s * 0.25, p, 0.35)
            VERB.add(t0 + s * 0.25, p, 0.4)
        for s in range(8):
            DRUMS.add(t0 + s * 0.25 + 0.125, hat(0.25), pan=0.3)
    # ── 32–36 build 2 ──
    for b, ch in enumerate(['Bb', 'C']):
        t0 = 32.0 + b * BAR
        notes, root = CHORDS[ch]
        MUSIC.add(t0, supersaw(notes, BAR - 0.05, cutoff=900 + 1800 * b, a=0.3, d=1, s=1, r=0.1, vel=0.8), 0.9)
        BASS.add(t0, sub(root, BAR - 0.05, 0.7))
        for s in range(16):
            n = notes[[0, 1, 2, 3][s % 4]] + 12 + (12 if (s // 4) % 2 and b == 1 else 0)
            p = pluck(n, 0.18, 0.5 + 0.3 * (b * 16 + s) / 32)
            MUSIC.add(t0 + s * 0.125, p, 0.5, pan=0.3 if s % 2 else -0.3)
    for k in range(7):
        tb = 32.0 + k * 0.5
        DRUMS.add(tb, kick(0.9))
        KICKS.append(tb)
    snare_roll(33.0, 35.5, [0.25, 0.125, 0.0625, 0.03125], 0.3, 1.0)
    # ── 36–44 drop B (with the tape-stop gag at 41.0) ──
    drb = ['Dm', 'Bb', 'F', 'C']
    for b in range(4):
        t0 = 36.0 + b * BAR
        groove_bar(t0, drb[b], dens=1.0, saw_cut=6000)
    DRUMS.add(36.0, crash(1.0))
    melody = [
        # (time offset from 36, midi, dur)
        (0.0, 69, 0.2), (0.5, 74, 0.2), (1.0, 77, 0.2), (1.25, 76, 0.2), (1.5, 74, 0.45),
        (2.0, 74, 0.2), (2.5, 77, 0.2), (3.0, 81, 0.2), (3.25, 79, 0.2), (3.5, 77, 0.45),
        (4.0, 72, 0.2), (4.5, 77, 0.2), (5.0, 81, 0.4),
        (6.0, 79, 0.2), (6.5, 76, 0.2), (7.0, 72, 0.2), (7.25, 74, 0.2), (7.5, 76, 0.45),
    ]
    for off, n, d in melody:
        l = lead(n, d, 1.0)
        LEAD.add(36.0 + off, l, 1.0)
        DLY.add(36.0 + off, l, 0.3)
    # ── 44–48 loop ──
    for b, ch in enumerate(['Dm', 'Bb']):
        groove_bar(44.0 + b * BAR, ch, dens=1.0, clap_on=b == 1, saw_cut=4200)
    # ── 48–52 train (half-time, glitchy) ──
    for b, ch in enumerate(['F', 'C']):
        t0 = 48.0 + b * BAR
        notes, root = CHORDS[ch]
        for tb in [t0, t0 + 0.75, t0 + 1.25]:
            DRUMS.add(tb, kick(1.0))
            KICKS.append(tb)
        c = clap(1.0)
        DRUMS.add(t0 + 1.0, c)
        VERB.add(t0 + 1.0, c, 0.25)
        for s in range(8):
            DRUMS.add(t0 + s * 0.25 + 0.125, hat(0.45), pan=0.2)
        BASS.add(t0, sub(root, BAR - 0.05, 0.9))
        BASS.add(t0, midbass(root + 12, 0.7, 1.0))
        BASS.add(t0 + 1.0, midbass(root + 12, 0.7, 1.0))
        MUSIC.add(t0, supersaw(notes, BAR - 0.05, cutoff=3000, d=0.4, s=0.5, vel=0.8))
    # ── 52–56 latest (filtered groove → build) ──
    for b, ch in enumerate(['Bb', 'C']):
        groove_bar(52.0 + b * BAR, ch, dens=0.6, clap_on=b == 1, openhats=False, saw_cut=1800 + 1600 * b, arp_vel=0.6)
    snare_roll(55.0, 55.75, [0.0625, 0.03125], 0.3, 0.9)
    # ── 57–62.6 finale drop ──
    fin = ['Dm', 'Bb', 'F']
    for b in range(3):
        t0 = 57.0 + b * BAR
        groove_bar(t0, fin[b], dens=1.0, saw_cut=6500)
    DRUMS.add(57.0, crash(1.2))
    DRUMS.add(61.0, crash(0.8))
    fmel = [(0.0, 74, 0.2), (0.5, 77, 0.2), (1.0, 81, 0.2), (1.25, 79, 0.2), (1.5, 77, 0.45),
            (2.0, 77, 0.2), (2.5, 81, 0.2), (3.0, 86, 0.45), (3.5, 84, 0.45),
            (4.0, 81, 0.2), (4.5, 84, 0.2), (5.0, 86, 0.6)]
    for b in [1, 2]:
        t0 = 57.0 + b * BAR
        notes, root = CHORDS[fin[b]]
        for off, k in [(0.25, 0), (0.625, 1), (1.0, 2), (1.375, 1)]:
            v = vox(notes[k] + 12, 0.22, 0.8)
            LEAD.add(t0 + off, v, 0.3, pan=0.2)
            DLY.add(t0 + off, v, 0.2)
    for off, n, d in fmel:
        l = lead(n, d, 1.0)
        LEAD.add(57.0 + off, l, 1.0)
        DLY.add(57.0 + off, l, 0.3)
    # 62.6–63.2 held D major chord under the glitch-out (picardy resolution), then the loop tail
    MUSIC.add(62.6, supersaw([50, 57, 62, 66, 69], 1.2, cutoff=2600, a=0.01, d=0.8, s=0.6, r=0.6, vel=0.8), 0.8)
    BASS.add(62.6, sub(38, 1.0, 0.8))


def place_cues():
    for t, typ, p in cues:
        if typ == 'impact':
            sz = p.get('size', 1.0)
            FX.add(t, fx_impact(sz), 0.9)
            DRUMS.add(t, crash(0.9 * min(1.2, sz)))
            VERB.add(t, fx_impact(sz), 0.12)
            KICKS.append(t)
        elif typ == 'hit':
            k, c, st = fx_hit(p.get('note', 50), p.get('soft', 0))
            DRUMS.add(t, k)
            DRUMS.add(t, c)
            MUSIC.add(t, st, 0.9)
            VERB.add(t, c, 0.25)
            KICKS.append(t)
        elif typ == 'stab':
            s = fx_stab(p.get('note', 62), p.get('big', 0))
            MUSIC.add(t, s, 1.0)
            VERB.add(t, s, 0.25)
            DRUMS.add(t, kick(0.9))
            KICKS.append(t)
        elif typ == 'glitch':
            FX.add(t, fx_glitch(p.get('dur', 0.3)), 0.8)
        elif typ == 'drop':
            FX.add(t, fx_drop808(), 0.9)
        elif typ == 'type':
            FX.add(t, fx_type(p['n'], p['dur']), 0.8, pan=0.1)
        elif typ == 'typeaccel':
            FX.add(t, fx_type(p['n'], p['dur'], accel=True), 0.85, pan=0.1)
        elif typ == 'pop':
            s = fx_pop(p['note'])
            FX.add(t, s, 0.8, pan=RNG.uniform(-0.4, 0.4))
            VERB.add(t, s, 0.2)
        elif typ == 'whoosh':
            FX.add(t, fx_whoosh(p['dur'], p.get('up', 0)), 0.75)
        elif typ == 'implode':
            FX.add(t, fx_implode(p['dur']), 0.8)
        elif typ == 'reverse':
            FX.add(t, fx_reverse(p['dur']), 0.8)
        elif typ == 'riser':
            FX.add(t, fx_riser(p['dur']), 0.75)
        elif typ == 'zap':
            FX.add(t, fx_zap(), 0.8, pan=RNG.uniform(-0.3, 0.3))
        elif typ == 'flip':
            FX.add(t, fx_flip(), 0.7, pan=RNG.uniform(-0.3, 0.3))
        elif typ == 'roll':
            # digit-roll tick: quick descending blip pair
            a = fx_blip(p['note'])
            b = fx_blip(p['note'] - 5)
            s2 = np.zeros(len(a) + int(0.03 * SR))
            s2[:len(a)] += a
            s2[int(0.03 * SR):int(0.03 * SR) + len(b)] += b * 0.7
            FX.add(t, s2, 0.8, pan=0.25)
        elif typ == 'tok':
            pp = fx_pop(p['note'])
            ty = fx_type(1, 0.0)
            s2 = np.zeros(max(len(pp), len(ty)))
            s2[:len(pp)] += pp * 0.8
            s2[:len(ty)] += ty * 0.6
            FX.add(t, s2, 0.9, pan=RNG.uniform(-0.2, 0.2))
        elif typ == 'blip':
            FX.add(t, fx_blip(p['note']), 0.7)
        elif typ == 'shimmer':
            s = fx_shimmer(p['dur'])
            FX.add(t, s, 0.5, pan=0.2)
            VERB.add(t, s, 0.5)
        elif typ == 'swoop':
            FX.add(t, fx_swoop(p['dur']), 0.7)
        elif typ == 'eye':
            s, pre = fx_eye()
            FX.add(t - pre, s, 0.8)
            VERB.add(t - pre, s, 0.5)
        elif typ == 'pluck':
            s = pluck(p['note'], 0.4, 0.9)
            FX.add(t, s, 0.7, pan=RNG.uniform(-0.3, 0.3))
            VERB.add(t, s, 0.4)
        elif typ == 'stream':
            FX.add(t, fx_stream(p['dur']), 0.8)
        elif typ == 'race':
            FX.add(t, fx_race(p['dur']), 0.8)
        elif typ == 'ding':
            s = fx_ding()
            FX.add(t, s, 0.8)
            VERB.add(t, s, 0.3)
        elif typ == 'buzz':
            FX.add(t, fx_buzz(), 0.8)
        elif typ == 'horn':
            FX.add(t, fx_horn(), 0.9)
            VERB.add(t, fx_horn(), 0.2)
        elif typ == 'heartbeat':
            FX.add(t, fx_heartbeat(), 1.0)
            FX.add(t + 0.5, fx_heartbeat(), 0.8)
        elif typ == 'fireworks':
            s = fx_fireworks()
            FX.add(t, s, 0.8)
            VERB.add(t, s, 0.2)
        elif typ == 'montage':
            FX.add(t, fx_montage(p['dur']), 0.7)
        elif typ == 'tapestop':
            FX.add(t + 0.42, fx_crickets(0.5), 0.9, pan=0.3)  # music stop itself is applied in mixdown
        else:
            print('unhandled cue', typ)


# ─────────────────────────── mixdown ───────────────────────────
def make_ir(dur=2.4, pre=0.02):
    n = int(dur * SR)
    t = np.arange(n) / SR
    ir = np.zeros((2, n + int(pre * SR)))
    for ch in range(2):
        nz = noise(n)
        # frequency-dependent decay: split into bands with different decay
        lo = sos_filter(nz, 'lowpass', 800) * np.exp(-t * 2.2)
        mid = sos_filter(nz, 'bandpass', [800, 4000]) * np.exp(-t * 3.0)
        hi = sos_filter(nz, 'highpass', 4000) * np.exp(-t * 5.5)
        r = (lo + mid + hi) * (1 - np.exp(-t * 60))
        ir[ch, int(pre * SR):] = r
    # early reflections
    for d, g in [(0.011, 0.5), (0.019, 0.4), (0.027, 0.3), (0.041, 0.25)]:
        ir[0, int(d * SR)] += g
        ir[1, int((d + 0.003) * SR)] += g
    return ir / np.sqrt((ir ** 2).sum() / 2) * 0.5


def sidechain_env(n, depth=0.75, rel=0.16):
    g = np.ones(n)
    t = np.arange(int(0.45 * SR)) / SR
    shape = 1 - depth * np.exp(-t / rel) * np.clip(t / 0.004, 0, 1) ** 0.3
    for k in sorted(set(KICKS)):
        i = int(k * SR)
        m = min(len(shape), n - i)
        if m > 0:
            g[i:i + m] = np.minimum(g[i:i + m], shape[:m])
    return g


def tapestop(x, t0, dur_stop=0.42, silence_until=None):
    """Varispeed slowdown to a halt starting at t0, then silence until `silence_until`."""
    i0 = int(t0 * SR)
    n_out = int(dur_stop * SR)
    # playback rate from 1 → 0 (quadratic), read position = integral
    r = (1 - np.linspace(0, 1, n_out)) ** 1.6
    pos = np.cumsum(r)
    src = i0 + pos
    out = x.copy()
    for ch in range(x.shape[0]):
        out[ch, i0:i0 + n_out] = np.interp(src, np.arange(x.shape[1]), x[ch]) * np.linspace(1, 0.2, n_out)
    j = int((silence_until if silence_until else t0 + dur_stop) * SR)
    out[:, i0 + n_out:j] = 0
    # short fade in at resume
    f = int(0.01 * SR)
    out[:, j:j + f] *= np.linspace(0, 1, f)
    return out


def edit_ep01(mus_all, drums, bass, wet):
    # tape stop on everything tonal + drums at 41.0 (the "can't decide" freeze)
    ts = [c for c in cues if c[1] == 'tapestop']
    for c in ts:
        t0 = c[0]
        mus_all = tapestop(mus_all, t0, 0.45, silence_until=42.0)
        drums = tapestop(drums, t0, 0.45, silence_until=42.0)
        bass = tapestop(bass, t0, 0.45, silence_until=42.0)
        wet = wet * 1.0
    # silence gaps before the drops (music only; FX keep their tails)
    for a, b in [(7.75, 8.0), (35.75, 36.0), (55.8, 57.0)]:
        i, j = int(a * SR), int(b * SR)
        f = int(0.015 * SR)
        for arr in (mus_all, drums, bass):
            arr[:, i:i + f] *= np.linspace(1, 0, f)
            arr[:, i + f:j] = 0
    # glitch-out 62.6–63.2: gate the music in 1/32 chops
    i0, i1 = int(62.6 * SR), int(63.2 * SR)
    gate = np.ones(i1 - i0)
    step = int(0.03125 * SR)
    for k in range(0, i1 - i0, step):
        if RNG.random() < 0.45:
            gate[k:k + step] = 0
    for arr in (mus_all, drums):
        arr[:, i0:i1] *= gate
    # after 63.2 only the loop tail (typing + reverse swell) remains
    for arr in (mus_all, drums, bass):
        j = int(63.2 * SR)
        f = int(0.03 * SR)
        arr[:, j:j + f] *= np.linspace(1, 0, f)
        arr[:, j + f:] = 0
    return mus_all, drums, bass, wet


def tail_ep01(mix):
    # loop tail: reverse swell into t=0 impact
    rv = fx_reverse(0.7)
    s = int((64.0 - 0.7) * SR)
    mix[:, s:s + len(rv)] += pan2(rv) * 0.6
    return mix


def main():
    print('arranging…')
    arrange()
    place_cues()
    mixdown(edit_ep01, tail_ep01, 'mix.wav', 'stems')


def mixdown(edit, tail, out_name, stems_dir, secs=((0, 8), (8, 24), (24, 32), (36, 41), (48, 52), (57, 62)), lufs=-13.2, post=None):
    n = N + PAD
    sc = sidechain_env(n)
    print('effects…')
    # delay (dotted 8th ping-pong)
    dl, dr = _pingpong(DLY.b[0], DLY.b[1], int(0.375 * SR), 0.38, 1.0)
    dly = np.vstack([dl, dr]) - DLY.b  # wet only
    dly = np.vstack([sos_filter(dly[0], 'bandpass', [300, 6000]), sos_filter(dly[1], 'bandpass', [300, 6000])])
    # reverb
    ir = make_ir()
    VERB.b += dly * 0.25
    wet = np.vstack([signal.fftconvolve(VERB.b[0], ir[0])[:n], signal.fftconvolve(VERB.b[1], ir[1])[:n]])
    # buses
    drums = DRUMS.b
    bass = BASS.b * sc
    music = MUSIC.b * (0.35 + 0.65 * sc)
    leadb = LEAD.b * (0.6 + 0.4 * sc)
    fxb = FX.b
    # bus EQ
    bass = np.vstack([sos_filter(bass[c], 'lowpass', 2500) for c in range(2)])
    music = np.vstack([sos_filter(music[c], 'highpass', 150) for c in range(2)])
    leadb = np.vstack([sos_filter(leadb[c], 'highpass', 250) for c in range(2)])
    # widen the harmonic bed (mid/side), keep lead + low end centred
    mid_, side_ = (music[0] + music[1]) / 2, (music[0] - music[1]) / 2
    music = np.vstack([mid_ + side_ * 1.8, mid_ - side_ * 1.8])
    mus_all = music * 1.7 + leadb * 1.5 + dly * 0.8 * (0.5 + 0.5 * sc)
    mus_all, drums, bass, wet = edit(mus_all, drums, bass, wet)
    mix = drums * 0.85 + bass * 1.0 + mus_all * 0.95 + fxb * 0.85 + wet * 0.9
    mix = tail(mix)
    mix = mix[:, :N]
    # ── master ──
    print('mastering…')
    # levels report
    def db(x):
        return 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-12)
    for name, arr in [('drums', drums), ('bass', bass), ('music', mus_all), ('fx', fxb), ('verb', wet)]:
        a = arr[:, :N]
        print(f'  {name:6s}', ' '.join(f'{a0}-{a1}:{db(a[:, int(a0*SR):int(a1*SR)]):6.1f}' for a0, a1 in secs))
    # sub cleanup + glue
    mix = np.vstack([sos_filter(mix[c], 'highpass', 28) for c in range(2)])
    mono = mix.mean(axis=0)
    g = _comp(mono, mono, -16.0, 2.0, 0.012, 0.18, float(SR))
    mix = mix * g
    mud = np.vstack([sos_filter(mix[c], 'bandpass', [180, 400]) for c in range(2)])
    mix = mix - mud * 0.2
    b, a = shelf(6000, -7.5)
    mix = np.vstack([signal.lfilter(b, a, mix[c]) for c in range(2)])
    b, a = shelf(12000, -4.0)
    mix = np.vstack([signal.lfilter(b, a, mix[c]) for c in range(2)])
    # loudness target (~-14 LUFS) via pre-gain, then lookahead limiter to -1 dBFS
    from scipy.io import wavfile
    tmp = os.path.join(HERE, '_pre.wav')
    wavfile.write(tmp, SR, (mix / (np.max(np.abs(mix)) + 1e-9) * 0.5).T.astype(np.float32))
    import subprocess, re as _re
    r = subprocess.run(['ffmpeg', '-hide_banner', '-i', tmp, '-af', 'ebur128', '-f', 'null', '-'], capture_output=True, text=True).stderr
    I = float(_re.findall(r'I:\s+(-?[\d.]+) LUFS', r)[-1])
    os.remove(tmp)
    mix = mix / (np.max(np.abs(mix)) + 1e-9) * 0.5 * 10 ** ((lufs - I) / 20)
    from scipy import ndimage
    # true-peak aware: detect peaks on a 4x oversampled copy
    up = signal.resample_poly(mix, 4, 1, axis=1)
    peak = np.max(np.abs(up).reshape(2, -1, 4).max(axis=2), axis=0)[: mix.shape[1]]
    need = np.minimum(1.0, 0.88 / np.maximum(peak, 1e-9))
    Lw = int(0.003 * SR)
    g1 = ndimage.minimum_filter1d(need, size=Lw, origin=-(Lw // 2))
    g2 = ndimage.uniform_filter1d(g1, size=Lw, origin=(Lw - 1) // 2)
    gl = _release(g2, float(np.exp(-1.0 / (0.08 * SR))))
    mix = mix * gl
    print('  limiter max GR dB', float(20 * np.log10(gl.min() + 1e-9)))
    if post:
        mix = post(mix)
    out = os.path.join(HERE, out_name)
    wavfile.write(out, SR, np.clip(mix, -1, 1).T.astype(np.float32))
    # stems for inspection
    os.makedirs(os.path.join(HERE, stems_dir), exist_ok=True)
    for name, arr in [('drums', drums), ('bass', bass), ('music', mus_all), ('fx', fxb), ('verb', wet)]:
        a = arr[:, :N]
        m = np.max(np.abs(a)) + 1e-9
        wavfile.write(os.path.join(HERE, stems_dir, name + '.wav'), SR, (a / m * 0.9).T.astype(np.float32))
    print('wrote', out, 'peak', float(np.max(np.abs(mix))))


if __name__ == '__main__':
    main()

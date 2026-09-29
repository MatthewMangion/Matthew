"""
ep02.py — score + sound design for EP02 "7 Qwiel tan-Nanna" (reuses the instruments and master chain in synth.py).
Mediterranean folk-tronica: Andalusian cadence Dm–C–B♭–A (one cycle per proverb), Karplus-Strong nylon guitar,
a żaqq-like reed lead over a drone, tanbur (frame drum) maqsum, modern kick/clap/sub underneath.

    node -e "..."  (export cues, see README)  →  python3 audio/ep02.py  →  audio/mix-ep02.wav
"""
import json, os, sys
import numpy as np
from numba import njit

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import synth as S  # noqa: E402

SR = S.SR
cues = json.load(open(os.path.join(HERE, 'cues-ep02.json')))['CUES']
RNG = np.random.default_rng(2002)
mtof, tt, sos, svf, adsr, pan2 = S.mtof, S.tt, S.sos_filter, S.svf, S.adsr, S.pan2
DRUMS, BASS, MUSIC, LEAD, FX, VERB, DLY, KICKS = S.DRUMS, S.BASS, S.MUSIC, S.LEAD, S.FX, S.VERB, S.DLY, S.KICKS


# ─────────────────────────── instruments ───────────────────────────
@njit(cache=True)
def _ks(exc, P, damp):
    # Karplus-Strong with a fractional delay; the 2-tap average adds half a sample, so the loop delay is exactly P
    n = exc.shape[0]
    y = np.zeros(n)
    D = P - 0.5
    Di = int(D)
    fr = D - Di
    for i in range(n):
        j0 = i - Di
        a = y[j0] if j0 >= 0 else 0.0
        b = y[j0 - 1] if j0 - 1 >= 0 else 0.0
        c = y[j0 - 2] if j0 - 2 >= 0 else 0.0
        d0 = a * (1.0 - fr) + b * fr
        d1 = b * (1.0 - fr) + c * fr
        y[i] = exc[i] + damp * 0.5 * (d0 + d1)
    return y


def gtr(note, dur=1.2, vel=0.8, bright=0.55, damp=0.9965):
    n = int((dur + 0.05) * SR)
    f = mtof(note)
    P = SR / f
    exc = np.zeros(n)
    L = int(P * 1.2)
    burst = RNG.standard_normal(L)
    burst = sos(burst, 'lowpass', 900 + 6000 * bright)
    # pick position comb (≈ 1/7 of the string)
    k = max(1, int(P / 7))
    burst[k:] -= burst[:-k] * 0.8
    exc[:L] = burst * vel
    y = _ks(exc, P, damp)
    y = sos(y, 'lowpass', 5200)
    y += sos(y, 'bandpass', [90, 260]) * 0.35  # body
    fade = np.clip((dur + 0.05 - np.arange(n) / SR) / 0.05, 0, 1)
    return y * fade * 0.55


def strum(notes, dur=1.2, vel=0.7, up=False, spread=0.012, bright=0.5):
    order = notes[::-1] if up else notes
    n = int((dur + 0.4) * SR)
    L = np.zeros(n)
    R = np.zeros(n)
    for i, nt in enumerate(order):
        g = gtr(nt, dur, vel * (0.85 + 0.3 * RNG.random()), bright)
        o = int(i * spread * SR)
        p = (i / max(1, len(order) - 1) - 0.5) * 0.6
        m = min(len(g), n - o)
        L[o:o + m] += g[:m] * np.cos((p + 1) * np.pi / 4)
        R[o:o + m] += g[:m] * np.sin((p + 1) * np.pi / 4)
    return np.vstack([L, R]) * np.sqrt(2)


def reed(note, dur, vel=1.0, vib=1.0):
    """żaqq-like nasal reed: narrow pulse through three formants + breath"""
    n = int((dur + 0.12) * SR)
    t = np.arange(n) / SR
    v = 1 + 0.0065 * vib * np.sin(2 * np.pi * 5.3 * t) * np.clip((t - 0.1) / 0.25, 0, 1)
    f = mtof(note) * v
    src = S.square(f, 0.17)
    y = svf(src, 620, 2.6, 'bp') * 0.55 + svf(src, 1180, 4.5, 'bp') * 0.9 + svf(src, 2550, 6.0, 'bp') * 0.45
    y += svf(RNG.standard_normal(n), 2600, 1.8, 'bp') * 0.035
    env = adsr(n, 0.025, 0.12, 0.85, 0.07, dur)
    return np.tanh(y * 2.2) * env * vel * 0.3


def drone(notes, dur, vel=1.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    y = np.zeros(n)
    for nt in notes:
        y += reed(nt, dur - 0.12, 1.0, vib=0.2)[:n]
    swell = 0.75 + 0.25 * np.sin(2 * np.pi * 0.25 * t)
    fade = np.clip(t / 0.4, 0, 1) * np.clip((dur - t) / 0.4, 0, 1)
    return y * swell * fade * vel * 0.5


def dum(vel=1.0):
    t = tt(0.45)
    f = 58 + 45 * np.exp(-t * 18)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7)
    skin = sos(RNG.standard_normal(len(t)), 'lowpass', 500) * np.exp(-t * 40) * 0.5
    return np.tanh((body + skin) * 1.4) * vel * 0.7


def tek(vel=1.0):
    t = tt(0.08)
    nz = sos(RNG.standard_normal(len(t)), 'bandpass', [2400, 6500]) * np.exp(-t * 90)
    tone = np.sin(2 * np.pi * 820 * t) * np.exp(-t * 110) * 0.5
    return (nz + tone) * vel * 0.55


def wood(note, vel=1.0):
    """marimba-ish knock for proverb words"""
    t = tt(0.5)
    f = mtof(note)
    y = np.sin(2 * np.pi * f * t) * np.exp(-t * 9) + 0.35 * np.sin(2 * np.pi * f * 3.99 * t) * np.exp(-t * 26) + 0.15 * np.sin(2 * np.pi * f * 9.2 * t) * np.exp(-t * 60)
    return y * vel * 0.32


# ─────────────────────────── sound design ───────────────────────────
def clack(freq, vel=1.0):
    t = tt(0.06)
    ping = np.sin(2 * np.pi * freq * t) * np.exp(-t * 160) + 0.5 * np.sin(2 * np.pi * freq * 2.71 * t) * np.exp(-t * 230)
    nz = sos(RNG.standard_normal(len(t)), 'bandpass', [1800, 7000]) * np.exp(-t * 300) * 0.6
    return (ping * 0.6 + nz) * vel * 0.4


def fx_flips(dur):
    """cascade of ceramic tile clacks sweeping across the frame"""
    out = np.zeros((2, int((dur + 0.2) * SR)))
    k = 0
    t0 = 0.0
    while t0 < dur:
        c = clack(RNG.uniform(2300, 4200), RNG.uniform(0.55, 1.0))
        p = -0.9 + 1.8 * (t0 / dur)
        i = int(t0 * SR)
        out[:, i:i + c.shape[0]] += pan2(c, p)
        t0 += RNG.uniform(0.018, 0.034)
        k += 1
    w = S.fx_whoosh(dur, up=False) * 0.35
    out[:, :w.shape[1]] += w
    return out


def fx_numeral(n):
    """countdown thump: pitch climbs as the numbers fall (7 → 1)"""
    note = 38 + (7 - n) * 2
    t = tt(0.8)
    f = mtof(note + 12) * (1 + 1.5 * np.exp(-t * 30))
    tom = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 5)
    bellv = S.bell(note + 36, 1.2, 0.5, ratio=2.0)
    y = np.zeros(max(len(tom), len(bellv)))
    y[:len(tom)] += np.tanh(tom * 1.5) * 0.7
    y[:len(bellv)] += bellv * 0.5
    return y


def fx_kicker():
    a, b = S.fx_blip(81), S.fx_blip(88)
    y = np.zeros(len(a) + int(0.08 * SR))
    y[:len(a)] += a
    y[int(0.08 * SR):int(0.08 * SR) + len(b)] += b
    return y * 1.4


def fx_plip(note):
    t = tt(0.18)
    f0 = mtof(note) * 0.35
    f = f0 * np.exp(np.minimum(t, 0.03) / 0.03 * np.log(3.2))
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 38)
    return y * 0.5


def fx_stream(dur):
    out = np.zeros((2, int((dur + 0.3) * SR)))
    t0 = 0.0
    while t0 < dur:
        u = t0 / dur
        p = fx_plip(RNG.integers(76, 96)) * (0.5 + 0.4 * RNG.random())
        i = int(t0 * SR)
        out[:, i:i + len(p)] += pan2(p, RNG.uniform(-0.5, 0.5))
        t0 += 0.11 * (1 - u) + 0.018
    # rising water: filtered noise swelling
    n = int(dur * SR)
    tn = np.arange(n) / SR
    wash = svf(RNG.standard_normal(n), 400 + 1400 * tn / dur, 1.2, 'bp') * (tn / dur) ** 1.5 * 0.25
    out[:, :n] += pan2(wash)
    return out


def fx_ping(note):
    return S.bell(note, 1.1, 0.7, ratio=3.01)


def fx_tick(note):
    t = tt(0.07)
    y = np.sin(2 * np.pi * mtof(note) * t) * np.exp(-t * 70) + sos(RNG.standard_normal(len(t)), 'highpass', 3000) * np.exp(-t * 200) * 0.3
    return y * 0.4


def fx_clunk():
    t = tt(0.35)
    thud = np.sin(2 * np.pi * np.cumsum(110 + 90 * np.exp(-t * 40)) / SR) * np.exp(-t * 14)
    metal = sum(np.sin(2 * np.pi * f * t) * np.exp(-t * d) for f, d in [(1270, 22), (2141, 30), (3380, 40)]) * 0.18
    return (thud * 0.7 + metal) * 0.8


def fx_swish():
    n = int(0.35 * SR)
    t = np.arange(n) / SR
    u = t / 0.35
    y = svf(RNG.standard_normal(n), 900 + 5000 * u, 1.4, 'bp') * np.sin(np.pi * u) ** 1.2
    return y * 0.55


def fx_drain(dur):
    t = tt(dur)
    f = 900 * (0.22 ** (t / dur))
    y = S.square(f, 0.5) * np.exp(-t * 1.5)
    return sos(y, 'lowpass', 3000) * 0.25


def fx_poof():
    t = tt(0.5)
    nz = sos(RNG.standard_normal(len(t)), 'bandpass', [300, 2500]) * np.exp(-t * 12)
    pop = np.sin(2 * np.pi * np.cumsum(300 * np.exp(-t * 8)) / SR) * np.exp(-t * 25)
    return (nz * 0.5 + pop * 0.5) * 0.9


def fx_send():
    w = S.fx_whoosh(0.4, up=True)
    b = S.fx_blip(84)
    w[:, :len(b)] += pan2(b) * 0.8
    return w


def fx_glint():
    out = np.zeros(int(0.9 * SR))
    for k, nt in enumerate([88, 93, 96, 100]):
        b = S.bell(nt, 0.7, 0.35, ratio=2.0)
        i = int(k * 0.05 * SR)
        m = min(len(b), len(out) - i)
        out[i:i + m] += b[:m]
    return out


def fx_zoom():
    w = S.fx_whoosh(0.5, up=False) * 1.1
    t = tt(0.3)
    squeak = np.sin(2 * np.pi * np.cumsum(1400 + 900 * np.sin(np.pi * t / 0.3)) / SR) * np.sin(np.pi * t / 0.3) * 0.12
    w[:, int(0.15 * SR):int(0.15 * SR) + len(squeak)] += pan2(squeak, 0.3)
    return w


# ─────────────────────────── arrangement ───────────────────────────
CH = {
    'Dm': (50, [62, 65, 69], [50, 57, 62, 65, 69, 74]),
    'C': (48, [60, 64, 67], [48, 55, 60, 64, 67, 72]),
    'Bb': (46, [58, 62, 65], [46, 53, 58, 62, 65, 70]),
    'A': (45, [57, 61, 64], [45, 52, 57, 61, 64, 69]),
}
CYCLE = ['Dm', 'C', 'Bb', 'A']
MAQSUM = {0: 'D', 2: 'T', 6: 'T', 8: 'D', 12: 'T', 14: 't'}


def perc_bar(t0, vel=1.0, ghost=True):
    for st, kind in MAQSUM.items():
        if kind == 't' and not ghost:
            continue
        tb = t0 + st * 0.125
        if kind == 'D':
            DRUMS.add(tb, dum(vel), pan=-0.1)
        else:
            DRUMS.add(tb, tek(vel * (0.55 if kind == 't' else 1.0)), pan=0.25)


def beat_bar(t0, kick=True, clap=True, hats=True, half=False, vel=1.0):
    for b in range(4):
        tb = t0 + b * 0.5
        if kick and (not half or b in (0, 2)):
            DRUMS.add(tb, S.kick(0.95 * vel))
            KICKS.append(tb)
        if clap and ((b == 2) if half else (b in (1, 3))):
            c = S.clap(0.8 * vel)
            DRUMS.add(tb, c)
            VERB.add(tb, c, 0.2)
        if hats:
            for s in range(2):
                DRUMS.add(tb + 0.25 * s + 0.25, S.hat(0.5 * vel), pan=0.3)


def bass_bar(t0, root, style='sub', vel=1.0):
    if style == 'sub':
        BASS.add(t0, S.sub(root - 12 if root > 47 else root, 1.95, 0.9 * vel))
    else:
        BASS.add(t0, S.sub(root - 12 if root > 47 else root, 1.95, 0.75 * vel))
        for s in [0.5, 1.0, 1.5, 1.75]:
            BASS.add(t0 + s, S.midbass(root, 0.2, 0.9 * vel))


def arp_bar(t0, chord, vel=0.6, bright=0.5, pattern=(0, 2, 1, 2, 3, 2, 1, 2, 0, 2, 1, 2, 3, 2, 4, 2)):
    root, tri, six = CH[chord]
    tones = [six[1], six[2], six[3], six[4], six[5]]
    for s, k in enumerate(pattern):
        g = gtr(tones[k] if k < len(tones) else tones[-1], 0.5, vel * (1.0 if s % 4 == 0 else 0.7), bright)
        MUSIC.add(t0 + s * 0.125, g, 0.6, pan=0.3 if s % 2 else -0.3)
        if s % 4 == 0:
            DLY.add(t0 + s * 0.125, g, 0.2)


def strum_bar(t0, chord, vel=0.7, pattern=((0.0, 0), (0.75, 1), (1.0, 0), (1.5, 1), (1.75, 1))):
    root, tri, six = CH[chord]
    for off, up in pattern:
        st = strum(six, 0.9 if not up else 0.5, vel * (1.0 if not up else 0.7), up=bool(up), bright=0.45)
        MUSIC.add(t0 + off, st, 0.42)
        VERB.add(t0 + off, st, 0.12)


def pad_bar(t0, chord, vel=0.6, cutoff=1400):
    root, tri, six = CH[chord]
    MUSIC.add(t0, S.pad([n - 12 for n in tri], 1.95, vel, cutoff=cutoff), 0.8)


def segment(T, groove):
    for b, ch in enumerate(CYCLE):
        groove(T + b * 2.0, ch, b)


def arrange():
    # hook 0–4: drone, strums on the beat, cue hits on top
    MUSIC.add(0.0, drone([38, 45], 4.0, 0.8), 0.4)
    for t0, ch in [(0.0, 'Dm'), (2.0, 'A')]:
        strum_bar(t0, ch, 0.75, pattern=((0.0, 0), (0.5, 1), (1.0, 0), (1.5, 1)))
        BASS.add(t0, S.sub(CH[ch][0] - 12 if CH[ch][0] > 47 else CH[ch][0], 1.95, 0.8))
    rv = S.fx_reverse(0.75)
    FX.add(3.25, rv, 0.5)

    # #7 (4–12): intro groove — arps, maqsum, half-time kick, sub
    def g7(t0, ch, b):
        arp_bar(t0, ch, 0.5 + b * 0.05, 0.45)
        perc_bar(t0, 0.8, ghost=b >= 2)
        beat_bar(t0, kick=True, clap=b >= 2, hats=b == 3, half=True, vel=0.85)
        bass_bar(t0, CH[ch][0], 'sub', 0.9)
    segment(4.0, g7)
    MUSIC.add(4.0, drone([38], 8.0, 0.5), 0.3)

    # #6 (12–20): full groove, curious pad
    def g6(t0, ch, b):
        arp_bar(t0, ch, 0.55, 0.5)
        perc_bar(t0, 0.85)
        beat_bar(t0, vel=0.95)
        bass_bar(t0, CH[ch][0], 'bounce')
        pad_bar(t0, ch, 0.5, cutoff=900 + b * 250)
    segment(12.0, g6)

    # #5 (20–28): full + pizzicato answers
    def g5(t0, ch, b):
        arp_bar(t0, ch, 0.5, 0.55)
        perc_bar(t0, 0.9)
        beat_bar(t0)
        bass_bar(t0, CH[ch][0], 'bounce')
        root, tri, six = CH[ch]
        for k, s in enumerate([0.75, 1.25, 1.75]):
            p = S.pluck(tri[k % 3] + 12, 0.18, 0.55)
            MUSIC.add(t0 + s, p, 0.5, pan=0.5 if k % 2 else -0.5)
            DLY.add(t0 + s, p, 0.3)
    segment(20.0, g5)

    # #4 (28–36): working rhythm — strums, clave
    def g4(t0, ch, b):
        strum_bar(t0, ch, 0.65)
        perc_bar(t0, 0.9)
        beat_bar(t0)
        bass_bar(t0, CH[ch][0], 'bounce')
        for s in [0.0, 0.375, 0.75, 1.25, 1.5]:
            DRUMS.add(t0 + s, fx_tick(84) * 1.4, pan=-0.4)
    segment(28.0, g4)

    # #3 (36–44): sunny breakdown — no kick, strums, claps, maqsum
    def g3(t0, ch, b):
        strum_bar(t0, ch, 0.6, pattern=((0.0, 0), (0.5, 1), (1.0, 0), (1.25, 1), (1.5, 0), (1.75, 1)))
        perc_bar(t0, 0.9)
        beat_bar(t0, kick=False, clap=True, hats=True, vel=0.8)
        BASS.add(t0, S.sub(CH[ch][0] - 12 if CH[ch][0] > 47 else CH[ch][0], 1.95, 0.55))
        pad_bar(t0, ch, 0.45, cutoff=1800)
    segment(36.0, g3)

    # #2 (44–52): tension → stamp at 49.1 → half-time
    def g2(t0, ch, b):
        if t0 < 48.0:
            arp_bar(t0, ch, 0.45, 0.35)
            perc_bar(t0, 0.8)
            beat_bar(t0, clap=False, hats=b == 1, vel=0.9)
            bass_bar(t0, CH[ch][0], 'sub')
        else:
            beat_bar(t0, half=True, vel=1.0) if t0 >= 50.0 else None
            bass_bar(t0, CH[ch][0], 'sub', 1.0)
            if t0 >= 50.0:
                strum_bar(t0, ch, 0.7, pattern=((0.0, 0), (1.0, 0), (1.5, 1)))
                perc_bar(t0, 1.0)
    segment(44.0, g2)
    FX.add(48.0, S.fx_riser(1.1), 0.38)
    S.snare_roll(48.3, 48.9, [0.0625, 0.03125], 0.2, 0.6)
    # after the stamp: half-time from 49.1
    for tb in [49.1, 49.6]:
        DRUMS.add(tb, S.kick(1.0))
        KICKS.append(tb)

    # #1 (52–60): finale — everything + reed melody
    def g1(t0, ch, b):
        strum_bar(t0, ch, 0.7)
        arp_bar(t0, ch, 0.4, 0.6)
        perc_bar(t0, 1.0)
        beat_bar(t0, vel=1.0)
        bass_bar(t0, CH[ch][0], 'bounce', 1.15)
        pad_bar(t0, ch, 0.5, cutoff=2000)
    segment(52.0, g1)
    DRUMS.add(52.0, S.crash(1.0))
    MEL = [(0.0, 69, 0.45), (0.5, 74, 0.45), (1.0, 77, 0.2), (1.25, 76, 0.2), (1.5, 74, 0.45),
           (2.0, 76, 0.45), (2.5, 79, 0.45), (3.0, 77, 0.2), (3.25, 76, 0.2), (3.5, 72, 0.45),
           (4.0, 74, 0.45), (4.5, 77, 0.45), (5.0, 76, 0.2), (5.25, 74, 0.2), (5.5, 70, 0.45),
           (6.0, 73, 0.9), (7.0, 76, 0.2), (7.25, 74, 0.2), (7.5, 73, 0.45)]
    for off, nt, d in MEL:
        r = reed(nt, d, 1.0)
        LEAD.add(52.0 + off, r, 0.6)
        DLY.add(52.0 + off, r, 0.25)
        VERB.add(52.0 + off, r, 0.15)
    MUSIC.add(52.0, drone([38, 45], 8.0, 0.7), 0.3)

    # outro (60–64): strums + drone, resolves on A → loops to Dm at 0
    MUSIC.add(60.0, drone([38, 45], 3.2, 0.7), 0.4)
    strum_bar(60.0, 'Dm', 0.7, pattern=((0.0, 0), (0.5, 1), (1.0, 0), (1.5, 1)))
    strum_bar(62.0, 'A', 0.7, pattern=((0.0, 0), (0.5, 1), (1.0, 0)))
    for t0, ch in [(60.0, 'Dm'), (62.0, 'A')]:
        perc_bar(t0, 0.7, ghost=False)
        BASS.add(t0, S.sub(CH[ch][0] - 12 if CH[ch][0] > 47 else CH[ch][0], 1.2 if t0 == 62.0 else 1.95, 0.7))
    DRUMS.add(60.0, S.kick(1.0))
    KICKS.append(60.0)


WORD_NOTES = [62, 65, 69, 74]


def place_cues():
    for t, typ, p in cues:
        if typ == 'impact':
            sz = p.get('size', 1.0)
            FX.add(t, S.fx_impact(sz), 0.8)
            DRUMS.add(t, S.crash(0.7 * min(1.2, sz)))
            KICKS.append(t)
        elif typ == 'hit':
            k, c, st = S.fx_hit(p.get('note', 50), p.get('soft', 0))
            DRUMS.add(t, k)
            DRUMS.add(t, c)
            MUSIC.add(t, st, 0.8)
            KICKS.append(t)
        elif typ == 'stab':
            s = S.fx_stab(p.get('note', 62), p.get('big', 0))
            MUSIC.add(t, s, 0.9)
            VERB.add(t, s, 0.25)
            DRUMS.add(t, S.kick(0.9))
            KICKS.append(t)
        elif typ == 'glitch':
            FX.add(t, S.fx_glitch(p.get('dur', 0.25)), 0.7)
        elif typ == 'glint':
            FX.add(t, fx_glint(), 0.8, pan=0.2)
        elif typ == 'pop':
            s = S.fx_pop(p['note'])
            FX.add(t, s, 0.8, pan=RNG.uniform(-0.4, 0.4))
            VERB.add(t, s, 0.2)
        elif typ == 'whoosh':
            FX.add(t, S.fx_whoosh(p['dur'], p.get('up', 0)), 0.7)
        elif typ == 'flips':
            FX.add(t, fx_flips(p['dur']), 0.6)
        elif typ == 'numeral':
            s = fx_numeral(p['n'])
            FX.add(t, s, 0.9)
            VERB.add(t, s, 0.3)
        elif typ == 'word':
            w = wood(WORD_NOTES[p['i'] % 4] + 12, 0.9)
            FX.add(t, w, 0.8, pan=(p['i'] - 1.5) * 0.2)
            VERB.add(t, w, 0.3)
        elif typ == 'kicker':
            FX.add(t, fx_kicker(), 0.8)
        elif typ == 'plip':
            s = fx_plip(p['note'])
            FX.add(t, s, 1.0, pan=RNG.uniform(-0.2, 0.2))
            VERB.add(t, s, 0.3)
        elif typ == 'stream':
            FX.add(t, fx_stream(p['dur']), 0.9)
        elif typ == 'shimmer':
            s = S.fx_shimmer(p['dur'])
            FX.add(t, s, 0.35 if p.get('soft') else 0.5, pan=0.2)
            VERB.add(t, s, 0.4)
        elif typ == 'ping':
            s = fx_ping(p['note'])
            FX.add(t, s, 0.7, pan=RNG.uniform(-0.3, 0.3))
            VERB.add(t, s, 0.35)
        elif typ == 'zoom':
            FX.add(t, fx_zoom(), 0.8)
        elif typ == 'type':
            FX.add(t, S.fx_type(p['n'], p['dur']), 0.75, pan=0.1)
        elif typ == 'blip':
            FX.add(t, S.fx_blip(p['note']), 0.8)
        elif typ == 'buzz':
            FX.add(t, S.fx_buzz(), 0.75)
        elif typ == 'tick':
            FX.add(t, fx_tick(p['note']), 0.9, pan=RNG.uniform(-0.3, 0.3))
        elif typ == 'ding':
            s = S.fx_ding()
            FX.add(t, s, 0.7)
            VERB.add(t, s, 0.3)
        elif typ == 'clunk':
            FX.add(t, fx_clunk(), 0.8)
        elif typ == 'swish':
            FX.add(t, fx_swish(), 0.8, pan=RNG.uniform(-0.4, 0.4))
        elif typ == 'drain':
            FX.add(t, fx_drain(p['dur']), 0.8)
        elif typ == 'poof':
            FX.add(t, fx_poof(), 0.9, pan=RNG.uniform(-0.5, 0.5))
        elif typ == 'send':
            FX.add(t, fx_send(), 0.8)
        elif typ == 'riser':
            FX.add(t, S.fx_riser(p['dur']), 0.7)
        elif typ == 'reverse':
            FX.add(t, S.fx_reverse(p['dur']), 0.6)
        else:
            print('unhandled cue', typ)


def edit_ep02(mus_all, drums, bass, wet):
    SRf = SR
    # air before the stamp and before the finale downbeat
    for a, b in [(48.9, 49.1)]:
        i, j = int(a * SRf), int(b * SRf)
        f = int(0.012 * SRf)
        for arr in (mus_all, drums, bass):
            arr[:, i:i + f] *= np.linspace(1, 0, f)
            arr[:, i + f:j] = 0
    # after 63.2 only FX and the loop swell remain
    for arr in (mus_all, drums, bass):
        j = int(63.2 * SRf)
        f = int(0.05 * SRf)
        arr[:, j:j + f] *= np.linspace(1, 0, f)
        arr[:, j + f:] = 0
    return mus_all, drums, bass, wet


def tail_ep02(mix):
    rv = S.fx_reverse(0.7)
    s = int((64.0 - 0.7) * SR)
    mix[:, s:s + len(rv)] += pan2(rv) * 0.55
    return mix


def start_dip(mix):
    # a full-level hit at sample 0 makes the AAC encoder's first frame overshoot by ~3 dB (+1.7 dBTP after
    # decoding); a 60 ms raised-cosine dip of 3 dB after the limiter keeps the encoded file under -1 dBTP
    n = int(0.06 * SR)
    mix[:, :n] *= 10 ** (-3 * (0.5 + 0.5 * np.cos(np.linspace(0, np.pi, n))) / 20)
    return mix


if __name__ == '__main__':
    print('arranging EP02…')
    arrange()
    place_cues()
    S.mixdown(edit_ep02, tail_ep02, 'mix-ep02.wav', 'stems-ep02', secs=((0, 4), (4, 12), (12, 28), (36, 44), (44, 49), (52, 60)), post=start_dip)

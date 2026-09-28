/* ==========================================================================
   Motion engine: deterministic, time-based 2D renderer for canvas.
   Every frame is a pure function of time, so the same code drives the live
   preview and the frame-accurate offline render.
   ========================================================================== */
(function (G) {
  'use strict';

  const W = 1080, H = 1920, TAU = Math.PI * 2;
  const BPM = 120, BEAT = 60 / BPM;

  /* ---------- palette ---------- */
  const C = {
    cream: '#F4EDE1', cream2: '#EADFCB', paper: '#FFFBF4',
    ink: '#15120F', ink2: '#2A2520',
    tomato: '#FF4D2E', cobalt: '#2E4BFF', cobaltD: '#1B2FB8',
    sun: '#FFC53D', mint: '#16C79A', mintD: '#0E9E7A', pink: '#FF8FB8',
    lilac: '#B7A6FF', night: '#0C0B1A', night2: '#17153A', white: '#FFFFFF',
    gold: '#FFB800', skin1: '#F2C9A5', skin2: '#C98E62', skin3: '#8D5A3B',
  };

  /* ---------- math ---------- */
  const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
  const lerp = (a, b, t) => a + (b - a) * t;
  const inv = (a, b, x) => clamp((x - a) / (b - a));
  const smooth = (t) => t * t * (3 - 2 * t);
  const fract = (x) => x - Math.floor(x);

  /* ---------- easing ---------- */
  const Ease = {
    linear: (t) => t,
    inQuad: (t) => t * t,
    outQuad: (t) => 1 - (1 - t) * (1 - t),
    inOutQuad: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
    inCubic: (t) => t * t * t,
    outCubic: (t) => 1 - Math.pow(1 - t, 3),
    inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    inQuart: (t) => t * t * t * t,
    outQuart: (t) => 1 - Math.pow(1 - t, 4),
    inOutQuart: (t) => (t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2),
    outQuint: (t) => 1 - Math.pow(1 - t, 5),
    inOutQuint: (t) => (t < 0.5 ? 16 * Math.pow(t, 5) : 1 - Math.pow(-2 * t + 2, 5) / 2),
    inExpo: (t) => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10)),
    outExpo: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
    inOutExpo: (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2),
    outBack: (t) => { const s = 1.70158, u = t - 1; return 1 + (s + 1) * u * u * u + s * u * u; },
    outBackBig: (t) => { const s = 2.8, u = t - 1; return 1 + (s + 1) * u * u * u + s * u * u; },
    inBack: (t) => { const s = 1.70158; return (s + 1) * t * t * t - s * t * t; },
    inOutBack: (t) => {
      const s = 1.70158 * 1.525;
      return t < 0.5 ? (Math.pow(2 * t, 2) * ((s + 1) * 2 * t - s)) / 2 : (Math.pow(2 * t - 2, 2) * ((s + 1) * (t * 2 - 2) + s) + 2) / 2;
    },
    outElastic: (t) => (t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1),
    outBounce: (t) => {
      const n = 7.5625, d = 2.75;
      if (t < 1 / d) return n * t * t;
      if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
      if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
      return n * (t -= 2.625 / d) * t + 0.984375;
    },
  };

  /* cubic-bezier easing (the curve editor every motion designer lives in) */
  function bezier(x1, y1, x2, y2) {
    const N = 256, lut = new Float32Array(N + 1);
    const bx = (t) => 3 * x1 * t * (1 - t) * (1 - t) + 3 * x2 * t * t * (1 - t) + t * t * t;
    const by = (t) => 3 * y1 * t * (1 - t) * (1 - t) + 3 * y2 * t * t * (1 - t) + t * t * t;
    // build x -> t lookup by bisection
    for (let i = 0; i <= N; i++) {
      const x = i / N; let lo = 0, hi = 1;
      for (let k = 0; k < 30; k++) { const m = (lo + hi) / 2; if (bx(m) < x) lo = m; else hi = m; }
      lut[i] = by((lo + hi) / 2);
    }
    return (x) => {
      if (x <= 0) return 0; if (x >= 1) return 1;
      const f = x * N, i = Math.floor(f), r = f - i;
      return lut[i] + (lut[i + 1] - lut[i]) * r;
    };
  }
  Ease.snap = bezier(0.16, 1, 0.3, 1);     // fast out, silky settle
  Ease.swift = bezier(0.65, 0, 0.35, 1);   // strong in-out
  Ease.whip = bezier(0.7, 0, 0.84, 0);     // accelerate hard (into cuts)
  Ease.soft = bezier(0.25, 0.1, 0.25, 1);

  /* damped spring, closed form. f = frequency (Hz), z = damping ratio */
  function spring(t, f = 2.2, z = 0.42) {
    if (t <= 0) return 0;
    const w = TAU * f, wd = w * Math.sqrt(1 - z * z);
    return 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + ((z * w) / wd) * Math.sin(wd * t));
  }
  /* decaying wobble: 0 -> 0, oscillates in between (for jiggles & reactions) */
  function wobble(t, f = 3, decay = 5) { return t <= 0 ? 0 : Math.sin(TAU * f * t) * Math.exp(-decay * t); }

  /* eased progress of t through [a, b] */
  function tw(t, a, b, e = Ease.outCubic) { return e(inv(a, b, t)); }
  /* keyframes: [[time, value, easeIntoThisKey?], ...] */
  function keys(t, k) {
    if (t <= k[0][0]) return k[0][1];
    for (let i = 1; i < k.length; i++) {
      if (t < k[i][0]) {
        const e = k[i][2] || Ease.inOutCubic;
        return lerp(k[i - 1][1], k[i][1], e(inv(k[i - 1][0], k[i][0], t)));
      }
    }
    return k[k.length - 1][1];
  }

  /* ---------- deterministic randomness & noise ---------- */
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hash1(i, s = 0) {
    let h = (i * 374761393 + s * 668265263) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  /* smooth 1D gradient noise in [-1, 1] */
  function noise(x, s = 0) {
    const i = Math.floor(x), f = x - i;
    const g0 = hash1(i, s) * 2 - 1, g1 = hash1(i + 1, s) * 2 - 1;
    const u = f * f * f * (f * (f * 6 - 15) + 10);
    return lerp(g0 * f, g1 * (f - 1), u) * 2;
  }
  function fbm(x, s = 0) { return noise(x, s) * 0.6 + noise(x * 2.1, s + 7) * 0.3 + noise(x * 4.3, s + 13) * 0.1; }

  /* ---------- color ---------- */
  const _rgbCache = {};
  function rgb(hex) {
    if (_rgbCache[hex]) return _rgbCache[hex];
    const h = hex.replace('#', '');
    const v = [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
    _rgbCache[hex] = v; return v;
  }
  function mix(a, b, t) {
    const A = rgb(a), B = rgb(b);
    return `rgb(${Math.round(lerp(A[0], B[0], t))},${Math.round(lerp(A[1], B[1], t))},${Math.round(lerp(A[2], B[2], t))})`;
  }
  function mixHex(a, b, t) {
    const A = rgb(a), B = rgb(b);
    const h = (v) => Math.round(v).toString(16).padStart(2, '0');
    return '#' + h(lerp(A[0], B[0], t)) + h(lerp(A[1], B[1], t)) + h(lerp(A[2], B[2], t));
  }
  function alpha(hex, a) { const A = rgb(hex); return `rgba(${A[0]},${A[1]},${A[2]},${a})`; }

  /* ---------- canvas helpers ---------- */
  function rr(ctx, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, TAU); }
  function fillCircle(ctx, x, y, r, col) { circle(ctx, x, y, r); ctx.fillStyle = col; ctx.fill(); }
  function starPath(ctx, x, y, R, r, n = 5, rot = -Math.PI / 2, round = 0) {
    ctx.beginPath();
    const pts = [];
    for (let i = 0; i < n * 2; i++) {
      const a = rot + (i * Math.PI) / n, rad = i % 2 ? r : R;
      pts.push([x + Math.cos(a) * rad, y + Math.sin(a) * rad]);
    }
    if (!round) { pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); return; }
    // rounded star via arcTo
    const m = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const s = m(pts[pts.length - 1], pts[0]);
    ctx.moveTo(s[0], s[1]);
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i], q = pts[(i + 1) % pts.length];
      ctx.arcTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2, i % 2 ? round * 0.6 : round);
    }
    ctx.closePath();
  }
  /* draw a path progressively (0..1) using dash offset */
  function strokeProgress(ctx, pathFn, len, p) {
    if (p <= 0) return;
    ctx.save();
    ctx.setLineDash([len * p, len * 2]);
    pathFn();
    ctx.stroke();
    ctx.restore();
  }
  /* 4-point sparkle (twinkle) */
  function sparkle(ctx, x, y, r, col, rot = 0) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    ctx.beginPath();
    const k = 0.22;
    ctx.moveTo(0, -r);
    ctx.quadraticCurveTo(r * k, -r * k, r, 0);
    ctx.quadraticCurveTo(r * k, r * k, 0, r);
    ctx.quadraticCurveTo(-r * k, r * k, -r, 0);
    ctx.quadraticCurveTo(-r * k, -r * k, 0, -r);
    ctx.fillStyle = col; ctx.fill();
    ctx.restore();
  }
  /* wobbly hand-drawn line points (for doodles & scribbles) */
  function scribblePts(x1, y1, x2, y2, seed, amp = 6, n = 24) {
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      pts.push([lerp(x1, x2, t) + noise(t * 3, seed) * amp * 0.3, lerp(y1, y2, t) + noise(t * 4, seed + 3) * amp]);
    }
    return pts;
  }
  function polyline(ctx, pts) { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); }
  function polyLen(pts) { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return L; }

  /* ==========================================================================
     TYPE SYSTEM: rich text with {styled runs|mods}, wrapping, per-word/char
     kinetic animation, mask reveals.
     ========================================================================== */
  const STY = {
    s9: { fam: '"Inter Tight"', w: 900, it: 0, k: 1, tr: -0.045 },
    s8: { fam: '"Inter Tight"', w: 800, it: 0, k: 1, tr: -0.035 },
    s7: { fam: '"Inter Tight"', w: 700, it: 0, k: 1, tr: -0.022 },
    s6: { fam: '"Inter Tight"', w: 600, it: 0, k: 1, tr: -0.012 },
    s5: { fam: '"Inter Tight"', w: 500, it: 0, k: 1, tr: -0.005 },
    s9i: { fam: '"Inter Tight"', w: 900, it: 1, k: 1, tr: -0.04 },
    si: { fam: '"Instrument Serif"', w: 400, it: 1, k: 1.2, tr: -0.015 },
    sr: { fam: '"Instrument Serif"', w: 400, it: 0, k: 1.2, tr: -0.015 },
    mo: { fam: '"JetBrains Mono"', w: 700, it: 0, k: 0.86, tr: 0 },
    mo8: { fam: '"JetBrains Mono"', w: 800, it: 0, k: 0.86, tr: -0.02 },
    mo5: { fam: '"JetBrains Mono"', w: 500, it: 0, k: 0.86, tr: 0.0 },
    hd: { fam: 'Caveat', w: 700, it: 0, k: 1.28, tr: 0 },
  };
  function fontOf(st, px) { return `${st.it ? 'italic ' : ''}${st.w} ${(px * st.k).toFixed(2)}px ${st.fam}`; }
  function setFont(ctx, st, px) { ctx.font = fontOf(st, px); ctx.letterSpacing = (st.tr * px * st.k).toFixed(2) + 'px'; }

  let _measureCtx = null;
  function mctx() {
    if (!_measureCtx) { const c = document.createElement('canvas'); c.width = c.height = 8; _measureCtx = c.getContext('2d'); }
    return _measureCtx;
  }
  function measure(text, st, px) { const m = mctx(); setFont(m, st, px); return m.measureText(text).width; }

  function parseRich(src) {
    const runs = []; const re = /\{([^|}]*)\|([^}]*)\}/g; let m, last = 0;
    while ((m = re.exec(src))) {
      if (m.index > last) runs.push({ text: src.slice(last, m.index), mods: [] });
      runs.push({ text: m[1], mods: m[2].split(',').map((s) => s.trim()).filter(Boolean) });
      last = re.lastIndex;
    }
    if (last < src.length) runs.push({ text: src.slice(last), mods: [] });
    return runs;
  }

  const _layoutCache = new Map();
  /* layout(src, {size, style, color, maxW, lh, align}) */
  function layout(src, o = {}) {
    const size = o.size || 100, base = o.style || 's8', maxW = o.maxW || 900;
    const lh = o.lh || size * 1.02, align = o.align || 'center';
    const key = [src, size, base, maxW, lh, align, o.color, o.ws].join('§');
    if (_layoutCache.has(key)) return _layoutCache.get(key);
    const runs = parseRich(src);
    // tokens: pieces separated by spaces/newlines
    const groups = []; let cur = { pieces: [] };
    const pushGroup = () => { if (cur.pieces.length) groups.push(cur); cur = { pieces: [] }; };
    for (const run of runs) {
      let st = base, color = o.color || C.ink; const mods = [];
      for (const md of run.mods) {
        if (STY[md]) st = md; else if (C[md]) color = C[md]; else if (md[0] === '#') color = md; else mods.push(md);
      }
      const parts = run.text.split(/( |\n)/);
      for (const p of parts) {
        if (p === ' ') { pushGroup(); continue; }
        if (p === '\n') { pushGroup(); groups.push({ br: true }); continue; }
        if (!p) continue;
        cur.pieces.push({ text: p, st, color, mods });
      }
    }
    pushGroup();
    // measure
    const spaceW = measure(' ', STY[base], size) + size * (o.ws == null ? 0.06 : o.ws);
    for (const g of groups) {
      if (g.br) continue;
      let x = 0;
      for (const pc of g.pieces) { pc.x = x; pc.w = measure(pc.text, STY[pc.st], size); x += pc.w; }
      g.w = x;
    }
    // wrap
    const lines = []; let line = { groups: [], w: 0 };
    for (const g of groups) {
      if (g.br) { lines.push(line); line = { groups: [], w: 0 }; continue; }
      const add = (line.groups.length ? spaceW : 0) + g.w;
      if (line.groups.length && line.w + add > maxW) { lines.push(line); line = { groups: [], w: 0 }; }
      g.x = line.w + (line.groups.length ? spaceW : 0);
      line.w = g.x + g.w; line.groups.push(g);
    }
    lines.push(line);
    const asc = size * 0.76; // cap-height-ish top for first line
    const units = [];
    lines.forEach((ln, li) => {
      ln.y = asc + li * lh;
      const off = align === 'center' ? -ln.w / 2 : align === 'right' ? -ln.w : 0;
      ln.x = off;
      ln.groups.forEach((g) => { g.gx = off + g.x; g.line = li; g.i = units.length; units.push(g); });
    });
    const L = { lines, units, size, lh, align, width: Math.max(...lines.map((l) => l.w)), height: asc + (lines.length - 1) * lh + size * 0.26, asc };
    _layoutCache.set(key, L);
    return L;
  }

  /* char positions within a piece (kerning-accurate via prefix measure) */
  const _charCache = new Map();
  function charXs(pc, size) {
    const key = pc.text + '§' + pc.st + '§' + size;
    if (_charCache.has(key)) return _charCache.get(key);
    const xs = []; const st = STY[pc.st];
    for (let i = 0; i < pc.text.length; i++) xs.push(measure(pc.text.slice(0, i), st, size));
    xs.push(measure(pc.text, st, size));
    _charCache.set(key, xs); return xs;
  }

  /* entrance / exit presets. p: 0..1 (in), q: 0..1 (out). returns transform */
  const TX = {
    rise: (p, L) => ({ dy: (1 - p) * L.size * 1.15, clip: true }),
    riseOut: (q, L) => ({ dy: -q * L.size * 1.35, clip: true, a: 1 - clamp((q - 0.45) * 2.2) }),
    drop: (p, L) => ({ dy: -(1 - p) * L.size * 1.15, clip: true }),
    pop: (p) => ({ s: p, a: clamp(p * 4) }),
    popOut: (q) => ({ s: 1 - q, a: 1 - clamp((q - 0.6) * 2.5) }),
    slam: (p) => ({ s: lerp(2.6, 1, p), a: clamp(p * 5) }),
    fade: (p, L) => ({ a: p, dy: (1 - p) * L.size * 0.25 }),
    fadeOut: (q, L) => ({ a: 1 - q, dy: -q * L.size * 0.25 }),
    blur: (p) => ({ a: p, blur: (1 - p) * 18, s: lerp(1.12, 1, p) }),
    swing: (p, L) => ({ rot: (1 - p) * -0.6, dy: (1 - p) * L.size * 0.6, a: clamp(p * 3) }),
    stretch: (p) => ({ sx: lerp(0.2, 1, p), sy: lerp(2.2, 1, p), a: clamp(p * 4) }),
    type: (p) => ({ a: p > 0 ? 1 : 0 }),
    none: () => ({}),
    fall: (q, L) => ({ dy: q * q * L.size * 6, rot: q * 0.8, a: 1 - clamp((q - 0.7) * 3.3) }),
    shrink: (q) => ({ s: 1 - q, a: 1 - q }),
  };

  /**
   * drawText(ctx, L, x, y, opts)
   * opts: t (seconds since block start), anim ('rise'|'pop'|...), per ('word'|'char'|'line'),
   *       stagger, dur, ease, out: {at, anim, stagger, dur, ease}, alpha, glow, shadow,
   *       colorOverride(i) , scaleOverride etc.
   */
  function drawText(ctx, L, x, y, o = {}) {
    if (o.T != null && o.at != null) { // global-time form: at = block start, out.at = global exit time
      o = Object.assign({}, o, { t: o.T - o.at, T: null });
      if (o.out) o.out = Object.assign({}, o.out, { at: o.out.at - (o.at || 0) });
      if (o.decoAt != null) o.decoAt -= o.at;
    }
    const t = o.t == null ? 999 : o.t;
    const anim = TX[o.anim || 'rise'], per = o.per || 'word';
    const stag = o.stagger == null ? 0.07 : o.stagger, dur = o.dur || 0.7;
    const ease = o.ease || (o.anim === 'pop' || o.anim === 'stretch' ? Ease.outBack : o.anim === 'slam' ? Ease.outExpo : Ease.snap);
    const out = o.out;
    const galpha = o.alpha == null ? 1 : o.alpha;
    if (galpha <= 0) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.textBaseline = 'alphabetic';
    let unitIndex = 0;
    const total = per === 'char' ? L.units.reduce((a, g) => a + g.pieces.reduce((b, p) => b + p.text.length, 0), 0) : L.units.length;
    const order = (i) => (o.order === 'reverse' ? total - 1 - i : o.order === 'center' ? Math.abs(i - (total - 1) / 2) : o.order === 'random' ? hash1(i, 91) * total : i);
    const stepIn = (i) => { const d = order(i) * stag; return ease(clamp((t - d) / dur)); };
    const stepOut = (i) => {
      if (!out || t < out.at) return 0;
      const st2 = out.stagger == null ? stag * 0.5 : out.stagger, d2 = out.dur || 0.34;
      return (out.ease || Ease.inQuad)(clamp((t - out.at - order(i) * st2) / d2));
    };
    const outFn = out ? TX[out.anim || 'riseOut'] : null;
    for (const ln of L.lines) {
      for (const g of ln.groups) {
        if (per === 'word' || per === 'line') {
          const idx = per === 'line' ? g.line : g.i;
          const p = stepIn(idx), q = stepOut(idx);
          drawUnit(ctx, L, g, null, p, q, anim, outFn, o, galpha, idx);
        } else {
          for (const pc of g.pieces) {
            const xs = charXs(pc, L.size);
            for (let ci = 0; ci < pc.text.length; ci++) {
              const p = stepIn(unitIndex), q = stepOut(unitIndex);
              drawUnit(ctx, L, g, { pc, ci, x: xs[ci], w: xs[ci + 1] - xs[ci] }, p, q, anim, outFn, o, galpha, unitIndex);
              unitIndex++;
            }
          }
        }
      }
    }
    ctx.restore();
  }

  function drawUnit(ctx, L, g, ch, p, q, anim, outFn, o, galpha, idx) {
    if (p <= 0 && !(o.anim === 'none')) return;
    const a1 = anim(p, L) || {}, a2 = outFn && q > 0 ? outFn(q, L) : {};
    const alph = (a1.a == null ? 1 : a1.a) * (a2.a == null ? 1 : a2.a) * galpha;
    if (alph <= 0.001) return;
    const s = (a1.s == null ? 1 : a1.s) * (a2.s == null ? 1 : a2.s);
    const sx = s * (a1.sx == null ? 1 : a1.sx), sy = s * (a1.sy == null ? 1 : a1.sy);
    const dy = (a1.dy || 0) + (a2.dy || 0), dx = (a1.dx || 0) + (a2.dx || 0), rot = (a1.rot || 0) + (a2.rot || 0);
    const ln = L.lines[g.line];
    const baseX = g.gx + (ch ? ch.pc.x + ch.x : 0);
    const w = ch ? ch.w : g.w;
    const cy = ln.y - L.size * 0.36;
    ctx.save();
    if ((a1.clip || a2.clip) && !o.noClip) {
      ctx.beginPath();
      ctx.rect(baseX - L.size * 0.5, ln.y - L.size * 1.02, w + L.size, L.size * 1.34);
      ctx.clip();
    }
    const extra = o.unitFx ? o.unitFx(idx, p, q) || {} : {};
    ctx.translate(baseX + w / 2 + dx + (extra.dx || 0), cy + dy + (extra.dy || 0));
    if (rot || extra.rot) ctx.rotate(rot + (extra.rot || 0));
    const ks = extra.s == null ? 1 : extra.s;
    if (sx !== 1 || sy !== 1 || ks !== 1) ctx.scale(sx * ks, sy * ks);
    ctx.globalAlpha = alph * (extra.a == null ? 1 : extra.a);
    if (a1.blur > 0.5) ctx.filter = `blur(${a1.blur.toFixed(1)}px)`;
    const drawPieces = (fillOverride) => {
      if (ch) {
        const st = STY[ch.pc.st]; setFont(ctx, st, L.size);
        ctx.fillStyle = fillOverride || extra.color || (o.color && !ch.pc.mods.includes('keep') ? o.color : ch.pc.color);
        ctx.fillText(ch.pc.text[ch.ci], -w / 2, ln.y - cy);
      } else {
        for (const pc of g.pieces) {
          const st = STY[pc.st]; setFont(ctx, st, L.size);
          ctx.fillStyle = fillOverride || extra.color || pc.color;
          ctx.fillText(pc.text, -w / 2 + pc.x, ln.y - cy);
        }
      }
    };
    if (o.shadow) { ctx.save(); ctx.translate(o.shadow[0], o.shadow[1]); drawPieces(o.shadow[2]); ctx.restore(); }
    if (o.glow) { ctx.shadowColor = o.glow[0]; ctx.shadowBlur = o.glow[1]; }
    // decorations behind (highlight)
    if (!ch) for (const pc of g.pieces) decorate(ctx, pc, -w / 2, ln.y - cy, L.size, p, o, 'behind');
    drawPieces();
    ctx.shadowBlur = 0;
    if (!ch) for (const pc of g.pieces) decorate(ctx, pc, -w / 2, ln.y - cy, L.size, p, o, 'front');
    ctx.restore();
  }

  function decorate(ctx, pc, ox, base, size, p, o, layer) {
    if (!pc.mods.length) return;
    const t = o.t == null ? 999 : o.t;
    const dt = o.decoAt == null ? (o.dur || 0.7) + 0.1 : o.decoAt;
    const dp = Ease.inOutCubic(clamp((t - dt) / 0.45));
    if (layer === 'behind' && pc.mods.includes('hl') && dp > 0) {
      ctx.save();
      ctx.fillStyle = o.hlColor || C.sun;
      const x0 = ox + pc.x - size * 0.08, y0 = base - size * 0.72, hh = size * 0.86;
      ctx.beginPath();
      ctx.moveTo(x0, y0 + 6); ctx.lineTo(x0 + (pc.w + size * 0.16) * dp, y0);
      ctx.lineTo(x0 + (pc.w + size * 0.16) * dp - 4, y0 + hh); ctx.lineTo(x0 + 3, y0 + hh + 5); ctx.closePath();
      ctx.fill(); ctx.restore();
    }
    if (layer === 'front' && pc.mods.includes('u') && dp > 0) {
      ctx.save();
      ctx.strokeStyle = o.uColor || pc.color; ctx.lineWidth = Math.max(4, size * 0.07); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      const y = base + size * 0.14, x1 = ox + pc.x, x2 = ox + pc.x + pc.w;
      // a loose double-pass marker scribble
      const pts = [];
      const n = 30;
      for (let i = 0; i <= n; i++) { const u = i / n; pts.push([lerp(x1 - 6, x2 + 8, u), y + Math.sin(u * 3.1) * size * 0.03 + noise(u * 5, 17) * 3]); }
      for (let i = 0; i <= n; i++) { const u = i / n; pts.push([lerp(x2 + 4, x1 + size * 0.2, u), y + size * 0.1 + Math.sin(u * 2.3) * size * 0.02 + noise(u * 5, 29) * 3]); }
      const len = polyLen(pts);
      ctx.setLineDash([len * dp, len]); polyline(ctx, pts); ctx.stroke();
      ctx.restore();
    }
    if (layer === 'front' && pc.mods.includes('strike') && dp > 0) {
      ctx.save(); ctx.strokeStyle = o.sColor || C.tomato; ctx.lineWidth = size * 0.1; ctx.lineCap = 'round';
      const y = base - size * 0.3; ctx.beginPath(); ctx.moveTo(ox + pc.x - 8, y + 6); ctx.lineTo(ox + pc.x - 8 + (pc.w + 16) * dp, y - 6); ctx.stroke(); ctx.restore();
    }
  }

  /* simple one-shot text with no animation */
  function text(ctx, str, x, y, st, px, color, align = 'center', alphaV = 1) {
    ctx.save(); setFont(ctx, STY[st], px); ctx.fillStyle = color; ctx.textAlign = align; ctx.globalAlpha *= alphaV;
    ctx.textBaseline = 'alphabetic'; ctx.fillText(str, x, y); ctx.restore();
  }
  /* fit a size so a layout fits width */
  function fitSize(src, style, maxW, maxSize) {
    const L = layout(src.replace(/\n/g, ' '), { size: 100, style, maxW: 1e9 });
    return Math.min(maxSize, (100 * maxW) / L.width);
  }

  /* ==========================================================================
     CHARACTER: "Bub" the chat-bubble AI + simple family characters
     ========================================================================== */
  /* Bub's silhouette (chat bubble with tail), centred on 0,0; 280 x 220 body */
  function botPath(ctx) {
    const Wb = 280, Hb = 220;
    ctx.beginPath();
    const x = -Wb / 2, y = -Hb / 2, r = 100;
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + Wb, y, x + Wb, y + Hb, r);
    ctx.arcTo(x + Wb, y + Hb, x, y + Hb, r);
    ctx.lineTo(x + 108, y + Hb);
    ctx.quadraticCurveTo(x + 70, y + Hb + 44, x + 22, y + Hb + 58);
    ctx.quadraticCurveTo(x + 52, y + Hb + 22, x + 46, y + Hb - 8);
    ctx.arcTo(x, y + Hb, x, y, r * 0.55);
    ctx.arcTo(x, y, x + Wb, y, r);
    ctx.closePath();
  }
  function drawBot(ctx, o) {
    const s = o.s == null ? 1 : o.s; if (s <= 0.001) return;
    const t = o.t || 0;
    const col = o.color || C.cobalt;
    const sq = o.sq == null ? 1 : o.sq;
    const look = o.look || { x: 0, y: 0 };
    const blink = o.blink || 0;
    const outline = o.outline || C.ink;
    const lw = 9;
    ctx.save();
    ctx.translate(o.x, o.y);
    if (o.rot) ctx.rotate(o.rot);
    ctx.scale(s * sq, s / sq);
    ctx.globalAlpha *= o.alpha == null ? 1 : o.alpha;
    const Wb = 280, Hb = 220;
    // ground shadow
    if (o.shadow !== false) {
      ctx.save(); ctx.globalAlpha *= 0.18 * (o.shadowA == null ? 1 : o.shadowA);
      ctx.fillStyle = o.shadowCol || C.ink;
      ctx.beginPath(); ctx.ellipse(0, Hb / 2 + 58 + (o.lift || 0), Wb * 0.42 * (1 - Math.min(0.5, (o.lift || 0) / 400)), 16, 0, 0, TAU); ctx.fill(); ctx.restore();
    }
    ctx.translate(0, -(o.lift || 0));
    // antenna
    const aw = (o.antWob || 0) + Math.sin(t * 2.3) * 0.06;
    ctx.save();
    ctx.translate(0, -Hb / 2 + 4);
    ctx.rotate(aw);
    ctx.strokeStyle = outline; ctx.lineWidth = lw; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(6, -30, 0, -56); ctx.stroke();
    const glow = o.antGlow || 0;
    if (glow > 0) {
      const gr = ctx.createRadialGradient(0, -70, 4, 0, -70, 90);
      gr.addColorStop(0, alpha(C.sun, 0.9 * glow)); gr.addColorStop(1, alpha(C.sun, 0));
      ctx.fillStyle = gr; circle(ctx, 0, -70, 90); ctx.fill();
    }
    circle(ctx, 0, -70, 20); ctx.fillStyle = o.antCol || C.sun; ctx.fill(); ctx.lineWidth = lw; ctx.stroke();
    ctx.restore();
    // body (chat bubble with tail)
    const bodyPath = () => botPath(ctx);
    const ba = o.bodyAlpha == null ? 1 : o.bodyAlpha;
    ctx.save(); ctx.globalAlpha *= ba;
    bodyPath();
    ctx.fillStyle = col; ctx.fill();
    // soft inner shade + highlight
    ctx.save(); bodyPath(); ctx.clip();
    const g2 = ctx.createLinearGradient(0, -Hb / 2, 0, Hb / 2 + 60);
    g2.addColorStop(0, 'rgba(255,255,255,0.20)'); g2.addColorStop(0.5, 'rgba(255,255,255,0)'); g2.addColorStop(1, 'rgba(0,0,0,0.16)');
    ctx.fillStyle = g2; ctx.fillRect(-Wb, -Hb, Wb * 2, Hb * 2 + 80);
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.beginPath(); ctx.ellipse(-Wb * 0.26, -Hb * 0.3, 46, 18, -0.5, 0, TAU); ctx.fill();
    ctx.restore();
    bodyPath(); ctx.strokeStyle = outline; ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.stroke();
    ctx.restore();
    // sticker on body
    if (o.sticker > 0) {
      const sp = o.sticker;
      ctx.save(); ctx.translate(Wb * 0.3, Hb * 0.22); ctx.rotate(0.25 + (1 - sp) * 1.5); ctx.scale(sp, sp);
      starPath(ctx, 0, 0, 44, 21, 5, -Math.PI / 2, 7); ctx.fillStyle = C.gold; ctx.fill(); ctx.lineWidth = 6; ctx.strokeStyle = outline; ctx.stroke();
      sparkle(ctx, -10, -10, 9, 'rgba(255,255,255,0.8)');
      ctx.restore();
    }
    // face
    const fx = look.x * 16, fy = look.y * 12;
    ctx.save(); ctx.translate(fx * 0.5, fy * 0.5);
    for (const side of [-1, 1]) {
      const ex = side * 56, ey = -14;
      // cheeks
      ctx.fillStyle = alpha(C.pink, 0.85);
      ctx.beginPath(); ctx.ellipse(side * 92, 30, 22, 13, 0, 0, TAU); ctx.fill();
      const open = 1 - blink;
      if (o.eyes === 'happy') {
        ctx.strokeStyle = outline; ctx.lineWidth = 10; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(ex, ey + 10, 20, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
        continue;
      }
      if (o.eyes === 'x') {
        ctx.strokeStyle = outline; ctx.lineWidth = 10; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(ex - 16, ey - 16); ctx.lineTo(ex + 16, ey + 16); ctx.moveTo(ex + 16, ey - 16); ctx.lineTo(ex - 16, ey + 16); ctx.stroke();
        continue;
      }
      if (o.eyes === 'spin') {
        ctx.strokeStyle = outline; ctx.lineWidth = 7; ctx.lineCap = 'round';
        ctx.beginPath();
        for (let k = 0; k <= 40; k++) { const a = k * 0.45 + t * 14 * side, rr2 = k * 0.62; const px = ex + Math.cos(a) * rr2, py = ey + Math.sin(a) * rr2; k ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
        ctx.stroke();
        continue;
      }
      ctx.fillStyle = C.white;
      ctx.beginPath(); ctx.ellipse(ex, ey, 30, 36 * Math.max(0.08, open), 0, 0, TAU); ctx.fill();
      ctx.lineWidth = 7; ctx.strokeStyle = outline; ctx.stroke();
      if (open > 0.25) {
        ctx.save(); ctx.beginPath(); ctx.ellipse(ex, ey, 30, 36 * open, 0, 0, TAU); ctx.clip();
        const px = ex + look.x * 12, py = ey + look.y * 13 + 4;
        fillCircle(ctx, px, py, 17 * (o.pupil || 1), outline);
        fillCircle(ctx, px + 6, py - 7, 5.5, C.white);
        ctx.restore();
      }
    }
    // mouth
    const m = o.mouth || 'smile';
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = outline; ctx.lineWidth = 8;
    const talk = o.talk || 0;
    if (m === 'smile' && talk < 0.05) {
      ctx.beginPath(); ctx.arc(0, 26, 20, Math.PI * 0.18, Math.PI * 0.82); ctx.stroke();
    } else if (m === 'open' || talk >= 0.05) {
      const oh = m === 'open' ? 1 : talk;
      ctx.beginPath(); ctx.moveTo(-24, 34); ctx.quadraticCurveTo(0, 34 + 44 * oh, 24, 34); ctx.closePath();
      ctx.fillStyle = '#3A0F1A'; ctx.fill(); ctx.stroke();
      ctx.save(); ctx.clip(); ctx.fillStyle = C.pink; ctx.beginPath(); ctx.ellipse(0, 34 + 40 * oh, 16, 12, 0, 0, TAU); ctx.fill(); ctx.restore();
    } else if (m === 'o') {
      ctx.beginPath(); ctx.ellipse(0, 44, 13, 17, 0, 0, TAU); ctx.fillStyle = '#3A0F1A'; ctx.fill(); ctx.stroke();
    } else if (m === 'flat') {
      ctx.beginPath(); ctx.moveTo(-18, 40); ctx.lineTo(18, 40); ctx.stroke();
    } else if (m === 'sad') {
      ctx.beginPath(); ctx.arc(0, 60, 20, Math.PI * 1.2, Math.PI * 1.8); ctx.stroke();
    } else if (m === 'smirk') {
      ctx.beginPath(); ctx.moveTo(-20, 38); ctx.quadraticCurveTo(6, 48, 26, 28); ctx.stroke();
    } else if (m === 'grin') {
      ctx.beginPath(); ctx.moveTo(-34, 30); ctx.quadraticCurveTo(0, 78, 34, 30); ctx.closePath();
      ctx.fillStyle = C.white; ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-30, 42); ctx.lineTo(30, 42); ctx.lineWidth = 4; ctx.stroke();
    }
    ctx.restore();
    // accessories
    if (o.glasses > 0) {
      ctx.save(); ctx.translate(fx * 0.5, fy * 0.5 - 14 + (1 - o.glasses) * -200); ctx.globalAlpha *= clamp(o.glasses * 2);
      ctx.strokeStyle = outline; ctx.lineWidth = 7;
      circle(ctx, -56, 0, 42); ctx.stroke(); circle(ctx, 56, 0, 42); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-14, -4); ctx.quadraticCurveTo(0, -14, 14, -4); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.18)'; circle(ctx, -56, 0, 38); ctx.fill(); circle(ctx, 56, 0, 38); ctx.fill();
      ctx.restore();
    }
    if (o.shades > 0) {
      const sp = o.shades;
      ctx.save(); ctx.translate(fx * 0.5, fy * 0.5 - 16 - (1 - sp) * 520);
      ctx.fillStyle = C.ink;
      ctx.beginPath();
      ctx.moveTo(-122, -28); ctx.lineTo(122, -28); ctx.lineTo(122, -14);
      ctx.lineTo(96, -14); ctx.quadraticCurveTo(96, 36, 52, 34); ctx.quadraticCurveTo(14, 32, 14, -8);
      ctx.lineTo(-14, -8); ctx.quadraticCurveTo(-14, 32, -52, 34); ctx.quadraticCurveTo(-96, 36, -96, -14);
      ctx.lineTo(-122, -14); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fillRect(-86, -8, 16, 10); ctx.fillRect(-66, -8, 8, 10); ctx.fillRect(28, -8, 16, 10); ctx.fillRect(48, -8, 8, 10);
      ctx.restore();
    }
    ctx.restore();
  }

  /* pill-people: parents & kids */
  function drawPerson(ctx, o) {
    const s = o.s == null ? 1 : o.s; if (s <= 0.001) return;
    const h = o.h || 300; // body height (without head)
    const w = o.w || 120;
    const hr = o.hr || 62;
    ctx.save(); ctx.translate(o.x, o.y); if (o.rot) ctx.rotate(o.rot); ctx.scale(s * (o.sq || 1), s / (o.sq || 1));
    ctx.translate(0, -(o.lift || 0));
    ctx.lineWidth = 8; ctx.strokeStyle = C.ink; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    // arms
    const wave = o.wave || 0;
    ctx.save(); ctx.translate(w / 2 - 12, -h + 60); ctx.rotate(-0.4 - wave); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -(h * 0.42)); ctx.lineWidth = 22; ctx.strokeStyle = C.ink; ctx.stroke(); ctx.lineWidth = 12; ctx.strokeStyle = o.shirt; ctx.stroke(); ctx.restore();
    ctx.save(); ctx.translate(-w / 2 + 12, -h + 60); ctx.rotate(0.35 + (o.wave2 || 0)); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, h * 0.4); ctx.lineWidth = 22; ctx.strokeStyle = C.ink; ctx.stroke(); ctx.lineWidth = 12; ctx.strokeStyle = o.shirt; ctx.stroke(); ctx.restore();
    // body
    rr(ctx, -w / 2, -h, w, h, w / 2); ctx.fillStyle = o.shirt; ctx.fill(); ctx.stroke();
    // head
    circle(ctx, 0, -h - hr + 8, hr); ctx.fillStyle = o.skin; ctx.fill(); ctx.stroke();
    // hair
    if (o.hair) {
      ctx.save(); circle(ctx, 0, -h - hr + 8, hr); ctx.clip();
      ctx.fillStyle = o.hair;
      if (o.hairStyle === 'bob') { ctx.fillRect(-hr, -h - hr * 2 + 8, hr * 2, hr * 0.85); ctx.fillRect(-hr, -h - hr * 2 + 8, hr * 0.35, hr * 2); ctx.fillRect(hr * 0.65, -h - hr * 2 + 8, hr * 0.35, hr * 2); }
      else if (o.hairStyle === 'curly') { for (let k = -3; k <= 3; k++) { circle(ctx, k * hr * 0.3, -h - hr * 1.72 + 8 + Math.abs(k) * 6, hr * 0.34); ctx.fill(); } }
      else { ctx.beginPath(); ctx.ellipse(0, -h - hr * 1.62 + 8, hr * 1.05, hr * 0.62, 0, 0, TAU); ctx.fill(); }
      ctx.restore();
      circle(ctx, 0, -h - hr + 8, hr); ctx.stroke();
    }
    // face
    const fy = -h - hr + 14;
    fillCircle(ctx, -hr * 0.34, fy, 6.5, C.ink); fillCircle(ctx, hr * 0.34, fy, 6.5, C.ink);
    ctx.lineWidth = 6; ctx.beginPath();
    if (o.mouth === 'o') { ctx.ellipse(0, fy + hr * 0.38, 8, 11, 0, 0, TAU); ctx.fillStyle = '#3A0F1A'; ctx.fill(); }
    else ctx.arc(0, fy + hr * 0.18, hr * 0.26, Math.PI * 0.15, Math.PI * 0.85);
    ctx.stroke();
    ctx.fillStyle = alpha(C.pink, 0.8);
    ctx.beginPath(); ctx.ellipse(-hr * 0.55, fy + hr * 0.25, 10, 6, 0, 0, TAU); ctx.ellipse(hr * 0.55, fy + hr * 0.25, 10, 6, 0, 0, TAU); ctx.fill();
    ctx.restore();
  }

  /* ==========================================================================
     ICONS (drawn in a ~100px box centred on 0,0)
     ========================================================================== */
  const Icon = {
    tooth(ctx, col = C.white, line = C.ink) {
      ctx.beginPath();
      ctx.moveTo(-38, -30);
      ctx.bezierCurveTo(-44, -58, -12, -62, 0, -48);
      ctx.bezierCurveTo(12, -62, 44, -58, 38, -30);
      ctx.bezierCurveTo(34, -6, 30, 10, 26, 40);
      ctx.bezierCurveTo(22, 64, 8, 58, 6, 34);
      ctx.bezierCurveTo(4, 20, -4, 20, -6, 34);
      ctx.bezierCurveTo(-8, 58, -22, 64, -26, 40);
      ctx.bezierCurveTo(-30, 10, -34, -6, -38, -30);
      ctx.closePath();
      ctx.fillStyle = col; ctx.fill(); ctx.lineWidth = 7; ctx.strokeStyle = line; ctx.lineJoin = 'round'; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(-18, -34, 7, 12, -0.5, 0, TAU); ctx.fillStyle = 'rgba(0,0,0,0.07)'; ctx.fill();
    },
    check(ctx, p = 1, col = C.mint, lw = 16) {
      const pts = [[-34, 2], [-10, 28], [38, -26]];
      ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      const L = polyLen(pts); ctx.setLineDash([L * p, L]); polyline(ctx, pts); ctx.stroke(); ctx.setLineDash([]);
    },
    cross(ctx, p = 1, col = C.tomato, lw = 16) {
      ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineCap = 'round';
      const a = clamp(p * 2), b = clamp(p * 2 - 1);
      ctx.beginPath(); ctx.moveTo(-30, -30); ctx.lineTo(-30 + 60 * a, -30 + 60 * a); ctx.stroke();
      if (b > 0) { ctx.beginPath(); ctx.moveTo(30, -30); ctx.lineTo(30 - 60 * b, -30 + 60 * b); ctx.stroke(); }
    },
    thumb(ctx, up = true, col = C.mint, line = C.ink) {
      ctx.save(); if (!up) ctx.scale(1, -1);
      ctx.lineWidth = 7; ctx.strokeStyle = line; ctx.lineJoin = 'round';
      rr(ctx, -46, -6, 26, 52, 8); ctx.fillStyle = col; ctx.fill(); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-14, -2); ctx.lineTo(4, -40); ctx.quadraticCurveTo(10, -58, 22, -50); ctx.quadraticCurveTo(30, -42, 22, -14);
      ctx.lineTo(40, -14); ctx.quadraticCurveTo(54, -12, 50, 2); ctx.quadraticCurveTo(56, 12, 48, 18);
      ctx.quadraticCurveTo(54, 28, 44, 34); ctx.quadraticCurveTo(46, 46, 32, 46); ctx.lineTo(-14, 46); ctx.closePath();
      ctx.fillStyle = col; ctx.fill(); ctx.stroke();
      ctx.restore();
    },
    book(ctx, col = C.tomato, line = C.ink) {
      ctx.lineWidth = 7; ctx.strokeStyle = line; ctx.lineJoin = 'round';
      rr(ctx, -40, -50, 80, 100, 8); ctx.fillStyle = col; ctx.fill(); ctx.stroke();
      ctx.fillStyle = C.paper; rr(ctx, -40, 34, 80, 16, 4); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillRect(-22, -32, 44, 8); ctx.fillRect(-22, -18, 30, 6);
    },
    magnifier(ctx, col = C.white, line = C.ink) {
      ctx.lineWidth = 9; ctx.strokeStyle = line; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(18, 18); ctx.lineTo(44, 44); ctx.lineWidth = 18; ctx.stroke();
      circle(ctx, -8, -8, 34); ctx.fillStyle = col; ctx.fill(); ctx.lineWidth = 9; ctx.stroke();
      ctx.beginPath(); ctx.arc(-8, -8, 20, Math.PI * 1.1, Math.PI * 1.5); ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.stroke();
    },
    photo(ctx, col = C.white, line = C.ink) {
      ctx.lineWidth = 8; ctx.strokeStyle = line; ctx.lineJoin = 'round';
      rr(ctx, -48, -38, 96, 76, 12); ctx.fillStyle = col; ctx.fill(); ctx.stroke();
      ctx.save(); rr(ctx, -48, -38, 96, 76, 12); ctx.clip();
      ctx.beginPath(); ctx.moveTo(-48, 38); ctx.lineTo(-14, 0); ctx.lineTo(10, 22); ctx.lineTo(24, 8); ctx.lineTo(48, 38); ctx.closePath(); ctx.fillStyle = C.mint; ctx.fill(); ctx.stroke();
      ctx.restore();
      fillCircle(ctx, 22, -16, 10, C.sun); circle(ctx, 22, -16, 10); ctx.lineWidth = 6; ctx.stroke();
    },
    wrench(ctx, col = C.white, line = C.ink) {
      ctx.save(); ctx.rotate(-Math.PI / 4);
      ctx.lineWidth = 7; ctx.strokeStyle = line; ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(-9, -24); ctx.lineTo(-9, 44); ctx.quadraticCurveTo(0, 54, 9, 44); ctx.lineTo(9, -24);
      ctx.arc(0, -40, 26, Math.PI * 0.35, Math.PI * 0.12 - 0.02, true);
      ctx.lineTo(12, -54); ctx.lineTo(12, -38); ctx.lineTo(-12, -38); ctx.lineTo(-12, -54);
      ctx.arc(0, -40, 26, Math.PI * 0.88 + 0.02, Math.PI * 0.65, true);
      ctx.closePath(); ctx.fillStyle = col; ctx.fill(); ctx.stroke();
      ctx.restore();
    },
    hourglass(ctx, p = 0, col = C.sun, line = C.ink) {
      ctx.lineWidth = 7; ctx.strokeStyle = line; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(-30, -46); ctx.lineTo(30, -46); ctx.quadraticCurveTo(30, -10, 5, 0); ctx.quadraticCurveTo(30, 10, 30, 46);
      ctx.lineTo(-30, 46); ctx.quadraticCurveTo(-30, 10, -5, 0); ctx.quadraticCurveTo(-30, -10, -30, -46); ctx.closePath();
      ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.fill();
      ctx.save(); ctx.clip();
      ctx.fillStyle = col;
      const top = (1 - p) * 40, bot = p * 40;
      ctx.fillRect(-40, -6 - top, 80, top);
      ctx.fillRect(-40, 46 - bot, 80, bot);
      if (p > 0 && p < 1) ctx.fillRect(-2.5, -6, 5, 52);
      ctx.restore();
      ctx.stroke();
      ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(-40, -50); ctx.lineTo(40, -50); ctx.moveTo(-40, 50); ctx.lineTo(40, 50); ctx.stroke();
    },
    heart(ctx, col = C.tomato, line = C.ink) {
      ctx.beginPath(); ctx.moveTo(0, 36);
      ctx.bezierCurveTo(-60, -6, -36, -58, 0, -26);
      ctx.bezierCurveTo(36, -58, 60, -6, 0, 36); ctx.closePath();
      ctx.fillStyle = col; ctx.fill(); if (line) { ctx.lineWidth = 7; ctx.strokeStyle = line; ctx.lineJoin = 'round'; ctx.stroke(); }
    },
    share(ctx, col = C.white, line = C.ink) {
      ctx.lineWidth = 8; ctx.strokeStyle = line; ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(-40, 40); ctx.quadraticCurveTo(-36, -8, 10, -12); ctx.lineTo(10, -40); ctx.lineTo(48, 0); ctx.lineTo(10, 40); ctx.lineTo(10, 12);
      ctx.quadraticCurveTo(-18, 10, -40, 40); ctx.closePath(); ctx.fillStyle = col; ctx.fill(); ctx.stroke();
    },
    robot(ctx, col = C.white, line = C.ink) {
      ctx.lineWidth = 7; ctx.strokeStyle = line; ctx.lineJoin = 'round';
      rr(ctx, -40, -30, 80, 66, 12); ctx.fillStyle = col; ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -30); ctx.lineTo(0, -48); ctx.stroke(); fillCircle(ctx, 0, -52, 8, C.tomato); circle(ctx, 0, -52, 8); ctx.stroke();
      fillCircle(ctx, -16, 0, 8, line); fillCircle(ctx, 16, 0, 8, line);
      ctx.fillStyle = line; ctx.fillRect(-18, 18, 36, 6);
      ctx.fillRect(-52, -6, 12, 22); ctx.fillRect(40, -6, 12, 22);
    },
    cookie(ctx, bite = 0) {
      ctx.save();
      circle(ctx, 0, 0, 44); ctx.fillStyle = '#E0A458'; ctx.fill(); ctx.lineWidth = 7; ctx.strokeStyle = C.ink; ctx.stroke();
      if (bite > 0) { ctx.globalCompositeOperation = 'destination-out'; circle(ctx, 40, -30, 22 * bite); ctx.fill(); circle(ctx, 50, -6, 16 * bite); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; }
      ctx.fillStyle = '#5B3417';
      [[-16, -14], [12, -18], [-4, 8], [20, 14], [-22, 18]].forEach((p) => { circle(ctx, p[0], p[1], 6); ctx.fill(); });
      ctx.restore();
    },
    spark(ctx, col = C.sun) { sparkle(ctx, 0, 0, 50, col); },
  };
  function icon(ctx, name, x, y, s = 1, rot = 0, ...args) {
    if (s <= 0.001) return;
    ctx.save(); ctx.translate(x, y); if (rot) ctx.rotate(rot); ctx.scale(s, s);
    Icon[name](ctx, ...args); ctx.restore();
  }

  /* ==========================================================================
     PARTICLES (analytic, stateless)
     ========================================================================== */
  /* confetti burst: exact solution for linear drag + gravity */
  function confetti(ctx, t, o) {
    if (t < 0) return;
    const n = o.n || 60, R = rng(o.seed || 1), k = o.drag || 2.2, g = o.g == null ? 1400 : o.g;
    const cols = o.colors || [C.tomato, C.sun, C.cobalt, C.mint, C.pink];
    const life = o.life || 2.4;
    for (let i = 0; i < n; i++) {
      const ang = (o.dir == null ? -Math.PI / 2 : o.dir) + (R() - 0.5) * (o.spread || Math.PI * 1.6);
      const sp = (o.speed || 1600) * (0.35 + R() * 0.75);
      const vx = Math.cos(ang) * sp, vy = Math.sin(ang) * sp;
      const e = (1 - Math.exp(-k * t)) / k;
      const x = o.x + vx * e;
      const y = o.y + (vy + g / k) * e - (g / k) * t;
      const a = 1 - clamp((t - life * (0.6 + R() * 0.3)) / 0.4);
      const shape = R(), size = (o.size || 16) * (0.6 + R() * 0.8);
      const rot = R() * TAU + t * (R() - 0.5) * 16, flip = Math.cos(t * (4 + R() * 10) + R() * 6);
      if (a <= 0) continue;
      ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(1, flip); ctx.globalAlpha *= a;
      ctx.fillStyle = cols[Math.floor(R() * cols.length) % cols.length];
      if (shape < 0.45) ctx.fillRect(-size / 2, -size * 0.3, size, size * 0.6);
      else if (shape < 0.75) { circle(ctx, 0, 0, size * 0.42); ctx.fill(); }
      else if (shape < 0.9) { starPath(ctx, 0, 0, size * 0.7, size * 0.3); ctx.fill(); }
      else { ctx.beginPath(); ctx.moveTo(-size / 2, 0); ctx.quadraticCurveTo(0, -size * 0.8, size / 2, 0); ctx.lineWidth = size * 0.28; ctx.strokeStyle = ctx.fillStyle; ctx.stroke(); }
      ctx.restore();
    }
  }
  /* radial burst lines (impact "pow" lines) */
  function burstLines(ctx, t, o) {
    if (t < 0 || t > (o.dur || 0.5)) return;
    const p = t / (o.dur || 0.5), n = o.n || 12, R = rng(o.seed || 3);
    const r0 = o.r0 || 120, len = o.len || 160;
    ctx.save(); ctx.strokeStyle = o.color || C.ink; ctx.lineCap = 'round'; ctx.lineWidth = o.lw || 10;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + (o.rot || 0) + (R() - 0.5) * 0.25;
      const lk = 0.7 + R() * 0.6;
      const rOut = r0 + len * lk * Ease.outExpo(p);
      const rIn = r0 + len * lk * Ease.outCubic(clamp((p - 0.12) / 0.88));
      if (rOut - rIn < 0.5) continue;
      ctx.beginPath(); ctx.moveTo(o.x + Math.cos(a) * rIn, o.y + Math.sin(a) * rIn); ctx.lineTo(o.x + Math.cos(a) * rOut, o.y + Math.sin(a) * rOut);
      ctx.stroke();
    }
    ctx.restore();
  }
  /* expanding ring */
  function ring(ctx, t, o) {
    const d = o.dur || 0.6; if (t < 0 || t > d) return;
    const p = Ease.outCubic(t / d);
    ctx.save(); ctx.strokeStyle = o.color || C.ink; ctx.lineWidth = (o.lw || 14) * (1 - p) + 0.5; ctx.globalAlpha *= 1 - p * 0.6;
    circle(ctx, o.x, o.y, lerp(o.r0 || 20, o.r1 || 300, p)); ctx.stroke(); ctx.restore();
  }

  /* ==========================================================================
     POST FX
     ========================================================================== */
  let _grain = null, _paper = null;
  function grainTex() {
    if (_grain) return _grain;
    const c = document.createElement('canvas'); c.width = c.height = 512;
    const x = c.getContext('2d'); const img = x.createImageData(512, 512); const R = rng(77);
    for (let i = 0; i < img.data.length; i += 4) { const v = Math.floor(128 + (R() + R() + R() - 1.5) * 90); img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
    x.putImageData(img, 0, 0); _grain = c; return c;
  }
  function paperTex() {
    if (_paper) return _paper;
    const c = document.createElement('canvas'); c.width = 540; c.height = 960;
    const x = c.getContext('2d'); const R = rng(5);
    x.fillStyle = '#808080'; x.fillRect(0, 0, c.width, c.height);
    for (let i = 0; i < 2600; i++) {
      x.fillStyle = `rgba(${R() < 0.5 ? '0,0,0' : '255,255,255'},${0.02 + R() * 0.05})`;
      const px = R() * c.width, py = R() * c.height, s = 1 + R() * 3;
      x.fillRect(px, py, s, s * (0.4 + R()));
    }
    for (let i = 0; i < 40; i++) { // soft fibres
      x.strokeStyle = `rgba(0,0,0,${0.015 + R() * 0.02})`; x.lineWidth = 1;
      x.beginPath(); const px = R() * c.width, py = R() * c.height; x.moveTo(px, py); x.quadraticCurveTo(px + R() * 40 - 20, py + R() * 40 - 20, px + R() * 80 - 40, py + R() * 80 - 40); x.stroke();
    }
    _paper = c; return c;
  }
  function grain(ctx, frame, amt = 0.05) {
    const g = grainTex();
    const f = Math.floor(frame / 2); // 30 Hz grain: calmer & encoder-friendly
    const ox = -Math.floor(hash1(f, 1) * 512), oy = -Math.floor(hash1(f, 2) * 512);
    ctx.save(); ctx.globalAlpha = amt; ctx.globalCompositeOperation = 'overlay';
    for (let y = oy; y < H; y += 512) for (let x = ox; x < W; x += 512) ctx.drawImage(g, x, y);
    ctx.restore();
  }
  function paper(ctx, amt = 0.5) {
    ctx.save(); ctx.globalAlpha = amt; ctx.globalCompositeOperation = 'overlay';
    ctx.drawImage(paperTex(), 0, 0, W, H); ctx.restore();
  }
  function vignette(ctx, amt = 0.25, col = '0,0,0') {
    const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.28, W / 2, H / 2, H * 0.75);
    g.addColorStop(0, `rgba(${col},0)`); g.addColorStop(1, `rgba(${col},${amt})`);
    ctx.save(); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
  }

  /* camera: applies push/rotate/shake around a pivot */
  function camera(ctx, o) {
    const z = o.zoom || 1, px = o.px == null ? W / 2 : o.px, py = o.py == null ? H / 2 : o.py;
    ctx.translate(px + (o.x || 0), py + (o.y || 0));
    if (o.rot) ctx.rotate(o.rot);
    ctx.scale(z, z);
    ctx.translate(-px, -py);
  }
  /* impact shake: sum of decaying noise shakes for a list of hit times */
  function shake(t, hits, amp = 22, decay = 7, freq = 18) {
    let x = 0, y = 0, r = 0;
    for (const h of hits) {
      const ht = Array.isArray(h) ? h[0] : h, ha = Array.isArray(h) ? h[1] : 1;
      const d = t - ht; if (d < 0 || d > 1.2) continue;
      const k = Math.exp(-decay * d) * amp * ha;
      x += noise(d * freq, 11 + ht * 7) * k; y += noise(d * freq, 23 + ht * 7) * k; r += noise(d * freq * 0.7, 37 + ht) * k * 0.0012;
    }
    return { x, y, rot: r };
  }

  /* ==========================================================================
     export
     ========================================================================== */
  G.M = {
    W, H, TAU, BPM, BEAT, C, clamp, lerp, inv, smooth, fract, Ease, bezier, spring, wobble, tw, keys,
    rng, hash1, noise, fbm, rgb, mix, mixHex, alpha,
    rr, circle, fillCircle, starPath, strokeProgress, sparkle, scribblePts, polyline, polyLen,
    STY, fontOf, setFont, measure, parseRich, layout, charXs, drawText, text, fitSize, TX,
    drawBot, botPath, drawPerson, Icon, icon, confetti, burstLines, ring,
    grain, paper, vignette, camera, shake,
  };
})(window);

// ─────────────────────────────────────────────────────────────
//  core.js — deterministic motion toolkit (pure functions of time)
// ─────────────────────────────────────────────────────────────
(function (G) {
  const W = 1080, H = 1920, FPS = 30, BPM = 120, BEAT = 60 / BPM, BAR = BEAT * 4;
  const TAU = Math.PI * 2;

  // ── scalar helpers ─────────────────────────────────────────
  const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
  const lerp = (a, b, t) => a + (b - a) * t;
  const prog = (t, a, b) => clamp((t - a) / (b - a));
  const remap = (x, a, b, c, d, ease) => {
    const p = prog(x, a, b);
    return c + (d - c) * (ease ? ease(p) : p);
  };
  const smooth = (t) => t * t * (3 - 2 * t);
  const pulse = (t, a, attack, release) => // quick attack, exp release
    t < a ? 0 : t < a + attack ? (t - a) / attack : Math.exp(-(t - a - attack) / release);
  const tri = (x) => 1 - Math.abs(((x % 2) + 2) % 2 - 1);
  const fract = (x) => x - Math.floor(x);

  // ── easing ────────────────────────────────────────────────
  const Ease = {
    lin: (t) => t,
    inQuad: (t) => t * t,
    outQuad: (t) => t * (2 - t),
    inOutQuad: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
    inCubic: (t) => t * t * t,
    outCubic: (t) => 1 - Math.pow(1 - t, 3),
    inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    inQuart: (t) => t * t * t * t,
    outQuart: (t) => 1 - Math.pow(1 - t, 4),
    inOutQuart: (t) => (t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2),
    inQuint: (t) => t * t * t * t * t,
    outQuint: (t) => 1 - Math.pow(1 - t, 5),
    inOutQuint: (t) => (t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2),
    inExpo: (t) => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10)),
    outExpo: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
    inOutExpo: (t) =>
      t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2,
    inCirc: (t) => 1 - Math.sqrt(1 - t * t),
    outCirc: (t) => Math.sqrt(1 - Math.pow(t - 1, 2)),
    inOutCirc: (t) =>
      t < 0.5 ? (1 - Math.sqrt(1 - Math.pow(2 * t, 2))) / 2 : (Math.sqrt(1 - Math.pow(-2 * t + 2, 2)) + 1) / 2,
    outBack: (t, s = 1.70158) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2),
    inBack: (t, s = 1.70158) => (s + 1) * t * t * t - s * t * t,
    inOutBack: (t, s = 1.70158 * 1.525) =>
      t < 0.5
        ? (Math.pow(2 * t, 2) * ((s + 1) * 2 * t - s)) / 2
        : (Math.pow(2 * t - 2, 2) * ((s + 1) * (t * 2 - 2) + s) + 2) / 2,
    outElastic: (t) =>
      t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1,
  };
  // CSS-style cubic-bezier for designer curves
  function bezier(x1, y1, x2, y2) {
    const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
    const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    const sx = (t) => ((ax * t + bx) * t + cx) * t;
    const sy = (t) => ((ay * t + by) * t + cy) * t;
    const dsx = (t) => (3 * ax * t + 2 * bx) * t + cx;
    return (x) => {
      if (x <= 0) return 0;
      if (x >= 1) return 1;
      let t = x;
      for (let i = 0; i < 8; i++) {
        const e = sx(t) - x;
        if (Math.abs(e) < 1e-6) break;
        const d = dsx(t);
        if (Math.abs(d) < 1e-6) break;
        t -= e / d;
      }
      t = clamp(t);
      return sy(t);
    };
  }
  Ease.snap = bezier(0.16, 1, 0.3, 1); // fast-in, long settle
  Ease.swift = bezier(0.7, 0, 0.2, 1); // strong in-out
  Ease.whip = bezier(0.85, 0, 0.15, 1); // whip-pan
  Ease.anticip = bezier(0.6, -0.35, 0.3, 1.4); // anticipation + overshoot

  // Damped spring (closed form), returns 0→1 with overshoot, t in seconds since trigger
  function spring(t, freq = 3.2, damp = 0.32) {
    if (t <= 0) return 0;
    const w = TAU * freq, z = damp;
    if (z >= 1) return 1 - Math.exp(-w * t) * (1 + w * t);
    const wd = w * Math.sqrt(1 - z * z);
    return 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + ((z * w) / wd) * Math.sin(wd * t));
  }

  // keyframes: [[t, value, ease?], ...] ; value number or array
  function kf(t, keys) {
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) {
      const [t1, v1, e] = keys[i];
      if (t <= t1) {
        const [t0, v0] = keys[i - 1];
        let p = (t - t0) / (t1 - t0);
        p = e ? e(p) : p;
        if (Array.isArray(v0)) return v0.map((a, j) => a + (v1[j] - a) * p);
        return v0 + (v1 - v0) * p;
      }
    }
    return keys[keys.length - 1][1];
  }

  // ── hashing / noise ───────────────────────────────────────
  function ihash(x) {
    x |= 0;
    x = Math.imul(x ^ (x >>> 16), 0x7feb352d);
    x = Math.imul(x ^ (x >>> 15), 0x846ca68b);
    return (x ^ (x >>> 16)) >>> 0;
  }
  const rnd = (i, seed = 0) => ihash((i | 0) * 0x9e3779b1 + ihash(seed * 0x85ebca77 + 0x27d4eb2f)) / 4294967296;
  const rndr = (i, seed, a, b) => a + (b - a) * rnd(i, seed);
  function noise1(x, seed = 0) {
    const i = Math.floor(x), f = x - i;
    const u = f * f * (3 - 2 * f);
    return lerp(rnd(i, seed), rnd(i + 1, seed), u) * 2 - 1;
  }
  function noise2(x, y, seed = 0) {
    const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
    const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
    const h = (a, b) => rnd(a * 7919 + b * 104729, seed);
    return lerp(lerp(h(ix, iy), h(ix + 1, iy), ux), lerp(h(ix, iy + 1), h(ix + 1, iy + 1), ux), uy) * 2 - 1;
  }
  const fbm1 = (x, seed = 0) => noise1(x, seed) * 0.6 + noise1(x * 2.1, seed + 11) * 0.3 + noise1(x * 4.3, seed + 23) * 0.1;

  // ── color ─────────────────────────────────────────────────
  const hexCache = {};
  function hex(h) {
    if (hexCache[h]) return hexCache[h];
    let s = h.replace('#', '');
    if (s.length === 3) s = s.split('').map((c) => c + c).join('');
    const v = [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
    hexCache[h] = v;
    return v;
  }
  const rgba = (h, a = 1) => {
    const [r, g, b] = hex(h);
    return `rgba(${r},${g},${b},${a})`;
  };
  const mix = (h1, h2, t, a = 1) => {
    const A = hex(h1), B = hex(h2);
    return `rgba(${Math.round(lerp(A[0], B[0], t))},${Math.round(lerp(A[1], B[1], t))},${Math.round(lerp(A[2], B[2], t))},${a})`;
  };

  // Brand palette — luzzu boats + limestone + flag
  const C = {
    ink: '#0B0B10',
    ink2: '#15151E',
    navy: '#071433',
    paper: '#F4EDE0',
    stone: '#D9C9A8',
    red: '#E8202A',
    yellow: '#FFC300',
    blue: '#1E5EFF',
    green: '#18C27A',
    sky: '#6FB7FF',
    pink: '#FF5C8A',
    grey: '#8C8A99',
    white: '#FFFFFF',
  };

  // ── fonts / text ──────────────────────────────────────────
  // families registered in fonts.js:  A62..A125 (Archivo width instances), IS (Instrument Serif italic),
  // ISR (Instrument Serif regular), JB (JetBrains Mono)
  function fontStr(f = 'A', w = 800, s = 100, wd = 100) {
    if (f === 'A') {
      const wi = Math.round(clamp(wd, 62, 125));
      return `${Math.round(w)} ${s}px A${wi}`;
    }
    if (f === 'IS') return `italic 400 ${s}px IS`;
    if (f === 'ISR') return `400 ${s}px ISR`;
    if (f === 'JB') return `${Math.round(w)} ${s}px JB`;
    return `${w} ${s}px ${f}`;
  }
  function setFont(ctx, f, w, s, wd) {
    ctx.font = fontStr(f, w, s, wd);
  }
  const layoutCache = new Map();
  // Per-glyph layout honouring kerning (prefix measurement). Returns {glyphs:[{c,x,w}], width, asc, desc}
  function layout(ctx, text, f = 'A', w = 800, s = 100, wd = 100, track = 0) {
    const key = text + '|' + fontStr(f, w, s, wd) + '|' + track;
    let L = layoutCache.get(key);
    if (L) return L;
    const prevFont = ctx.font;
    ctx.font = fontStr(f, w, s, wd);
    const chars = Array.from(text);
    const glyphs = [];
    let prefix = '';
    let prevX = 0;
    for (let i = 0; i < chars.length; i++) {
      prefix += chars[i];
      const x1 = ctx.measureText(prefix).width;
      glyphs.push({ c: chars[i], x: prevX + i * track, w: x1 - prevX });
      prevX = x1;
    }
    const m = ctx.measureText(text || 'H');
    L = {
      glyphs,
      width: prevX + Math.max(0, chars.length - 1) * track,
      asc: m.fontBoundingBoxAscent || s * 0.8,
      desc: m.fontBoundingBoxDescent || s * 0.2,
      capH: s * 0.72,
    };
    ctx.font = prevFont;
    if (layoutCache.size > 5000) layoutCache.clear();
    layoutCache.set(key, L);
    return L;
  }
  function textWidth(ctx, text, f, w, s, wd, track = 0) {
    return layout(ctx, text, f, w, s, wd, track).width;
  }
  // font size that makes `text` exactly `target` px wide
  function fitSize(ctx, text, target, f = 'A', w = 800, wd = 100, track = 0) {
    const w100 = textWidth(ctx, text, f, w, 100, wd, track);
    return (100 * target) / w100;
  }

  // Draw text glyph-by-glyph with a per-glyph modifier fn(i, g, n) -> {dx,dy,sx,sy,rot,alpha,color,skip}
  function drawGlyphs(ctx, text, x, y, opt, fn) {
    const { f = 'A', w = 800, s = 100, wd = 100, track = 0, align = 'left', color = '#fff' } = opt;
    const L = layout(ctx, text, f, w, s, wd, track);
    let ox = x;
    if (align === 'center') ox = x - L.width / 2;
    else if (align === 'right') ox = x - L.width;
    ctx.font = fontStr(f, w, s, wd);
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
    const n = L.glyphs.length;
    for (let i = 0; i < n; i++) {
      const g = L.glyphs[i];
      if (g.c === ' ') continue;
      const m = fn ? fn(i, g, n) : null;
      if (m && m.skip) continue;
      const alpha = m && m.alpha != null ? m.alpha : 1;
      if (alpha <= 0.002) continue;
      const cx = ox + g.x + g.w / 2;
      const cy = y - s * 0.36; // approx visual center of caps
      ctx.save();
      ctx.globalAlpha *= alpha;
      ctx.fillStyle = (m && m.color) || color;
      ctx.translate(cx + ((m && m.dx) || 0), cy + ((m && m.dy) || 0));
      if (m && m.rot) ctx.rotate(m.rot);
      if (m && (m.sx != null || m.sy != null)) ctx.scale(m.sx != null ? m.sx : 1, m.sy != null ? m.sy : 1);
      if (m && m.stroke) {
        ctx.lineWidth = m.stroke;
        ctx.strokeStyle = m.strokeColor || ctx.fillStyle;
        ctx.lineJoin = 'round';
        ctx.strokeText(g.c, -g.w / 2, s * 0.36);
        if (m.fill !== false) ctx.fillText(g.c, -g.w / 2, s * 0.36);
      } else ctx.fillText(g.c, -g.w / 2, s * 0.36);
      ctx.restore();
    }
    return L;
  }

  function text(ctx, str, x, y, opt = {}) {
    const { f = 'A', w = 800, s = 100, wd = 100, align = 'left', color = '#fff', track = 0, alpha = 1, baseline = 'alphabetic' } = opt;
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.font = fontStr(f, w, s, wd);
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.textBaseline = baseline;
    if (track) ctx.letterSpacing = track + 'px';
    ctx.fillText(str, x, y);
    ctx.restore();
  }

  // ── drawing helpers ───────────────────────────────────────
  function rrect(ctx, x, y, w, h, r) {
    r = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function circle(ctx, x, y, r) {
    ctx.beginPath();
    ctx.arc(x, y, Math.max(0, r), 0, TAU);
  }
  function glowDot(ctx, x, y, r, col, a = 1) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rgba(col, a));
    g.addColorStop(0.25, rgba(col, a * 0.45));
    g.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  // Offscreen buffers (pooled by name)
  const buffers = {};
  function buf(name, w = W, h = H) {
    let b = buffers[name];
    if (!b || b.c.width !== w || b.c.height !== h) {
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      b = buffers[name] = { c, x: c.getContext('2d', { willReadFrequently: false }) };
    }
    b.x.setTransform(1, 0, 0, 1, 0, 0);
    b.x.globalAlpha = 1;
    b.x.globalCompositeOperation = 'source-over';
    b.x.filter = 'none';
    b.x.clearRect(0, 0, w, h);
    return b;
  }

  // Camera shake from a list of impact times
  function shake(t, hits, amp = 18, decay = 9, freq = 22) {
    let dx = 0, dy = 0, r = 0;
    for (const h of hits) {
      const ht = Array.isArray(h) ? h[0] : h;
      const ha = Array.isArray(h) ? h[1] : 1;
      const dt = t - ht;
      if (dt < 0 || dt > 1.2) continue;
      const e = Math.exp(-decay * dt) * amp * ha;
      dx += noise1(dt * freq, ht * 100) * e;
      dy += noise1(dt * freq, ht * 100 + 7) * e;
      r += noise1(dt * freq * 0.7, ht * 100 + 13) * e * 0.0012;
    }
    return { dx, dy, r };
  }

  // 3D projection helper. cam: {x,y,z, yaw, pitch, roll, fov(focal px)}
  function makeCam(c) {
    const cy = Math.cos(c.yaw || 0), sy = Math.sin(c.yaw || 0);
    const cp = Math.cos(c.pitch || 0), sp = Math.sin(c.pitch || 0);
    const cr = Math.cos(c.roll || 0), sr = Math.sin(c.roll || 0);
    const f = c.fov || 1400, ox = c.cx != null ? c.cx : W / 2, oy = c.cy != null ? c.cy : H / 2;
    return function project(x, y, z) {
      // translate
      let X = x - (c.x || 0), Y = y - (c.y || 0), Z = z - (c.z || 0);
      // yaw (around Y)
      let x1 = X * cy - Z * sy, z1 = X * sy + Z * cy;
      // pitch (around X)
      let y1 = Y * cp - z1 * sp, z2 = Y * sp + z1 * cp;
      // roll
      const x2 = x1 * cr - y1 * sr, y2 = x1 * sr + y1 * cr;
      const d = z2 + (c.dist || 0);
      const s = d > 1 ? f / d : 0;
      return { x: ox + x2 * s, y: oy + y2 * s, s, z: d };
    };
  }

  G.M = {
    W, H, FPS, BPM, BEAT, BAR, TAU,
    clamp, lerp, prog, remap, smooth, pulse, tri, fract,
    Ease, bezier, spring, kf,
    ihash, rnd, rndr, noise1, noise2, fbm1,
    hex, rgba, mix, C,
    fontStr, setFont, layout, textWidth, fitSize, drawGlyphs, text,
    rrect, circle, glowDot, buf, shake, makeCam,
  };
})(window);

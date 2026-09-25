/* Mesura reel engine · lib.js
   Deterministic drawing toolkit. Every helper is a pure function of its inputs,
   so any frame can be rendered in isolation (parallel renders, scrubbing, loops). */
(function (G) {
  'use strict';
  const M = (G.M = {});
  M.W = 1080;
  M.H = 1920;
  const TAU = (M.TAU = Math.PI * 2);

  // ------------------------------------------------------------------ math
  const clamp = (M.clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x));
  const lerp = (M.lerp = (a, b, t) => a + (b - a) * t);
  M.prog = (t, a, b) => clamp((t - a) / (b - a));
  M.fract = (x) => x - Math.floor(x);
  M.mod = (a, n) => ((a % n) + n) % n;
  M.deg = (d) => (d * Math.PI) / 180;
  M.smoothstep = (a, b, x) => {
    const t = clamp((x - a) / (b - a));
    return t * t * (3 - 2 * t);
  };

  // ---------------------------------------------------------------- easing
  const E = (M.E = {
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
    inQuint: (t) => t * t * t * t * t,
    outQuint: (t) => 1 - Math.pow(1 - t, 5),
    inOutQuint: (t) => (t < 0.5 ? 16 * Math.pow(t, 5) : 1 - Math.pow(-2 * t + 2, 5) / 2),
    inExpo: (t) => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10)),
    outExpo: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
    inOutExpo: (t) =>
      t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2,
    inSine: (t) => 1 - Math.cos((t * Math.PI) / 2),
    outSine: (t) => Math.sin((t * Math.PI) / 2),
    inOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
    outCirc: (t) => Math.sqrt(1 - Math.pow(t - 1, 2)),
    outBack: (t, s = 1.70158) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2),
    inBack: (t, s = 1.70158) => (s + 1) * t * t * t - s * t * t,
  });

  // CSS-style cubic-bezier, solved with Newton + bisection fallback.
  M.bezier = (x1, y1, x2, y2) => {
    const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
    const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    const sx = (s) => ((ax * s + bx) * s + cx) * s;
    const sy = (s) => ((ay * s + by) * s + cy) * s;
    const dx = (s) => (3 * ax * s + 2 * bx) * s + cx;
    return (t) => {
      if (t <= 0) return 0;
      if (t >= 1) return 1;
      let s = t;
      for (let i = 0; i < 8; i++) {
        const x = sx(s) - t;
        if (Math.abs(x) < 1e-7) return sy(s);
        const d = dx(s);
        if (Math.abs(d) < 1e-6) break;
        s -= x / d;
      }
      let a = 0, b = 1;
      s = t;
      for (let i = 0; i < 40; i++) {
        const x = sx(s);
        if (Math.abs(x - t) < 1e-7) break;
        if (x < t) a = s; else b = s;
        s = (a + b) / 2;
      }
      return sy(s);
    };
  };
  E.brand = M.bezier(0.4, 0, 0.2, 1); // design-system --ease
  E.snap = M.bezier(0.75, 0, 0.12, 1); // transitions: committed in, soft landing
  E.glide = M.bezier(0.16, 1, 0.3, 1); // long, luxurious ease-out
  E.whip = M.bezier(0.85, 0, 0.15, 1); // whip pans

  // Damped spring 0→1 (t in seconds-ish units, f natural freq, z damping ratio)
  M.spring = (t, f = 2, z = 0.5) => {
    if (t <= 0) return 0;
    const w = TAU * f, wd = w * Math.sqrt(1 - z * z);
    return 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + ((z * w) / wd) * Math.sin(wd * t));
  };

  // Eased progress of t through [a, a + d]
  M.tw = (t, a, d, e = E.outExpo) => e(clamp((t - a) / d));

  // Keyframes: [[t, v, easeToNext], ...], numbers or arrays
  M.kf = (t, keys) => {
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 0; i < keys.length - 1; i++) {
      const k0 = keys[i], k1 = keys[i + 1];
      if (t < k1[0]) {
        const p = (k0[2] || E.inOutCubic)((t - k0[0]) / (k1[0] - k0[0]));
        const a = k0[1], b = k1[1];
        return Array.isArray(a) ? a.map((x, j) => lerp(x, b[j], p)) : lerp(a, b, p);
      }
    }
    return keys[keys.length - 1][1];
  };

  // ------------------------------------------------------- random & noise
  const hash32 = (x) => {
    x |= 0;
    x ^= x >>> 16; x = Math.imul(x, 0x7feb352d);
    x ^= x >>> 15; x = Math.imul(x, 0x846ca68b);
    x ^= x >>> 16;
    return x >>> 0;
  };
  M.rand = (i, seed = 0) => hash32((i | 0) * 374761393 + (seed | 0) * 668265263 + 1013904223) / 4294967296;
  M.rr = (i, seed, a, b) => a + (b - a) * M.rand(i, seed);
  M.noise = (x, seed = 0) => {
    const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
    return lerp(M.rand(i, seed), M.rand(i + 1, seed), u) * 2 - 1;
  };
  M.noise2 = (x, y, seed = 0) => {
    const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
    const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
    const h = (a, b) => M.rand(a * 7919 + b * 104729, seed);
    const v = lerp(lerp(h(ix, iy), h(ix + 1, iy), ux), lerp(h(ix, iy + 1), h(ix + 1, iy + 1), ux), uy);
    return v * 2 - 1;
  };

  // ------------------------------------------------------------- colour
  M.P = {
    paper: '#F2EDE3', paperSunken: '#EAE4D6', surface: '#FFFFFF', border: '#E3DCCC', borderStrong: '#D3CBB9',
    ink: '#22362F', inkBody: '#45534D', inkMuted: '#6E7A73', inkFaint: '#A5A199',
    pine: '#1D4A43', pineHover: '#163B35', pineActive: '#102C28', pineSoft: '#DCE5DF', onPine: '#F6F2E9',
    ochre: '#D19C3F', ochreHover: '#BC8A33', ochreSoft: '#F3E6C9', onOchre: '#3B2E12',
    positive: '#2E7D5B', caution: '#B07C2A', negative: '#A94436', info: '#3D6B8E',
  };
  M.D = {
    paper: '#15211D', paperSunken: '#101A17', surface: '#1D2C27', border: '#2B3D37', borderStrong: '#3A4F48',
    ink: '#EFEAE0', inkBody: '#C2CAC4', inkMuted: '#8D9891', inkFaint: '#66716B',
    ochre: '#DFAC52', ochreSoft: '#35301F', pineSoft: '#24352F', onPine: '#172621', mint: '#7FB3A6', mint2: '#8FC0B3',
  };
  const rgbCache = {};
  M.rgb = (hex) =>
    rgbCache[hex] ||
    (rgbCache[hex] = [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)]);
  M.rgba = (hex, a = 1) => {
    const c = M.rgb(hex);
    return `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  };
  M.mix = (h1, h2, t, a = 1) => {
    const A = M.rgb(h1), B = M.rgb(h2);
    t = clamp(t);
    return `rgba(${Math.round(lerp(A[0], B[0], t))},${Math.round(lerp(A[1], B[1], t))},${Math.round(lerp(A[2], B[2], t))},${a})`;
  };
  M.mixHex = (h1, h2, t) => {
    const A = M.rgb(h1), B = M.rgb(h2);
    t = clamp(t);
    const h = (v) => Math.round(v).toString(16).padStart(2, '0');
    return '#' + h(lerp(A[0], B[0], t)) + h(lerp(A[1], B[1], t)) + h(lerp(A[2], B[2], t));
  };

  // ------------------------------------------------------------- fonts
  const FAM = { serif: 'MSerif', serifI: 'MSerifI', text: 'MSerifText', sans: 'MInter', mono: 'MMono' };
  M.FAM = FAM;
  M.fontFiles = [
    ['MSerif', 400, 'serif-display-400'], ['MSerif', 500, 'serif-display-500'], ['MSerif', 600, 'serif-display-600'],
    ['MSerifI', 500, 'serif-display-500-italic'], ['MSerifText', 500, 'serif-text-500'],
    ['MInter', 400, 'inter-400'], ['MInter', 500, 'inter-500'], ['MInter', 600, 'inter-600'],
    ['MMono', 400, 'mono-400'], ['MMono', 500, 'mono-500'],
  ];
  // srcFor(file) -> url or data URI (lets the single-file build inline fonts)
  M.loadFonts = async (srcFor) => {
    await Promise.all(
      M.fontFiles.map(async ([fam, w, file]) => {
        const ff = new FontFace(fam, `url(${srcFor(file)})`, { weight: String(w) });
        await ff.load();
        document.fonts.add(ff);
      })
    );
  };
  M.font = (fam, weight, size) => `${weight} ${size}px ${FAM[fam] || fam}`;

  // ------------------------------------------------------- text layout
  const LCACHE = new Map();
  const metricsCache = new Map();
  M.fontMetrics = (ctx, fam, weight, size) => {
    const key = fam + weight + '|' + size;
    let m = metricsCache.get(key);
    if (m) return m;
    ctx.save();
    ctx.font = M.font(fam, weight, size);
    ctx.letterSpacing = '0px';
    const a = ctx.measureText('Hxgjpy|ÉÅ');
    const h = ctx.measureText('H');
    const x = ctx.measureText('x');
    const fig = ctx.measureText('0123456789');
    m = {
      asc: a.fontBoundingBoxAscent, desc: a.fontBoundingBoxDescent,
      inkAsc: a.actualBoundingBoxAscent, inkDesc: a.actualBoundingBoxDescent,
      cap: h.actualBoundingBoxAscent, xh: x.actualBoundingBoxAscent,
      fig: fig.actualBoundingBoxAscent,
    };
    ctx.restore();
    metricsCache.set(key, m);
    return m;
  };

  // Lays out one line; glyph x positions come from prefix measurement, so kerning is preserved.
  M.layoutLine = (ctx, raw, fam, weight, size, lsEm = 0) => {
    const key = fam + weight + '|' + size + '|' + lsEm + '|' + raw;
    let L = LCACHE.get(key);
    if (L) return L;
    // '*' toggles accent spans
    let text = '';
    const accent = [];
    let on = false;
    for (const ch of raw) {
      if (ch === '*') { on = !on; continue; }
      text += ch;
      accent.push(on);
    }
    ctx.save();
    ctx.font = M.font(fam, weight, size);
    ctx.letterSpacing = lsEm * size + 'px';
    const glyphs = [];
    let prev = 0;
    for (let i = 0; i < text.length; i++) {
      const w = ctx.measureText(text.slice(0, i + 1)).width;
      glyphs.push({ ch: text[i], x: prev, w: w - prev, accent: accent[i] });
      prev = w;
    }
    const width = text.length ? prev - lsEm * size : 0;
    ctx.restore();
    const words = [];
    let cur = null;
    glyphs.forEach((g, i) => {
      if (g.ch === ' ') { cur = null; return; }
      if (!cur) { cur = { text: '', x: g.x, i0: i, accent: false }; words.push(cur); }
      cur.text += g.ch;
      cur.i1 = i;
      cur.w = g.x + g.w - cur.x;
      if (g.accent) cur.accent = true;
    });
    words.forEach((w) => (w.w -= w.i1 < glyphs.length - 1 ? 0 : lsEm * size));
    L = { text, glyphs, words, width, size, fam, weight, ls: lsEm };
    LCACHE.set(key, L);
    return L;
  };

  // Multi-line block. anchor: 'baseline' (y = first baseline) | 'top' (y = cap top) | 'middle' | 'bottom' (y = last baseline)
  M.block = (ctx, s) => {
    const fam = s.fam || 'serif', weight = s.weight || 500, size = s.size, lh = s.lh || 1.05, ls = s.ls ?? (fam.startsWith('serif') ? -0.01 : 0);
    const align = s.align || 'left', anchor = s.anchor || 'baseline';
    const mt = M.fontMetrics(ctx, fam, weight, size);
    const lhPx = size * lh;
    const n = s.lines.length;
    const span = mt.cap + (n - 1) * lhPx;
    let base0 = s.y;
    if (anchor === 'top') base0 = s.y + mt.cap;
    else if (anchor === 'middle') base0 = s.y - span / 2 + mt.cap;
    else if (anchor === 'bottom') base0 = s.y - (n - 1) * lhPx;
    const lines = s.lines.map((raw, i) => {
      const L = M.layoutLine(ctx, raw, fam, weight, size, ls);
      const x = align === 'left' ? s.x : align === 'center' ? s.x - L.width / 2 : s.x - L.width;
      return { L, x, y: base0 + i * lhPx };
    });
    const left = Math.min(...lines.map((l) => l.x));
    const right = Math.max(...lines.map((l) => l.x + l.L.width));
    return { lines, fam, weight, size, ls, mt, lhPx, top: base0 - mt.cap, bottom: base0 + (n - 1) * lhPx, left, right };
  };

  // Find the pixel box of an accent (or nth) word in a block
  M.wordBox = (B, pred) => {
    for (const ln of B.lines) {
      for (const w of ln.L.words) {
        if (pred(w)) return { x: ln.x + w.x, y: ln.y, w: w.w, cap: B.mt.cap, size: B.size };
      }
    }
    return null;
  };

  // Animated drawing of a block.
  // o = { t, color, accent, alpha, mask, in:{at,dur,stagger,by,style,ease,dist,rot}, out:{...} }
  // styles: rise | drop | fade | pop | slide | none
  M.drawBlock = (ctx, B, o) => {
    const t = o.t;
    const I = Object.assign({ at: 0, dur: 0.8, stagger: 0.06, by: 'word', style: 'rise', ease: E.outExpo, rot: 7 }, o.in || {});
    const O = o.out ? Object.assign({ dur: 0.5, stagger: 0.03, style: 'rise', ease: E.inExpo, rot: 0 }, o.out) : null;
    const byIn = I.by;
    const mask = o.mask !== false;
    const mt = B.mt;
    const boxH = mt.asc + mt.desc;
    const alphaAll = o.alpha ?? 1;
    if (alphaAll <= 0) return;
    // enumerate units
    const units = [];
    B.lines.forEach((ln, li) => {
      if (byIn === 'line') units.push({ li, text: ln.L.text, x: 0, w: ln.L.width, accent: false, glyphs: ln.L.glyphs });
      else if (byIn === 'char')
        ln.L.glyphs.forEach((g) => g.ch !== ' ' && units.push({ li, text: g.ch, x: g.x, w: g.w, accent: g.accent }));
      else ln.L.words.forEach((w) => units.push({ li, text: w.text, x: w.x, w: w.w, accent: w.accent }));
    });
    const N = units.length;
    const oStag = O ? O.stagger : 0;
    ctx.save();
    ctx.font = M.font(B.fam, B.weight, B.size);
    ctx.letterSpacing = B.ls * B.size + 'px';
    ctx.textBaseline = 'alphabetic';
    let curLine = -1;
    let clipped = false;
    for (let k = 0; k < N; k++) {
      const u = units[k];
      const ln = B.lines[u.li];
      const pin = I.style === 'none' ? 1 : I.ease(clamp((t - I.at - k * I.stagger) / I.dur));
      const pout = O ? O.ease(clamp((t - O.at - (O.reverse ? N - 1 - k : k) * oStag) / O.dur)) : 0;
      if (pin <= 0.0005 || pout >= 0.9995) continue;
      if (u.li !== curLine) {
        if (clipped) ctx.restore();
        clipped = false;
        curLine = u.li;
        const needMask = mask && (I.style === 'rise' || I.style === 'drop' || (O && (O.style === 'rise' || O.style === 'sink')));
        if (needMask) {
          ctx.save();
          clipped = true;
          ctx.beginPath();
          const pad = B.size * 0.35;
          ctx.rect(ln.x - pad, ln.y - mt.asc - 2, ln.L.width + pad * 2, boxH + 4 + (o.maskExtra || 0));
          ctx.clip();
        }
      }
      let dx = 0, dy = 0, rot = 0, sc = 1, a = 1;
      // in
      if (I.style === 'rise') { dy += (1 - pin) * boxH * 1.02; rot += (1 - pin) * I.rot; }
      else if (I.style === 'drop') { dy -= (1 - pin) * boxH * 1.02; rot -= (1 - pin) * I.rot; }
      else if (I.style === 'fade') { dy += (1 - pin) * (I.dist ?? B.size * 0.3); a *= pin; }
      else if (I.style === 'pop') { sc *= lerp(I.from ?? 0.4, 1, pin); a *= clamp(pin * 3); }
      else if (I.style === 'slide') { dx += (1 - pin) * (I.dist ?? 120); a *= clamp(pin * 2); }
      // out
      if (O) {
        if (O.style === 'rise') { dy -= pout * boxH * 1.02; rot -= pout * O.rot; }
        else if (O.style === 'sink') { dy += pout * boxH * 1.02; }
        else if (O.style === 'fade') { a *= 1 - pout; dy -= pout * (O.dist ?? 0); }
        else if (O.style === 'pop') { sc *= 1 - pout; }
      }
      const col = u.accent && o.accent ? o.accent : o.color;
      ctx.globalAlpha = alphaAll * a;
      ctx.fillStyle = col;
      const x = ln.x + u.x, y = ln.y;
      if (rot || sc !== 1) {
        ctx.save();
        const px = I.style === 'pop' ? x + u.w / 2 : x, py = I.style === 'pop' ? y - mt.cap / 2 : y;
        ctx.translate(px + dx, py + dy);
        ctx.rotate(M.deg(rot));
        ctx.scale(sc, sc);
        ctx.fillText(u.text, x - px, y - py);
        ctx.restore();
      } else {
        ctx.fillText(u.text, x + dx, y + dy);
      }
    }
    if (clipped) ctx.restore();
    ctx.restore();
  };

  // Convenience: layout + draw in one call; returns the block
  M.text = (ctx, s, o) => {
    const B = M.block(ctx, s);
    M.drawBlock(ctx, B, o);
    return B;
  };

  // Simple static label (no animation), returns width
  M.label = (ctx, str, x, y, { fam = 'sans', weight = 600, size = 28, color = '#000', ls = 0.12, align = 'left', alpha = 1, upper = true } = {}) => {
    const s = upper ? str.toUpperCase() : str;
    const L = M.layoutLine(ctx, s, fam, weight, size, ls);
    ctx.save();
    ctx.font = M.font(fam, weight, size);
    ctx.letterSpacing = ls * size + 'px';
    ctx.fillStyle = color;
    ctx.globalAlpha *= alpha;
    const xx = align === 'left' ? x : align === 'center' ? x - L.width / 2 : x - L.width;
    ctx.fillText(L.text, xx, y);
    ctx.restore();
    return L.width;
  };

  // Typewriter (mono)
  M.typewrite = (ctx, str, x, y, p, { fam = 'mono', weight = 400, size = 28, color, ls = 0.02, cursor = true, t = 0, align = 'left', alpha = 1 } = {}) => {
    const n = Math.floor(clamp(p) * str.length + 1e-6);
    const L = M.layoutLine(ctx, str, fam, weight, size, ls);
    const xx = align === 'left' ? x : align === 'center' ? x - L.width / 2 : x - L.width;
    ctx.save();
    ctx.font = M.font(fam, weight, size);
    ctx.letterSpacing = ls * size + 'px';
    ctx.fillStyle = color;
    ctx.globalAlpha *= alpha;
    ctx.fillText(str.slice(0, n), xx, y);
    if (cursor && p > 0 && (p < 1 || Math.floor(t * 2.2) % 2 === 0)) {
      const cx = n > 0 ? xx + L.glyphs[n - 1].x + L.glyphs[n - 1].w : xx;
      ctx.fillRect(cx + 2, y - size * 0.78, size * 0.55, size * 0.95);
    }
    ctx.restore();
    return L.width;
  };

  // Odometer. value is continuous; columns roll like a mechanical counter.
  // opts: {x, y (baseline), size, fam, weight, color, decimals, digits (integer columns), suffix, suffixColor,
  //        suffixP (0..1 pop-in), align, hideLeadingZeros, colGap}
  M.odometer = (ctx, value, o) => {
    const fam = o.fam || 'serif', weight = o.weight || 500, size = o.size;
    const dec = o.decimals ?? 1, ints = o.digits ?? 2;
    const mt = M.fontMetrics(ctx, fam, weight, size);
    ctx.save();
    ctx.font = M.font(fam, weight, size);
    ctx.letterSpacing = '0px';
    let dw = 0;
    for (let d = 0; d < 10; d++) dw = Math.max(dw, ctx.measureText(String(d)).width);
    dw *= o.colScale ?? 0.94;
    const dotW = ctx.measureText('.').width * 1.05;
    const suf = o.suffix || '';
    const sufW = suf ? ctx.measureText(suf).width : 0;
    // columns: ints..., '.', decimals...
    const cols = [];
    for (let i = ints - 1; i >= 0; i--) cols.push({ place: Math.pow(10, i) });
    if (dec > 0) cols.push({ dot: true });
    for (let i = 1; i <= dec; i++) cols.push({ place: Math.pow(10, -i) });
    // leading zero suppression → dynamic width so the number stays optically centred
    const v = Math.max(0, value);
    let lead = 0;
    if (o.hideLeadingZeros !== false) {
      for (let i = 0; i < ints - 1; i++) {
        const place = Math.pow(10, ints - 1 - i);
        const vis = clamp(v / place); // 0 → hidden, 1 → fully present
        lead += 1 - vis;
        cols[i].vis = vis;
      }
    }
    let total = 0;
    cols.forEach((c) => { c.w = c.dot ? dotW : dw * (c.vis ?? 1); total += c.w; });
    total += sufW * (o.suffixSpace ?? 1);
    let x = o.align === 'center' ? o.x - total / 2 : o.align === 'right' ? o.x - total : o.x;
    const y = o.y;
    const step = size * (o.step ?? 1.0);
    const top = y - mt.fig - size * 0.08, h = mt.fig + size * 0.16;
    ctx.fillStyle = o.color;
    const lowest = Math.pow(10, -dec);
    for (const c of cols) {
      if (c.dot) {
        ctx.fillText('.', x + (dotW - ctx.measureText('.').width) / 2, y);
        x += c.w;
        continue;
      }
      if ((c.vis ?? 1) <= 0.001) { continue; }
      // continuous column position
      const q = v / c.place;
      let pos;
      if (c.place <= lowest + 1e-9) pos = q;
      else {
        const fl = Math.floor(q + 1e-9);
        const below = (v - fl * c.place) / lowest; // how many lowest units into this cell
        const cellUnits = c.place / lowest;
        const carry = clamp((below - (cellUnits - 1)) / 1); // roll during last lowest unit
        pos = fl + carry;
      }
      const base = Math.floor(pos), f = pos - base;
      ctx.save();
      ctx.beginPath();
      ctx.rect(x - 4, top, c.w + 8, h);
      ctx.clip();
      const cw = dw;
      const colAlpha = c.vis ?? 1;
      ctx.globalAlpha *= colAlpha;
      for (let k = -1; k <= 2; k++) {
        const d = M.mod(base + k, 10);
        const dy = (k - f) * step;
        if (Math.abs(dy) > h + step) continue;
        const gw = ctx.measureText(String(d)).width;
        ctx.fillText(String(d), x + (c.w - gw) / 2 - (cw - c.w) / 2 * 0, y + dy);
      }
      ctx.restore();
      x += c.w;
    }
    if (suf) {
      const p = o.suffixP ?? 1;
      if (p > 0) {
        ctx.save();
        ctx.fillStyle = o.suffixColor || o.color;
        const sx = x + (o.suffixGap ?? 0);
        const sc = lerp(0.3, 1, E.outBack(p, 2.2));
        ctx.translate(sx + sufW / 2, y - mt.fig / 2);
        ctx.scale(sc, sc);
        ctx.globalAlpha *= clamp(p * 2.5);
        ctx.fillText(suf, -sufW / 2, mt.fig / 2);
        ctx.restore();
      }
    }
    ctx.restore();
    return { width: total, left: o.align === 'center' ? o.x - total / 2 : o.x, top, h };
  };

  // ------------------------------------------------------------- shapes
  M.rrect = (ctx, x, y, w, h, r) => {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, Math.min(r, w / 2, h / 2));
  };
  M.pill = (ctx, x, y, w, h) => M.rrect(ctx, x, y, w, h, h / 2);

  // Mesura mark: 20-vertex rosette (from the brand SVG, 24×24 box, centre 12,12)
  M.LOGO_PTS = [
    [12, 2], [13.8, 5.6], [18, 4.2], [16.6, 8], [20.4, 10], [17, 12], [20.4, 14], [16.6, 16], [18, 19.8], [13.8, 18.4],
    [12, 22], [10.2, 18.4], [6, 19.8], [7.4, 16], [3.6, 14], [7, 12], [3.6, 10], [7.4, 8], [6, 4.2], [10.2, 5.6],
  ];
  // Dense resample of the outline (for smooth morphs)
  const SUB = 10;
  M.LOGO_DENSE = (() => {
    const out = [];
    const P = M.LOGO_PTS;
    for (let i = 0; i < P.length; i++) {
      const a = P[i], b = P[(i + 1) % P.length];
      for (let s = 0; s < SUB; s++) {
        const t = s / SUB;
        out.push([lerp(a[0], b[0], t) - 12, lerp(a[1], b[1], t) - 12]);
      }
    }
    return out;
  })();
  // Draws the mark. size = rendered width of the 24-unit box.
  // o: {rot (rad), color, morph (0 star → 1 circle), circleR (units), hole (0..1 hole scale), holeR (units),
  //     spin, stroke, lineWidth, alpha, rays}
  M.mark = (ctx, cx, cy, size, o = {}) => {
    const s = size / 24;
    const morph = o.morph || 0;
    const cr = o.circleR ?? 8.2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(o.rot || 0);
    ctx.scale(s, s);
    ctx.beginPath();
    const D = M.LOGO_DENSE;
    for (let i = 0; i < D.length; i++) {
      let [x, y] = D[i];
      if (morph > 0) {
        const ang = Math.atan2(y, x);
        const tx = Math.cos(ang) * cr, ty = Math.sin(ang) * cr;
        x = lerp(x, tx, morph);
        y = lerp(y, ty, morph);
      }
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    const holeR = (o.holeR ?? 3.4) * (o.hole ?? 1);
    if (holeR > 0.01) {
      ctx.moveTo(holeR, 0);
      ctx.arc(0, 0, holeR, 0, TAU, true);
    }
    ctx.globalAlpha *= o.alpha ?? 1;
    if (o.stroke) {
      ctx.lineWidth = (o.lineWidth || 2) / s;
      ctx.lineJoin = 'round';
      ctx.strokeStyle = o.stroke;
      ctx.stroke();
    }
    if (o.color) {
      ctx.fillStyle = o.color;
      ctx.fill('evenodd');
    }
    ctx.restore();
  };

  // Logo lockup: mark + "mesura" wordmark. size = cap-ish scale (wordmark font size).
  // reveal: 0..1 wordmark wipe; markP: mark scale-in progress
  M.lockup = (ctx, x, y, size, o = {}) => {
    const markSize = size * 1.0;
    const gap = size * 0.36;
    const L = M.layoutLine(ctx, 'mesura', 'serif', 600, size, -0.01);
    const total = markSize + gap + L.width;
    const x0 = o.align === 'center' ? x - total / 2 : x;
    const mt = M.fontMetrics(ctx, 'serif', 600, size);
    const midY = y - mt.xh / 2; // optical middle on x-height
    M.mark(ctx, x0 + markSize / 2, midY, markSize, { color: o.markColor || M.P.ochre, rot: o.rot || 0, morph: o.morph || 0, hole: o.hole ?? 1, alpha: o.markAlpha ?? 1 });
    const rv = o.reveal ?? 1;
    if (rv > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(x0 + markSize + gap - 10, y - size, (L.width + 20) * rv, size * 1.6);
      ctx.clip();
      ctx.font = M.font('serif', 600, size);
      ctx.letterSpacing = -0.01 * size + 'px';
      ctx.fillStyle = o.color || M.P.pine;
      const slide = (1 - E.outExpo(rv)) * -size * 0.5;
      ctx.fillText('mesura', x0 + markSize + gap + slide, y);
      ctx.restore();
    }
    return { x0, total, markCx: x0 + markSize / 2, markCy: midY, markSize, textX: x0 + markSize + gap, width: L.width };
  };

  // Dimension line (technical-drawing style): end ticks + arrowheads, draws from centre outwards with p
  M.dimLine = (ctx, x1, y1, x2, y2, o = {}) => {
    const p = o.p ?? 1;
    if (p <= 0) return;
    const color = o.color || '#000', lw = o.lw || 3, tick = o.tick ?? 26, ah = o.arrow ?? 16;
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len;
    const nx = -uy, ny = ux;
    const e = E.outExpo(p);
    const ax = lerp(mx, x1, e), ay = lerp(my, y1, e), bx = lerp(mx, x2, e), by = lerp(my, y2, e);
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = lw;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.stroke();
    const tp = clamp((p - 0.35) / 0.65);
    if (tp > 0) {
      const tl = tick * E.outBack(tp);
      ctx.beginPath();
      ctx.moveTo(x1 + nx * tl / 2, y1 + ny * tl / 2); ctx.lineTo(x1 - nx * tl / 2, y1 - ny * tl / 2);
      ctx.moveTo(x2 + nx * tl / 2, y2 + ny * tl / 2); ctx.lineTo(x2 - nx * tl / 2, y2 - ny * tl / 2);
      ctx.stroke();
      const al = ah * E.outBack(tp);
      const head = (x, y, sx, sy) => {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + sx * al + nx * al * 0.42, y + sy * al + ny * al * 0.42);
        ctx.lineTo(x + sx * al - nx * al * 0.42, y + sy * al - ny * al * 0.42);
        ctx.closePath();
        ctx.fill();
      };
      head(x1, y1, ux, uy);
      head(x2, y2, -ux, -uy);
    }
    ctx.restore();
  };

  // Ruler ticks along a horizontal line. o: {n, major, len, majorLen, color, lw, p (reveal 0..1 left→right), from}
  M.ruler = (ctx, x, y, w, o = {}) => {
    const n = o.n || 50, major = o.major || 10, len = o.len || 14, mlen = o.majorLen || 30;
    const p = o.p ?? 1;
    ctx.save();
    ctx.strokeStyle = o.color || '#000';
    ctx.lineWidth = o.lw || 2;
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const f = i / n;
      const lp = clamp((p * (n + 6) - i) / 6);
      if (lp <= 0) continue;
      const L = (i % major === 0 ? mlen : i % (major / 2) === 0 ? (len + mlen) / 2 : len) * E.outCubic(lp);
      const xx = x + f * w;
      const dir = o.up ? -1 : 1;
      ctx.moveTo(xx, y);
      ctx.lineTo(xx, y + L * dir);
    }
    ctx.stroke();
    if (o.baseline !== false && p > 0) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + w * clamp(p * 1.05), y);
      ctx.stroke();
    }
    ctx.restore();
  };

  // Ring of ticks (gauge). value 0..1 = active fraction; reveal 0..1 = ticks drawn
  M.tickRing = (ctx, cx, cy, r, o = {}) => {
    const n = o.n || 100, value = o.value || 0, reveal = o.reveal ?? 1;
    const start = o.start ?? -Math.PI / 2;
    ctx.save();
    ctx.lineCap = 'butt';
    for (let i = 0; i < n; i++) {
      const f = i / n;
      const rp = clamp((reveal * (n + 12) - i) / 12);
      if (rp <= 0) continue;
      const ang = start + f * TAU;
      const active = f < value - 1e-6;
      const major = i % 10 === 0;
      const L = (active ? o.lenActive || 60 : major ? o.lenMajor || 40 : o.len || 26) * E.outCubic(rp);
      const r0 = r - L;
      ctx.strokeStyle = active ? o.active : major ? o.major || o.idle : o.idle;
      ctx.lineWidth = active ? o.lwActive || 6 : major ? o.lwMajor || 4 : o.lw || 3;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(ang) * r0, cy + Math.sin(ang) * r0);
      ctx.lineTo(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r);
      ctx.stroke();
    }
    ctx.restore();
  };

  // Badge (pill with dot), design-system style
  M.badge = (ctx, x, y, text, o = {}) => {
    const size = o.size || 30;
    const L = M.layoutLine(ctx, text, 'sans', 600, size, 0);
    const padX = size * 0.8, h = size * 1.75, dot = size * 0.36, gap = size * 0.4;
    const w = padX * 2 + dot + gap + L.width;
    const x0 = o.align === 'center' ? x - w / 2 : o.align === 'right' ? x - w : x;
    const p = o.p ?? 1;
    if (p <= 0) return { w, h, x0 };
    ctx.save();
    const sc = lerp(0.6, 1, E.outBack(clamp(p), 2.4));
    ctx.translate(x0 + w / 2, y);
    ctx.scale(sc, sc);
    ctx.globalAlpha *= clamp(p * 3) * (o.alpha ?? 1);
    ctx.translate(-(x0 + w / 2), -y);
    ctx.fillStyle = o.bg;
    M.pill(ctx, x0, y - h / 2, w, h);
    ctx.fill();
    ctx.fillStyle = o.fg;
    ctx.beginPath();
    ctx.arc(x0 + padX + dot / 2, y, dot / 2, 0, TAU);
    ctx.fill();
    ctx.font = M.font('sans', 600, size);
    ctx.letterSpacing = '0px';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x0 + padX + dot + gap, y + size * 0.04);
    ctx.restore();
    return { w, h, x0 };
  };

  // Soft glow blob
  M.glow = (ctx, x, y, r, color, a = 1) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, M.rgba(color, a));
    g.addColorStop(0.35, M.rgba(color, a * 0.35));
    g.addColorStop(1, M.rgba(color, 0));
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  };

  // ------------------------------------------------ offscreen layers
  const pool = [];
  M.buffer = (i, w = M.W, h = M.H) => {
    let b = pool[i];
    if (!b || b.c.width !== w || b.c.height !== h) {
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      b = pool[i] = { c, x: c.getContext('2d') };
    }
    return b;
  };
  let depth = 0;
  // Render drawFn into an offscreen layer, optionally masked (destination-in), then composite.
  M.layer = (ctx, drawFn, o = {}) => {
    const b = M.buffer(20 + depth++);
    const x = b.x;
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.globalAlpha = 1;
    x.globalCompositeOperation = 'source-over';
    x.filter = 'none';
    x.clearRect(0, 0, M.W, M.H);
    x.textRendering = 'geometricPrecision';
    x.setTransform(ctx.getTransform());
    drawFn(x);
    if (o.mask) {
      x.setTransform(1, 0, 0, 1, 0, 0);
      x.globalCompositeOperation = 'destination-in';
      x.globalAlpha = 1;
      o.mask(x);
      x.globalCompositeOperation = 'source-over';
    }
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = o.alpha ?? 1;
    ctx.globalCompositeOperation = o.blend || 'source-over';
    if (o.filter) ctx.filter = o.filter;
    ctx.drawImage(b.c, 0, 0);
    ctx.restore();
    depth--;
  };

  // --------------------------------------------------- 3D perspective
  // Draws a (sw × sh) source canvas as a flat card rotated in 3D about its centre, projected
  // with a pinhole camera at distance `dist`. Rendered as thin strips, each scaled by its depth,
  // which gives true foreshortening with the plain 2D canvas API.
  M.persp = (ctx, src, sw, sh, cx, cy, rotY = 0, rotX = 0, o = {}) => {
    const d = o.dist ?? 2000;
    const n = o.strips ?? 180;
    const alpha = o.alpha ?? 1;
    ctx.save();
    ctx.globalAlpha *= alpha;
    if (Math.abs(rotY) > 1e-4) {
      const c = Math.cos(rotY), s = Math.sin(rotY);
      if (c <= 0.02) { ctx.restore(); return; }
      const step = sw / n;
      for (let i = 0; i < n; i++) {
        const x0 = -sw / 2 + i * step, x1 = x0 + step;
        const k0 = d / (d + x0 * s), k1 = d / (d + x1 * s);
        const p0 = x0 * c * k0, p1 = x1 * c * k1;
        const w = p1 - p0;
        if (w <= 0) continue;
        const h = sh * (k0 + k1) * 0.5;
        ctx.drawImage(src, i * step, 0, Math.min(step + 1, sw - i * step), sh, cx + p0, cy - h / 2, w + 0.75, h);
      }
    } else if (Math.abs(rotX) > 1e-4) {
      const c = Math.cos(rotX), s = Math.sin(rotX);
      if (c <= 0.02) { ctx.restore(); return; }
      const step = sh / n;
      for (let i = 0; i < n; i++) {
        const y0 = -sh / 2 + i * step, y1 = y0 + step;
        const k0 = d / (d + y0 * s), k1 = d / (d + y1 * s);
        const p0 = y0 * c * k0, p1 = y1 * c * k1;
        const h = p1 - p0;
        if (h <= 0) continue;
        const w = sw * (k0 + k1) * 0.5;
        ctx.drawImage(src, 0, i * step, sw, Math.min(step + 1, sh - i * step), cx - w / 2, cy + p0, w, h + 0.75);
      }
    } else {
      ctx.drawImage(src, 0, 0, sw, sh, cx - sw / 2, cy - sh / 2, sw, sh);
    }
    ctx.restore();
  };

  // Render drawFn (which draws in absolute coords inside `rect`) into a padded offscreen card
  // buffer, then project it with M.persp. rect = {x, y, w, h}; pad leaves room for shadows.
  M.card3d = (ctx, slot, rect, drawFn, o = {}) => {
    const pad = o.pad ?? 90;
    const bw = Math.ceil(rect.w + pad * 2), bh = Math.ceil(rect.h + pad * 2);
    const b = M.buffer(60 + slot, bw, bh);
    const x = b.x;
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.globalAlpha = 1;
    x.globalCompositeOperation = 'source-over';
    x.clearRect(0, 0, bw, bh);
    x.textRendering = 'geometricPrecision';
    x.translate(pad - rect.x, pad - rect.y);
    drawFn(x);
    const cx = (o.cx ?? rect.x + rect.w / 2), cy = (o.cy ?? rect.y + rect.h / 2);
    M.persp(ctx, b.c, bw, bh, cx, cy, o.rotY || 0, o.rotX || 0, o);
  };

  // --------------------------------------------------- post effects
  let grainTiles = null;
  M.grain = (ctx, frame, amount = 0.05) => {
    if (!grainTiles) {
      grainTiles = [];
      for (let k = 0; k < 6; k++) {
        const c = document.createElement('canvas');
        c.width = c.height = 256;
        const g = c.getContext('2d');
        const img = g.createImageData(256, 256);
        for (let i = 0; i < 256 * 256; i++) {
          const v = 128 + (M.rand(i, 99 + k) + M.rand(i, 199 + k) - 1) * 110;
          img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
          img.data[i * 4 + 3] = 255;
        }
        g.putImageData(img, 0, 0);
        grainTiles.push(c);
      }
    }
    const tile = grainTiles[Math.floor(frame / 2) % grainTiles.length];
    const pat = ctx.createPattern(tile, 'repeat');
    const ox = Math.floor(M.rand(frame >> 1, 7) * 256), oy = Math.floor(M.rand(frame >> 1, 8) * 256);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, -ox, -oy);
    ctx.globalCompositeOperation = 'soft-light';
    ctx.globalAlpha = amount;
    ctx.fillStyle = pat;
    ctx.fillRect(0, 0, M.W + 256, M.H + 256);
    ctx.restore();
  };
  M.vignette = (ctx, amount = 0.3, color = '#000000', inner = 0.45) => {
    if (amount <= 0) return;
    const g = ctx.createRadialGradient(M.W / 2, M.H * 0.46, M.H * inner * 0.5, M.W / 2, M.H * 0.46, M.H * 0.78);
    g.addColorStop(0, M.rgba(color, 0));
    g.addColorStop(1, M.rgba(color, amount));
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, M.W, M.H);
    ctx.restore();
  };

  // Decaying camera shake from a list of hits [[time, amplitude, duration, freq]]
  M.shake = (t, hits) => {
    let x = 0, y = 0, r = 0;
    for (const h of hits) {
      const [th, amp, dur = 0.35, freq = 16] = h;
      const d = t - th;
      if (d < 0 || d > dur) continue;
      const env = Math.pow(1 - d / dur, 2.2);
      x += amp * env * Math.sin(TAU * freq * d + th * 13.1);
      y += amp * env * Math.cos(TAU * freq * 1.27 * d + th * 7.3);
      r += amp * 0.0009 * env * Math.sin(TAU * freq * 0.7 * d);
    }
    return [x, y, r];
  };
})(typeof window !== 'undefined' ? window : globalThis);

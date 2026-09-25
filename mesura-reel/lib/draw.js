// Shared engine: canvas drawing helpers bound to the film's current context.
import { TAU, clamp, lerp, seg, E, spring, hash, rgba, rng, LIN, OUT, OUTN } from './core.js';

export function createDraw(getCtx, W, H) {
  const mcan = document.createElement('canvas');
  const mctx = mcan.getContext('2d');
  /* ------------------------------------------------------------ layout */
  const LC = new Map();
  function lay(text, font, ls = 0, size = 0) {
    const key = text + '|' + font + '|' + ls;
    let L = LC.get(key);
    if (L) return L;
    mctx.font = font; mctx.letterSpacing = ls + 'px';
    const xs = [], ws = [];
    for (let i = 0; i < text.length; i++) xs.push(mctx.measureText(text.slice(0, i)).width);
    for (let i = 0; i < text.length; i++) { mctx.letterSpacing = '0px'; ws.push(mctx.measureText(text[i]).width); mctx.letterSpacing = ls + 'px'; }
    const m = mctx.measureText(text);
    const wordOf = []; let w = 0;
    for (let i = 0; i < text.length; i++) { if (text[i] === ' ' && i > 0 && text[i - 1] !== ' ') w++; wordOf.push(text[i] === ' ' ? -1 : w); }
    const sz = size || parseFloat(font.split(' ')[1]);
    L = { text, font, ls, xs, ws, wordOf, words: w + 1, width: m.width - (text.length ? ls : 0), asc: m.fontBoundingBoxAscent, desc: m.fontBoundingBoxDescent, size: sz };
    LC.set(key, L);
    return L;
  }
  const measure = (s, font, ls = 0) => lay(s, font, ls).width;
  const DW = new Map();
  const digitW = font => { if (DW.has(font)) return DW.get(font); let m = 0; for (let d = 0; d < 10; d++) m = Math.max(m, measure(String(d), font)); DW.set(font, m); return m; };

  // Draw a laid-out line glyph by glyph. fn(i, ch) -> {a, dx, dy, s, r, c} | null.
  function glyphs(L, x, y, fn) {
    const ctx = getCtx();
    ctx.font = L.font; ctx.letterSpacing = '0px'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    for (let i = 0; i < L.text.length; i++) {
      const ch = L.text[i];
      if (ch === ' ') continue;
      const g = fn(i, ch);
      if (!g || !(g.a > 0.002)) continue;
      ctx.globalAlpha = Math.min(1, g.a); ctx.fillStyle = g.c;
      const gx = x + L.xs[i] + (g.dx || 0), gy = y + (g.dy || 0);
      if (g.r || (g.s != null && g.s !== 1)) {
        ctx.save(); ctx.translate(gx + L.ws[i] / 2, gy); if (g.r) ctx.rotate(g.r); if (g.s != null) ctx.scale(g.s, g.s);
        ctx.fillText(ch, -L.ws[i] / 2, 0); ctx.restore();
      } else ctx.fillText(ch, gx, gy);
    }
    ctx.globalAlpha = 1;
  }
  // Editorial mask reveal: words rise out of their baseline, then leave through the top.
  function rise(L, x, y, color, t, tIn, o = {}) {
    const ctx = getCtx();
    if (t < tIn) return;
    const st = o.stagger ?? 0.05, dur = o.dur ?? 0.75, tOut = o.tOut ?? Infinity, ost = o.outStagger ?? 0.02, odur = o.outDur ?? 0.32;
    const byChar = o.by === 'char';
    const hgt = L.asc + L.desc;
    const pad = L.size * 0.15;
    ctx.save();
    ctx.beginPath(); ctx.rect(x - pad * 4, y - L.asc - pad, L.width + pad * 8, hgt + pad * 2); ctx.clip();
    glyphs(L, x, y, i => {
      const k = byChar ? i : L.wordOf[i];
      const ti = t - tIn - k * st;
      if (ti <= 0) return null;
      const p = o.spring ? spring(ti, o.spring[0], o.spring[1]) : E.outExpo(clamp(ti / dur));
      let dy = (1 - p) * (hgt + pad);
      let a = (o.alpha ?? 1) * clamp(ti / 0.1);
      if (t > tOut) {
        const to = t - tOut - k * ost;
        if (to > 0) { const q = E.inOutCubic(clamp(to / odur)); dy -= q * (hgt + pad); a *= 1 - q * 0.3; }
      }
      return { a, dy, c: o.colorOf ? o.colorOf(i, k) : color };
    });
    ctx.restore();
  }
  function text(str, font, x, y, color, a = 1, align = 'left', ls = 0) {
    const ctx = getCtx();
    if (a <= 0.002) return;
    ctx.font = font; ctx.letterSpacing = ls + 'px'; ctx.textAlign = align; ctx.textBaseline = 'alphabetic';
    ctx.globalAlpha = Math.min(1, a); ctx.fillStyle = color;
    ctx.fillText(str, x, y);
    ctx.globalAlpha = 1; ctx.letterSpacing = '0px'; ctx.textAlign = 'left';
  }

  // Mechanical odometer: each column rolls only when the column to its right wraps.
  function odometer(value, o) {
    const ctx = getCtx();
    const dec = o.dec ?? 0, ic = o.intCols ?? 2, font = o.font, size = o.size;
    const dw = digitW(font), dotW = dec ? measure('.', font) : 0;
    const sf = o.suffixFont || font, sw = o.suffix ? measure(o.suffix, sf) : 0, gap = o.gap ?? 0;
    const v = Math.max(0, value) * 10 ** dec;
    const cols = ic + dec;
    const pk = []; // position per place, least significant first; a column turns only while the one to its right rolls 9 -> 0
    for (let k = 0; k < cols; k++) {
      const u = v / 10 ** k;
      if (k === 0) pk.push(u);
      else { const pm = ((pk[k - 1] % 10) + 10) % 10; pk.push(Math.floor(u + 1e-9) + clamp(pm - 9)); }
    }
    const pos = pk.slice().reverse();
    // collapse hidden leading columns so the figure stays tight
    let vis = []; let lead = true;
    for (let c = 0; c < ic; c++) {
      if (c === ic - 1) { vis.push(1); break; }
      const a = lead && !o.pad ? clamp(pos[c]) : 1;   // o.pad keeps leading zeros (e.g. "01")
      if (a >= 1) lead = false;
      vis.push(a);
    }
    let wInt = 0; for (let c = 0; c < ic; c++) wInt += dw * vis[c];
    const total = wInt + (dec ? dotW + dec * dw : 0) + gap + sw;
    let x = o.align === 'right' ? o.x - total : o.align === 'center' ? o.x - total / 2 : o.x;
    const lh = size * 0.95, top = o.y - size * 0.8, bot = o.y + size * 0.16;
    const alpha = o.alpha ?? 1;
    ctx.save(); ctx.beginPath(); ctx.rect(x - size * 0.2, top, total + size * 0.4, bot - top); ctx.clip();
    ctx.font = font; ctx.letterSpacing = '0px'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = o.color;
    let cx = x;
    for (let c = 0; c < cols; c++) {
      const w = c < ic ? dw * vis[c] : dw;
      const a = alpha * (c < ic ? vis[c] : 1);
      if (a > 0.002) {
        const d0 = Math.floor(pos[c] + 1e-9), fr = pos[c] - d0;
        ctx.globalAlpha = a;
        ctx.fillText(String(((d0 % 10) + 10) % 10), cx + w / 2, o.y - fr * lh);
        if (fr > 1e-3) ctx.fillText(String((((d0 + 1) % 10) + 10) % 10), cx + w / 2, o.y + (1 - fr) * lh);
      }
      cx += w;
      if (c === ic - 1 && dec) { ctx.globalAlpha = alpha; ctx.textAlign = 'left'; ctx.fillText('.', cx, o.y); ctx.textAlign = 'center'; cx += dotW; }
    }
    ctx.restore();
    if (o.suffix) text(o.suffix, sf, cx + gap, o.suffixY ?? o.y, o.suffixColor || o.color, alpha);
    ctx.globalAlpha = 1;
    return { x, w: total };
  }

  // Deterministic decode/scramble used for the section eyebrows.
  const GLYPHSET = 'ABCDEFGHJKLMNOPRSTUVWXYZ0123456789';
  // frameLocked: pick glyphs per 60 fps frame, so motion-blur sub-samples don't double-expose them
  function scramble(target, p, t, frameLocked = false) {
    const n = target.length; let s = '';
    const bucket = Math.floor((frameLocked ? Math.round(t * 60) / 60 : t) * 40);
    for (let i = 0; i < n; i++) {
      const ch = target[i];
      if (ch === ' ' || ch === '·') { s += ch; continue; }
      const r = p * (n + 6) - i;
      s += r >= 6 ? ch : r > 0 ? GLYPHSET[Math.floor(hash(i * 7 + 3, bucket) * GLYPHSET.length)] : '';
    }
    return s;
  }

  // Locate the dot of a glyph like "?" so the hero dot can dock into it.
  function glyphDot(font, ch) {
    const S = 2, c = document.createElement('canvas'); c.width = 480; c.height = 480;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.scale(S, S); g.font = font; g.fillStyle = '#000'; g.textBaseline = 'alphabetic';
    const ox = 20, oy = 200; g.fillText(ch, ox, oy);
    const d = g.getImageData(0, 0, 480, 480).data;
    const inked = y => { for (let x = 0; x < 480; x++) if (d[(y * 480 + x) * 4 + 3] > 40) return true; return false; };
    let y = 479; while (y > 0 && !inked(y)) y--;
    const bottom = y; while (y > 0 && inked(y)) y--;
    const top = y + 1; const gapY = y;
    let x0 = 480, x1 = 0;
    for (let yy = top; yy <= bottom; yy++) for (let x = 0; x < 480; x++) if (d[(yy * 480 + x) * 4 + 3] > 40) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); }
    return { cx: (x0 + x1 + 1) / 2 / S - ox, cy: (top + bottom + 1) / 2 / S - oy, r: (x1 - x0 + 1) / 2 / S, rv: (bottom - top + 1) / 2 / S, cut: gapY / S - oy };
  }

  function pathSec(secs, cx, cy, rs, ms, rot = 0, m = 0, mIn = null) {
    const ctx = getCtx();
    // Blend ring sections (A, pixels, rotated, scaled by rs) into the mark (B, unit, scaled by ms)
    // around a shared centre. m drives the outer edge, mIn the hole; the slot edges blend between.
    const c = Math.cos(rot), s = Math.sin(rot), mi = mIn ?? m;
    ctx.beginPath();
    let first = true;
    for (let k = 0; k < 4; k++) {
      const A = secs.a[k], B = secs.b ? secs.b[k] : null;
      for (let i = 0; i < A.length; i++) {
        const f = i / (A.length - 1);
        const mk = k === 0 ? m : k === 2 ? mi : k === 1 ? lerp(m, mi, f) : lerp(mi, m, f);
        let x = (A[i][0] * c - A[i][1] * s) * rs, y = (A[i][0] * s + A[i][1] * c) * rs;
        if (B) { x = lerp(x, B[i][0] * ms, mk); y = lerp(y, B[i][1] * ms, mk); }
        x += cx; y += cy;
        if (first) { ctx.moveTo(x, y); first = false; } else ctx.lineTo(x, y);
      }
    }
    ctx.closePath();
  }
  function markPath(mk, cx, cy, D) {
    const ctx = getCtx();
    ctx.beginPath();
    mk.outline.forEach((p, i) => (i ? ctx.lineTo(cx + p.x * D, cy + p.y * D) : ctx.moveTo(cx + p.x * D, cy + p.y * D)));
    ctx.closePath();
  }

  /* ---------------------------------------------------------- helpers */
  function dot(x, y, r, color, a = 1, vx = 0, vy = 0, sq = 0) {
    const ctx = getCtx();
    if (a <= 0.002 || r <= 0.05) return;
    const sp = Math.hypot(vx, vy), st = 1 + Math.min(0.55, sp / 4200);
    ctx.save(); ctx.translate(x, y); ctx.rotate(Math.atan2(vy, vx));
    ctx.scale(st, 1 / st);
    ctx.rotate(-Math.atan2(vy, vx)); ctx.scale(1 + sq, 1 - sq);
    ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.globalAlpha = a; ctx.fillStyle = color; ctx.fill();
    ctx.restore(); ctx.globalAlpha = 1;
  }
  function pill(x, y, w, h) {
    const ctx = getCtx();
    const r = Math.min(h / 2, w / 2);
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.arc(x + w - r, y + h / 2, r, -Math.PI / 2, Math.PI / 2);
    ctx.lineTo(x + r, y + h); ctx.arc(x + r, y + h / 2, r, Math.PI / 2, (3 * Math.PI) / 2); ctx.closePath();
  }
  function ripple(x, y, t, t0, r0, r1, color, dur = 0.7, width = 2) {
    const ctx = getCtx();
    const p = seg(t, t0, t0 + dur);
    if (p <= 0 || p >= 1) return;
    const r = lerp(r0, r1, E.outCubic(p));
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU);
    ctx.lineWidth = width * (1 - p * 0.6); ctx.strokeStyle = rgba(color, (1 - p) ** 1.5 * 0.85); ctx.stroke();
  }
  function softDot(x, y, r, blur, color, a) {
    const ctx = getCtx();
    if (a <= 0.003) return;
    if (x < -r - blur - 20 || x > W + r + blur + 20 || y < -r - blur - 20 || y > H + r + blur + 20) return;
    if (blur < 0.6) { ctx.globalAlpha = a; ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; return; }
    const R = r + blur, k = r / R;
    const g = ctx.createRadialGradient(x, y, 0, x, y, R);
    const e = clamp((r * r) / ((r + blur * 0.5) ** 2), 0.12, 1);
    g.addColorStop(0, rgba(color, a * e)); g.addColorStop(Math.max(0, k * 0.4), rgba(color, a * e * 0.92)); g.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.fill();
  }

  // Film grain tiles (deterministic) and the finishing pass: vignette + grain.
  const grainTiles = [];
  {
    const r = rng(7);
    for (let k = 0; k < 4; k++) {
      const c = document.createElement('canvas'); c.width = c.height = 256;
      const g = c.getContext('2d'), im = g.createImageData(256, 256);
      for (let i = 0; i < im.data.length; i += 4) { const v = 128 + ((r() + r() + r() - 1.5) * 120); im.data[i] = im.data[i + 1] = im.data[i + 2] = clamp(v, 0, 255); im.data[i + 3] = 255; }
      g.putImageData(im, 0, 0); grainTiles.push(c);
    }
  }
  function reset() {
    const ctx = getCtx();
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none'; ctx.letterSpacing = '0px';
  }
  function post(frame, vignette = [W / 2, H / 2, 520, 1250], grain = 0.07) {
    const ctx = getCtx();
    reset();
    const [vx, vy, r0, r1] = vignette;
    const vg = ctx.createRadialGradient(vx, vy, r0, vx, vy, r1);
    vg.addColorStop(0, 'rgba(18,28,24,0)'); vg.addColorStop(1, 'rgba(18,28,24,0.13)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    const tile = grainTiles[frame % grainTiles.length];
    const pat = ctx.createPattern(tile, 'repeat');
    pat.setTransform(new DOMMatrix([1, 0, 0, 1, Math.floor(hash(frame, 1) * 256), Math.floor(hash(frame, 2) * 256)]));
    ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = grain; ctx.fillStyle = pat; ctx.fillRect(0, 0, W, H);
    reset();
  }
  // Motion blur by temporal supersampling: the linear-light average of n sub-frames.
  let acc = null;
  function accumulate(t0, n, shutter, fps, drawFrame) {
    const ctx = getCtx();
    if (n <= 1) { drawFrame(t0); return; }
    if (!acc) acc = new Float32Array(W * H * 3);
    acc.fill(0);
    for (let s = 0; s < n; s++) {
      drawFrame(t0 + ((s + 0.5) / n - 0.5) * (shutter / fps));
      const d = ctx.getImageData(0, 0, W, H).data;
      for (let i = 0, j = 0; i < d.length; i += 4, j += 3) { acc[j] += LIN[d[i]]; acc[j + 1] += LIN[d[i + 1]]; acc[j + 2] += LIN[d[i + 2]]; }
    }
    const img = ctx.createImageData(W, H), o = img.data, k = OUTN / n;
    for (let i = 0, j = 0; i < o.length; i += 4, j += 3) { o[i] = OUT[(acc[j] * k) | 0]; o[i + 1] = OUT[(acc[j + 1] * k) | 0]; o[i + 2] = OUT[(acc[j + 2] * k) | 0]; o[i + 3] = 255; }
    ctx.putImageData(img, 0, 0);
  }

  return { lay, measure, digitW, glyphs, rise, text, odometer, scramble, glyphDot, pathSec, markPath, dot, pill, ripple, softDot, reset, post, accumulate };
}

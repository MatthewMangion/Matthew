// Mesura social series: the shared 9:16 template for the Instagram and TikTok reels.
// Same engine as the films: every frame is a pure function of time, rendered with real motion
// blur. A reel module hands film() its timeline and a draw function; the kit supplies the safe
// area, the type scale, shared components, the series end card and the sound-event sheet that
// audio/social.py turns into the soundtrack.
import { WORDMARK } from '../logo.js';
import { TAU, clamp, lerp, seg, E, spring, wobble, hash, P, mix, rgba, F, loadFonts, SLOT, buildMark, ringSec } from '../lib/core.js';
import { createDraw } from '../lib/draw.js';

export { TAU, clamp, lerp, seg, E, spring, wobble, hash, P, mix, rgba, F, SLOT, ringSec };
export const W = 1080, H = 1920, FPS = 60;
export const BEAT = 0.6;                              // 100 BPM, bars from 0.0
// Clear of both apps' chrome: the top bar, the caption block at the bottom and the action rail
// on the right. Everything that has to be read stays inside this box.
export const SAFE = { l: 88, r: 920, t: 260, b: 1480 };
export const CW = SAFE.r - SAFE.l;
export const NEG = '#A94436', POS = '#2E7D5B';        // design-system semantic colours
// The six dimensions as the product's report shows them (colours sampled from the report), with
// the sample report's scores and its three baselines per dimension (sector average, Mesura median,
// your organisation). Readiness 88%: Elite AI Navigator; 5% above the sector, 10% above Mesura,
// 3% above the organisation.
export const DIMS = [
  { name: 'Awareness', color: '#8FB3AF', score: 100, sector: 100, mesura: 97, org: 100, desc: 'Recognising the tools and forming a view' },
  { name: 'Adoption', color: '#C07B3F', score: 83, sector: 82, mesura: 81, org: 83, desc: 'How far AI has moved into daily work' },
  { name: 'Literacy', color: '#B0613C', score: 100, sector: 79, mesura: 75, org: 82, desc: 'Self-rated skill and appetite to learn' },
  { name: 'Organisation', color: '#7A5C87', score: 79, sector: 79, mesura: 77, org: 79, desc: 'Direction, guidance and rules people can see' },
  { name: 'Affinity (ATI)', color: '#1B7A85', score: 67, sector: 65, mesura: 64, org: 67, desc: 'Comfort with technical systems' },
  { name: 'Demonstrated', color: '#6B7A51', score: 100, sector: 97, mesura: 86, org: 100, desc: 'Tested knowledge, not self-rated' },
];
export const OVERALL = { score: 88, sector: 83, mesura: 78, org: 85, tier: 'Elite AI Navigator' };

/* The series end card: the ochre point drops onto a downbeat (spec.land), grows into the mark,
   and the stacked lockup, tagline and call to action follow. It lasts 3 s from the landing. */
const EC = { mx: 540, my: 640, mD: 116, wD: 68, wy: 866, t1: 1040, t2: 1112, cta: 1238, url: 1366 };

export function film(spec) {
  const DUR = spec.land + 3.0;
  const LAND = spec.land, T_END = LAND - 0.4;          // the point starts to fall 0.4 s before it lands
  return function create(canvas) {
    const main = canvas.getContext('2d', { willReadFrequently: true, alpha: false });
    let ctx = main;
    const D = createDraw(() => ctx, W, H);
    const { lay, measure, rise, text, odometer, scramble, pathSec, markPath, dot, pill, ripple, reset } = D;
    let MK = null, WPATH = [], gridPat = null;
    const WMID = (WORDMARK[0].bbox[0] + Math.max(...WORDMARK.map(g => g.bbox[2]))) / 2;

    /* ------------------------------------------------------------ shapes */
    function rrect(x, y, w, h, r) {
      r = Math.max(0, Math.min(r, w / 2, h / 2));
      ctx.beginPath();
      ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
    }
    function card(x, y, w, h, r, fill = P.surface, a = 1, shadow = 0.1, border = P.border) {
      if (a <= 0.002) return;
      ctx.save(); ctx.globalAlpha = a;
      if (shadow) { ctx.shadowColor = `rgba(20,32,28,${shadow})`; ctx.shadowBlur = 56; ctx.shadowOffsetY = 20; }
      rrect(x, y, w, h, r); ctx.fillStyle = fill; ctx.fill();
      ctx.shadowColor = 'transparent';
      if (border) { ctx.lineWidth = 2; ctx.strokeStyle = border; ctx.stroke(); }
      ctx.restore();
    }
    function check(cx, cy, r, p, color, width) {
      if (p <= 0) return;
      const pts = [[-0.42, 0.02], [-0.12, 0.3], [0.44, -0.3]];
      const l1 = Math.hypot(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]), l2 = Math.hypot(pts[2][0] - pts[1][0], pts[2][1] - pts[1][1]);
      const d = clamp(p) * (l1 + l2);
      ctx.beginPath(); ctx.moveTo(cx + pts[0][0] * r, cy + pts[0][1] * r);
      if (d <= l1) { const f = d / l1; ctx.lineTo(cx + lerp(pts[0][0], pts[1][0], f) * r, cy + lerp(pts[0][1], pts[1][1], f) * r); }
      else { const f = (d - l1) / l2; ctx.lineTo(cx + pts[1][0] * r, cy + pts[1][1] * r); ctx.lineTo(cx + lerp(pts[1][0], pts[2][0], f) * r, cy + lerp(pts[1][1], pts[2][1], f) * r); }
      ctx.lineWidth = width; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = color; ctx.stroke(); ctx.lineCap = 'butt';
    }
    function cross(cx, cy, r, p, color, width) {
      if (p <= 0) return;
      const q1 = clamp(p * 2), q2 = clamp(p * 2 - 1), k = 0.32 * r;
      ctx.beginPath(); ctx.moveTo(cx - k, cy - k); ctx.lineTo(cx + lerp(-k, k, q1), cy + lerp(-k, k, q1));
      if (q2 > 0) { ctx.moveTo(cx + k, cy - k); ctx.lineTo(cx + lerp(k, -k, q2), cy + lerp(-k, k, q2)); }
      ctx.lineWidth = width; ctx.lineCap = 'round'; ctx.strokeStyle = color; ctx.stroke(); ctx.lineCap = 'butt';
    }
    function bar(x, y, w, h, f, color, track = P.track, a = 1) {
      if (a <= 0.002) return;
      ctx.globalAlpha = a;
      if (track) { pill(x, y, w, h); ctx.fillStyle = track; ctx.fill(); }
      if (f > 0.0005) { pill(x, y, Math.max(h, w * f), h); ctx.fillStyle = color; ctx.fill(); }
      ctx.globalAlpha = 1;
    }
    // Benchmark markers as the product draws them: a tick for the sector, a diamond for the Mesura
    // median, a dot for your organisation.
    function marker(kind, x, y, s = 1, color = P.ink, a = 1) {
      if (a <= 0.002 || s <= 0.01) return;
      ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.scale(s, s); ctx.fillStyle = color; ctx.beginPath();
      if (kind === 'sector') rrect(-3.5, -20, 7, 40, 3.5);
      else if (kind === 'mesura') { ctx.moveTo(0, -13); ctx.lineTo(13, 0); ctx.lineTo(0, 13); ctx.lineTo(-13, 0); ctx.closePath(); }
      else { ctx.arc(0, 0, 10, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(0, 0, 10, 0, TAU); ctx.lineWidth = 4; ctx.strokeStyle = P.surface; ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, 10, 0, TAU); }
      ctx.fill(); ctx.restore();
    }
    function mark(x, y, Dm, color = P.ochre, rot = 0) {
      ctx.save(); ctx.translate(x, y); if (rot) ctx.rotate(rot); markPath(MK, 0, 0, Dm); ctx.restore();
      ctx.fillStyle = color; ctx.fill();
    }
    // The ochre point grows into the mark: a tiny ring with a slot-sized gap morphs point for point.
    function markGrow(x, y, Dm, t, t0, color = P.ochre) {
      if (t < t0) return;
      const g = spring(t - t0, 1.6, 0.55);
      if (t < t0 + 0.9) {
        const gap = 0.36, S = ringSec(12, 3, SLOT + gap / 2, SLOT - gap / 2 + TAU);
        pathSec({ a: S, b: MK.sec }, x, y, 1, Dm * clamp(g, 0, 1.2), 0, clamp(g * 1.05, 0, 1.15), clamp(g * 1.1, 0, 1));
      } else markPath(MK, x, y, Dm);
      ctx.fillStyle = color; ctx.fill();
    }
    // An ochre point falling under gravity into (x, y), landing at t0 + dur.
    function drop(x, y, t, t0, dur = 0.4, from = 420, r = 16) {
      const u = seg(t, t0, t0 + dur);
      if (t < t0 || u >= 1) return;
      dot(x, lerp(y - from, y, u * u), r, P.ochre, 1, 0, (2 * u * from) / dur);
    }
    function wordmark(cx, cy, Dm, color) {
      WORDMARK.forEach((g, i) => {
        ctx.save(); ctx.translate(cx, cy); ctx.scale(Dm, Dm);
        ctx.fillStyle = g.color === 'pine' ? color : P.ochre; ctx.fill(WPATH[i], 'evenodd'); ctx.restore();
      });
    }

    /* ------------------------------------------------------ backgrounds */
    function grid(a) { if (a <= 0.002) return; ctx.globalAlpha = a; ctx.fillStyle = gridPat; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
    function paper(a = 0.5) { ctx.fillStyle = P.paper; ctx.fillRect(0, 0, W, H); grid(a); }
    function dark() {
      const g = ctx.createRadialGradient(540, 860, 60, 540, 960, 1300);
      g.addColorStop(0, '#1D2D27'); g.addColorStop(0.55, '#15211D'); g.addColorStop(1, '#0C1512');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
    function pine() { ctx.fillStyle = P.pine; ctx.fillRect(0, 0, W, H); }
    function iris(x, y, r, draw) { if (r <= 0) return; ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.clip(); draw(); ctx.restore(); }
    // A measuring line sweeps left to right; draw() fills what it has passed.
    function sweep(t, t0, dur, draw, color = P.ochre) {
      const p = E.inOutCubic(seg(t, t0, t0 + dur));
      if (p <= 0) return;
      const x = lerp(-40, W + 40, p);
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, x, H); ctx.clip(); draw(); ctx.restore();
      if (p < 1) { ctx.fillStyle = color; ctx.fillRect(x - 3, 0, 6, H); const g = ctx.createLinearGradient(x - 90, 0, x, 0); g.addColorStop(0, rgba(color, 0)); g.addColorStop(1, rgba(color, 0.22)); ctx.fillStyle = g; ctx.fillRect(x - 90, 0, 90, H); }
    }

    /* ------------------------------------------------------------- type */
    function wrap(str, font, maxW) {
      const out = []; let cur = '';
      for (const w of str.split(' ')) { const t = cur ? cur + ' ' + w : w; if (cur && measure(t, font) > maxW) { out.push(cur); cur = w; } else cur = t; }
      if (cur) out.push(cur);
      return out;
    }
    // "*...*" marks highlighted words; "\n" breaks lines.
    function parse(str) {
      const lines = []; let hl = false;
      for (const raw of str.split('\n')) { let s = ''; const m = []; for (const ch of raw) { if (ch === '*') { hl = !hl; continue; } s += ch; m.push(hl); } lines.push({ s, m }); }
      return lines;
    }
    // Editorial reveal: each line rises out of its own baseline mask, word by word, and leaves
    // through the top at tOut. Returns the laid-out lines for positioning follow-on elements.
    function block(str, font, x, y, lh, color, t, tIn, o = {}) {
      const lines = parse(str), hl = o.hl ?? P.ochre, out = [];
      lines.forEach((ln, i) => {
        const L = lay(ln.s, font);
        const lx = o.align === 'center' ? x - L.width / 2 : x;
        out.push({ L, x: lx, y: y + i * lh });
        rise(L, lx, y + i * lh, color, t, tIn + i * (o.lineStagger ?? 0.1), {
          stagger: o.stagger ?? 0.05, dur: o.dur ?? 0.7, tOut: (o.tOut ?? Infinity) + i * 0.04, alpha: o.alpha,
          colorOf: ci => (ln.m[ci] ? hl : color),
        });
      });
      return out;
    }
    // Marked-up text drawn whole, without a reveal: for rack focus and other whole-block effects.
    function rich(str, font, x, y, lh, color, a = 1, o = {}) {
      parse(str).forEach((ln, i) => {
        const L = lay(ln.s, font);
        D.glyphs(L, o.align === 'center' ? x - L.width / 2 : x, y + i * lh, ci => ({ a, c: ln.m[ci] ? (o.hl ?? P.ochre) : color }));
      });
    }
    const HOOK = 132, SAY = 100;
    const hook = (str, t, tIn, o = {}) => block(str, F.disp(o.size ?? HOOK), o.x ?? SAFE.l, o.y ?? 700, (o.size ?? HOOK) * (o.lh ?? 1.04), o.color ?? P.ink, t, tIn, { stagger: 0.07, lineStagger: 0.12, dur: 0.6, ...o });
    const say = (str, t, tIn, o = {}) => block(str, F.disp(o.size ?? SAY), o.x ?? SAFE.l, o.y ?? 520, (o.size ?? SAY) * (o.lh ?? 1.08), o.color ?? P.ink, t, tIn, o);
    function note(str, t, tIn, o = {}) {
      const size = o.size ?? 40, f = F.text(size, o.weight ?? 400);
      const txt = str.includes('\n') ? str : wrap(str, f, o.w ?? CW).join('\n');
      return block(txt, f, o.x ?? SAFE.l, o.y, size * 1.4, o.color ?? P.body, t, tIn, { stagger: 0.03, lineStagger: 0.07, ...o });
    }
    function eyebrow(str, t, tIn, o = {}) {
      const tOut = o.tOut ?? Infinity;
      const a = seg(t, tIn, tIn + 0.1) * (1 - seg(t, tOut, tOut + 0.25));
      if (a > 0.002) text(scramble(str, seg(t, tIn, tIn + 0.45), t, true), F.text(o.size ?? 28, 600), o.x ?? SAFE.l, o.y, o.color ?? P.ochre, a, 'left', 3.3);
    }
    function source(str, t, tIn, o = {}) {
      const tOut = o.tOut ?? Infinity;
      const a = seg(t, tIn, tIn + 0.3) * (1 - seg(t, tOut, tOut + 0.3));
      if (a > 0.002) text(str, F.text(24, 400), o.x ?? SAFE.l, o.y ?? SAFE.b - 16, o.color ?? P.muted, a);
    }
    function num(v, x, y, size, o = {}) {
      return odometer(v, {
        x, y, font: F.disp(size), size, intCols: o.intCols ?? 2, dec: o.dec ?? 0, color: o.color ?? P.ink, align: o.align ?? 'left',
        alpha: o.alpha ?? 1, suffix: o.suffix ?? '%', suffixFont: F.disp(Math.round(size * (o.suffixScale ?? 0.5))), gap: size * 0.04, pad: o.pad,
      });
    }
    // A laid-out line that punches in: already visible on the first frame, settling from a larger scale.
    function slam(L, x, y, color, t, t0, o = {}) {
      if (t < t0) return;
      const p = E.outCubic(seg(t, t0, t0 + (o.dur ?? 0.38)));
      const s = 1 + (o.from ?? 0.16) * (1 - p);
      const tOut = o.tOut ?? Infinity, q = E.inOutCubic(seg(t, tOut, tOut + 0.35));
      const a = (o.alpha ?? 1) * (1 - q);
      if (a <= 0.002) return;
      ctx.save(); ctx.translate(x, y - q * 60); ctx.scale(s, s);
      D.glyphs(L, 0, 0, (i) => ({ a, c: o.colorOf ? o.colorOf(i) : color }));
      ctx.restore();
    }

    // Rack focus: draw() runs through a blur that settles to sharp.
    function focus(blur, draw) { if (blur > 0.3) ctx.filter = `blur(${blur.toFixed(2)}px)`; draw(); ctx.filter = 'none'; }

    /* ---------------------------------------------------------- end card */
    function endCard(t) {
      if (t < T_END - 0.55) return;
      // a paper iris opens from where the mark will land; its edge is a thin ochre ring
      const ir = 1500 * E.inOutCubic(seg(t, T_END - 0.55, T_END + 0.15));
      if (ir < 1499) {
        iris(EC.mx, EC.my, ir, () => paper());
        if (ir > 1) { ctx.beginPath(); ctx.arc(EC.mx, EC.my, ir, 0, TAU); ctx.lineWidth = 3; ctx.strokeStyle = rgba(P.ochre, 0.8 * (1 - ir / 1500)); ctx.stroke(); }
      } else paper();
      drop(EC.mx, EC.my, t, T_END, 0.4, 420);
      ripple(EC.mx, EC.my, t, LAND, 16, 170, P.ochre, 0.8, 2.5);
      ripple(EC.mx, EC.my, t, LAND + 0.1, 16, 280, P.ochre, 1.0, 1.5);
      markGrow(EC.mx, EC.my, EC.mD, t, LAND);
      const wp = E.outExpo(seg(t, LAND + 0.3, LAND + 1.0));
      if (wp > 0) {
        ctx.save(); ctx.beginPath(); ctx.rect(0, EC.wy - 1.3 * EC.wD, W, 2.1 * EC.wD); ctx.clip();
        wordmark(540 - WMID * EC.wD, EC.wy + (1 - wp) * 1.6 * EC.wD, EC.wD, P.pine); ctx.restore();
      }
      const tf = F.sub(56), L1 = lay('Measure where you stand.', tf), L2 = lay('Keep measuring.', tf);
      rise(L1, 540 - L1.width / 2, EC.t1, P.ink, t, LAND + 0.6, { stagger: 0.05 });
      rise(L2, 540 - L2.width / 2, EC.t2, P.ochre, t, LAND + 0.9, { stagger: 0.07 });
      const bp = spring(t - (LAND + 1.2), 1.9, 0.62);
      if (bp > 0.001) {
        const bw = 560, bh = 104;
        ctx.save(); ctx.translate(540, EC.cta); ctx.scale(lerp(0.9, 1, clamp(bp)), lerp(0.9, 1, clamp(bp))); ctx.globalAlpha = clamp(bp * 1.5);
        pill(-bw / 2, -bh / 2, bw, bh); ctx.fillStyle = P.pine; ctx.fill();
        const sp = seg(t, LAND + 1.8, LAND + 2.5);           // one soft highlight sweeps across the button
        if (sp > 0 && sp < 1) {
          ctx.save(); pill(-bw / 2, -bh / 2, bw, bh); ctx.clip();
          const hx = lerp(-bw / 2 - 120, bw / 2 + 120, E.inOutCubic(sp)), g = ctx.createLinearGradient(hx - 90, 0, hx + 90, 0);
          g.addColorStop(0, 'rgba(246,242,233,0)'); g.addColorStop(0.5, 'rgba(246,242,233,0.22)'); g.addColorStop(1, 'rgba(246,242,233,0)');
          ctx.fillStyle = g; ctx.fillRect(-bw / 2, -bh / 2, bw, bh); ctx.restore();
        }
        ctx.restore();
        text('Get your Diagnostic', F.text(36, 500), 540, EC.cta + 13, P.onPine, clamp(bp * 1.5), 'center');
      }
      text('mesura.ai', F.text(30, 500), 540, EC.url, P.muted, seg(t, LAND + 1.5, LAND + 1.8), 'center', 1);
    }
    const endEvents = () => [
      { t: T_END, k: 'drop' }, { t: LAND, k: 'land' }, { t: LAND + 0.3, k: 'swish', v: 0.5 },
      { t: LAND + 0.6, k: 'bell', m: 81 }, { t: LAND + 0.9, k: 'bell', m: 78 }, { t: LAND + 1.2, k: 'cta' },
    ];

    /* ------------------------------------------------------------ frame */
    const k = {
      W, H, SAFE, CW, BEAT, DUR, LAND, T_END, EC,
      get ctx() { return ctx; },
      ...D, rrect, card, check, cross, bar, marker, mark, markGrow, drop, wordmark,
      grid, paper, dark, pine, iris, sweep, wrap, block, rich, hook, say, note, eyebrow, source, num, slam, focus,
    };
    function drawFrame(t) {
      t = clamp(t, 0, DUR - 1e-6);
      reset();
      if (t < LAND + 0.2) { (spec.background ? spec.background(k, t) : paper()); spec.draw(k, t); reset(); }
      endCard(t);
      reset();
    }
    const post = frame => D.post(frame, [540, 960, 700, 1500], 0.07);
    const samplesAt = t => { for (const [a, b, n] of spec.heavy || []) if (t >= a && t <= b) return n; return spec.samples ?? 8; };
    function renderFrame(frame, opt = {}) {
      const t0 = frame / FPS, n = opt.samples ?? samplesAt(t0);
      D.accumulate(t0, n, opt.shutter ?? 0.55, FPS, drawFrame);
      post(frame);
      return n;
    }
    function cues() {
      const ev = [{ t: 0, k: spec.open ?? 'hit' }, ...(spec.events ? spec.events(k) : []), ...endEvents()];
      ev.forEach(e => { e.t = +e.t.toFixed(4); });
      return { id: spec.id, DUR, LAND, T: spec.T || {}, music: spec.music || {}, events: ev.sort((a, b) => a.t - b.t) };
    }
    async function init() {
      await loadFonts();
      const pc = document.createElement('canvas'); pc.width = pc.height = 48;
      const pg = pc.getContext('2d'); pg.fillStyle = P.gridDot; pg.beginPath(); pg.arc(24, 24, 1.25, 0, TAU); pg.fill();
      gridPat = ctx.createPattern(pc, 'repeat');
      MK = buildMark();
      WPATH = WORDMARK.map(g => new Path2D(g.d));
      if (spec.init) spec.init(k);
      drawFrame(0); post(0);
    }
    return { W, H, FPS, DUR, init, drawFrame: t => { drawFrame(t); post(Math.floor(t * FPS)); }, renderFrame, samplesAt, cues };
  };
}

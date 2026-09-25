// Mesura.ai brand reel (16:9, 26.4 s).
// Every frame is a pure function of time, so the same code drives the live
// player and the frame-accurate, motion-blurred offline render.
import { WORDMARK } from './logo.js';
import { TAU, clamp, lerp, seg, E, spring, wobble, rng, hash, P, mix, rgba, F, loadFonts, SLOT, buildMark, ringSec } from './lib/core.js';
import { createDraw } from './lib/draw.js';

export const W = 1920, H = 1080, FPS = 60, DUR = 26.4;

/* ============================================================ timeline ==
   100 BPM: one beat = 0.6 s, bars start at 1.8 + 2.4n. The measure (13.8) and
   the mark (23.4) land on downbeats; everything else sits on a beat or half-beat. */
const T = {
  land: 0.6, hop: 0.72, sweep: 1.02, dock1: 2.4, lift: 2.5, l2: 2.62, hop2: 3.1, dock2: 3.6, out1: 4.2, fly: 4.35,
  bar1: 4.8, bar2: 5.4, head1: 6.0, ghost: 6.3, phaseB: 7.8, head2: 8.1, band: 9.0, zoom: 10.2, dark: 10.8,
  title3: 10.85, ann: 11.4, sub3: 12.0, sweep4: 13.8, sweep4End: 14.8, sub4: 15.0,
  flow: 16.2, spokes: 16.55, labels: 16.65, poly: 17.4, cap5: 17.7, sub5: 18.0,
  morph6: 19.2, take: [19.8, 20.4, 21.0, 21.6], out6: 22.45, morph7: 22.8, hit: 23.4, word: 23.55, dot: 24.0,
  tag1: 24.6, tag2: 24.9,
};

export function createReel(canvas) {
  const mainCtx = canvas.getContext('2d', { willReadFrequently: true, alpha: false });
  let ctx = mainCtx;
  let off = null, offCtx = null;
  const renderTo = (c, fn) => { const s = ctx; ctx = c; reset(); fn(); reset(); ctx = s; };
  const D = createDraw(() => ctx, W, H);
  const { lay, measure, glyphs, rise, text, odometer, scramble, glyphDot, pathSec, markPath, dot, pill, ripple, softDot, reset } = D;

  /* ---------------------------------------------------------- helpers */
  // Graph-paper dot field on the paper background (parallax layer).
  let gridPat = null;
  function paperGrid(zoom, fx, fy, a) {
    if (a <= 0.002) return;
    const z = 1 + (zoom - 1) * 0.55, s = 48 * z;
    gridPat.setTransform(new DOMMatrix([z, 0, 0, z, fx - fx * z, fy - fy * z]));
    ctx.globalAlpha = a; ctx.fillStyle = gridPat; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
  }

  /* ============================================================ scene 1
     The question. A single ochre point lands, sweeps the baseline and
     becomes the dot of each question mark. */
  const Q = {};
  function initS1() {
    Q.font = F.disp(128);
    Q.L1 = lay('Who used AI last week?', Q.font); Q.L2 = lay('Who measured it?', Q.font);
    Q.x1 = Math.round(960 - Q.L1.width / 2); Q.x2 = Math.round(960 - Q.L2.width / 2);
    Q.yA = 592; Q.yB1 = 512; Q.yB2 = 672;
    Q.qd = glyphDot(Q.font, '?');
    Q.q1 = Q.x1 + Q.L1.xs[Q.L1.text.length - 1]; Q.q2 = Q.x2 + Q.L2.xs[Q.L2.text.length - 1];
    Q.m0 = Q.L2.text.indexOf('measured'); Q.m1 = Q.m0 + 8;
    // Reveal time for each glyph of line 1: when the sweeping dot passes its centre.
    Q.tau = [];
    for (let i = 0; i < Q.L1.text.length; i++) {
      const gx = Q.x1 + Q.L1.xs[i] + Q.L1.ws[i] * 0.35;
      let tt = T.sweep;
      while (tt < T.dock1 && heroS1(tt).x < gx) tt += 0.002;
      Q.tau.push(tt - 0.035);
    }
  }
  const baseL1 = t => lerp(Q.yA, Q.yB1, E.inOutCubic(seg(t, T.lift, T.lift + 0.45)));
  function heroS1(t) {
    const r0 = 13;
    if (t < T.hop) {
      const p = seg(t, 0.02, T.land);
      const z = Math.exp(Math.log(185) * (1 - E.inOutQuart(p)));
      return { x: 960, y: 540, r: r0 * z * (1 + 0.28 * wobble(t - T.land, 5, 11)), c: P.ochre };
    }
    const xs = Q.x1 - 44, rs = 12, ys = Q.yA - rs;
    if (t < T.sweep) {
      const p = E.inOutCubic(seg(t, T.hop, T.sweep));
      return { x: lerp(960, xs, p), y: lerp(540, ys, p) - 170 * Math.sin(Math.PI * p), r: lerp(r0, rs, p), c: P.ochre };
    }
    const qx1 = Q.q1 + Q.qd.cx;
    if (t < T.hop2) {
      const p = E.inOutCubic(seg(t, T.sweep, T.dock1));
      const r = lerp(rs, Q.qd.r, p);
      return { x: lerp(xs, qx1, p), y: baseL1(t) - lerp(rs, -Q.qd.cy, p), r, c: P.ochre };
    }
    const qx2 = Q.q2 + Q.qd.cx, qy2 = Q.yB2 + Q.qd.cy;
    if (t < T.fly) {
      const p = E.inOutCubic(seg(t, T.hop2, T.dock2));
      return { x: lerp(qx1, qx2, p), y: lerp(baseL1(t) + Q.qd.cy, qy2, p) - 110 * Math.sin(Math.PI * p), r: Q.qd.r, c: P.ochre };
    }
    const p = E.inOutCubic(seg(t, T.fly, T.bar1));
    return { x: lerp(qx2, B.x0 + B.h / 2, p), y: lerp(qy2, B.y1, p) - 140 * Math.sin(Math.PI * p), r: lerp(Q.qd.r, B.h / 2, E.inCubic(p)), c: mix(P.ochre, P.pine, seg(p, 0.35, 0.95)) };
  }
  function heroVel(fn, t) { const h = 1 / 240, a = fn(t - h), b = fn(t + h); return [(b.x - a.x) / (2 * h), (b.y - a.y) / (2 * h)]; }

  function scene1(t) {
    // Line 1: glyphs spring up behind the travelling dot.
    const y1 = baseL1(t);
    const l1c = mix(P.ink, P.muted, seg(t, T.lift, T.lift + 0.5));
    const fall = (gx, line) => {
      const t0 = T.out1 + ((gx - 300) / 1400) * 0.16 + line * 0.05;
      const tt = t - t0; if (tt <= 0) return null;
      return { dy: E.inOutCubic(clamp(tt / 0.32)) * 175, dx: 0, r: 0, a: 1 };
    };
    ctx.save();
    { ctx.beginPath(); ctx.rect(0, 0, W, y1 + Q.L1.desc); ctx.clip(); }
    const last = Q.L1.text.length - 1;
    glyphs(Q.L1, Q.x1, y1, i => {
      const ti = t - Q.tau[i];
      if (ti <= 0) return null;
      const p = spring(ti, 2.3, 0.62);
      const g = { a: clamp(ti / 0.07), dy: (1 - p) * 150, r: (1 - p) * 0.35, c: l1c };
      { const f = fall(Q.x1 + Q.L1.xs[i], 0); if (f) { g.dy += f.dy; } }
      if (i === last) { g.clipQ = true; }
      return i === last ? null : g;
    });
    ctx.restore();
    // '?' of line 1: hook only while the hero dot sits in it.
    drawQuestion(t, Q.x1 + Q.L1.xs[last], y1, T.dock1 - 0.3, l1c, t < T.hop2 + 0.03, 0, fall(Q.q1, 0), T.hop2 + 0.05);
    // Line 2
    if (t > T.l2 - 0.02) {
      const tIn = T.l2, st = 0.1;
      ctx.save();
      { ctx.beginPath(); ctx.rect(0, Q.yB2 - Q.L2.asc - 10, W, Q.L2.asc + Q.L2.desc + 10); ctx.clip(); }
      const lastQ = Q.L2.text.length - 1;
      glyphs(Q.L2, Q.x2, Q.yB2, i => {
        if (i === lastQ) return null;
        const k = Q.L2.wordOf[i], ti = t - tIn - k * st - (i - Q.L2.xs.findIndex((_, j) => Q.L2.wordOf[j] === k)) * 0.016;
        if (ti <= 0) return null;
        const p = spring(ti, 2.1, 0.7);
        const g = { a: clamp(ti / 0.08), dy: (1 - p) * 175, c: i >= Q.m0 && i < Q.m1 ? P.ochre : P.ink };
        { const f = fall(Q.x2 + Q.L2.xs[i], 1); if (f) { g.dy += f.dy; } }
        return g;
      });
      ctx.restore();
      drawQuestion(t, Q.x2 + Q.L2.xs[lastQ], Q.yB2, T.dock2 - 0.3, P.ink, true, 1, fall(Q.q2, 1), 99);
    }
    // Opening ripples (a measurement ping)
    ripple(960, 540, t, T.land, 14, 150, P.ochre, 0.75, 2.5);
    ripple(960, 540, t, T.land + 0.09, 14, 260, P.ochre, 0.9, 1.5);
    // Landing ripples on each docking
    const q1x = Q.q1 + Q.qd.cx, q2x = Q.q2 + Q.qd.cx;
    ripple(q1x, Q.yA + Q.qd.cy, t, T.dock1, Q.qd.r, 60, P.ochre, 0.5, 1.6);
    ripple(q2x, Q.yB2 + Q.qd.cy, t, T.dock2, Q.qd.r, 60, P.ochre, 0.5, 1.6);
    // Hero dot
    if (t < T.bar1) {
      const h = heroS1(t), [vx, vy] = heroVel(heroS1, t);
      const sq = 0.35 * wobble(t - T.dock1, 6, 12) + 0.35 * wobble(t - T.dock2, 6, 12);
      dot(h.x, h.y, h.r, h.c, 1, vx, vy, sq);
    }
  }
  // Question mark: hook revealed by spring; its own dot appears once the hero leaves.
  function drawQuestion(t, x, y, tau, color, heroHere, line, f, ownDotAt) {
    const ti = t - tau;
    if (ti <= 0) return;
    const p = spring(ti, 2.3, 0.62);
    const dy = (1 - p) * 150 + (f ? f.dy : 0), dx = f ? f.dx : 0, r = (1 - p) * 0.35 + (f ? f.r : 0), a = clamp(ti / 0.07) * (f ? f.a : 1);
    if (a <= 0.002) return;
    ctx.save();
    ctx.beginPath(); ctx.rect(x - 60, y - 400, 300, 400 + Q.L1.desc); ctx.clip();
    ctx.translate(x + dx + Q.L1.ws[Q.L1.text.length - 1] / 2, y + dy); ctx.rotate(r); ctx.translate(-Q.L1.ws[Q.L1.text.length - 1] / 2, 0);
    ctx.beginPath(); ctx.rect(-40, -300, 300, 300 + Q.qd.cut + 1); ctx.clip();
    ctx.font = Q.font; ctx.letterSpacing = '0px'; ctx.textAlign = 'left'; ctx.fillStyle = color; ctx.globalAlpha = a;
    ctx.fillText('?', 0, 0);
    ctx.restore(); ctx.globalAlpha = 1;
    if (t > ownDotAt) {
      const s = E.outBack(seg(t, ownDotAt, ownDotAt + 0.25));
      ctx.save(); ctx.beginPath(); ctx.rect(x - 60, y - 400, 300, 400 + Q.L1.desc); ctx.clip();
      if (s > 0) dot(x + dx + Q.qd.cx, y + dy + Q.qd.cy, Q.qd.r * s, color, a);
      ctx.restore();
    }
  }

  /* ============================================================ scene 2
     The evidence. The dot stretches into a bar; the EU bar clones itself to
     show "nearly twice"; then the comparison flips to organisations and the
     space in between is flagged. */
  const B = { x0: 150, S: 39, y1: 482, y2: 668, h: 64 };
  const bx = v => B.x0 + v * B.S;
  function barVals(t) {
    const v1 = 29.5 * E.outQuint(seg(t, T.bar1, T.bar1 + 1.1));
    let v2 = 15.1 * E.outQuint(seg(t, T.bar2, T.bar2 + 1.1));
    v2 += (21.6 - 15.1) * E.inOutQuart(seg(t, T.phaseB + 0.05, T.phaseB + 0.8));
    return [v1, v2];
  }
  function scene2(t) {
    if (t < T.out1) return;
    const [v1, v2] = barVals(t);
    const pb = seg(t, T.phaseB, T.phaseB + 0.55);
    // Gap band (drawn beneath the bars)
    if (t > T.band) drawBand(t);
    // Bar 1
    if (t >= T.bar1) {
      const L = Math.max(B.h, v1 * B.S);
      pill(B.x0, B.y1 - B.h / 2, L, B.h); ctx.fillStyle = P.pine; ctx.fill();
      odometer(v1, { x: B.x0 + L + 26, y: B.y1 + 27, font: F.disp(78), size: 78, dec: 1, intCols: 2, color: P.ink, suffix: '%', gap: 2 });
    }
    // Bar 2
    if (t >= T.bar2) {
      const pop = spring(t - T.bar2, 3, 0.55);
      const L = Math.max(B.h, v2 * B.S);
      ctx.save(); ctx.translate(B.x0 + B.h / 2, B.y2); ctx.scale(pop, pop); ctx.translate(-(B.x0 + B.h / 2), -B.y2);
      pill(B.x0, B.y2 - B.h / 2, L, B.h); ctx.fillStyle = mix('#E0D8C6', '#CEC5B0', pb); ctx.fill();
      ctx.restore();
      odometer(v2, { x: B.x0 + L + 26, y: B.y2 + 27, font: F.disp(78), size: 78, dec: 1, intCols: 2, color: mix(P.faint, P.muted, pb), suffix: '%', gap: 2, alpha: clamp((t - T.bar2) / 0.15) });
    }
    // Dimension line: the EU bar's length, laid off twice, lands just past Malta's bar.
    const da = seg(t, T.ghost, T.ghost + 0.12) * (1 - seg(t, T.phaseB - 0.02, T.phaseB + 0.2));
    if (da > 0) {
      const yd = (B.y1 + B.y2) / 2 - 22, xa = B.x0, xm = bx(15.1), xe = bx(30.2);
      const p1 = E.inOutCubic(seg(t, T.ghost, T.ghost + 0.4)), p2 = E.inOutCubic(seg(t, T.ghost + 0.3, T.ghost + 0.75));
      ctx.save(); ctx.globalAlpha = da; ctx.strokeStyle = P.muted; ctx.lineWidth = 1.5; ctx.fillStyle = P.muted;
      const seg1 = lerp(xa, xm, p1), seg2 = lerp(xm, xe, p2);
      ctx.beginPath(); ctx.moveTo(xa, yd); ctx.lineTo(seg1, yd); if (p2 > 0) { ctx.moveTo(xm, yd); ctx.lineTo(seg2, yd); } ctx.stroke();
      const tick = (x, a) => { if (a <= 0) return; ctx.globalAlpha = da * a; ctx.beginPath(); ctx.moveTo(x, yd - 9); ctx.lineTo(x, yd + 9); ctx.stroke(); };
      tick(xa, 1); tick(xm, seg(p1, 0.9, 1)); tick(xe, seg(p2, 0.9, 1));
      // knock-out labels
      const lab = (x, a) => { if (a <= 0) return; ctx.globalAlpha = da * a; ctx.fillStyle = P.paper; ctx.fillRect(x - 38, yd - 12, 76, 24); text('15.1', F.mono(17, 500), x, yd + 6, P.muted, da * a, 'center'); };
      lab((xa + xm) / 2, seg(p1, 0.6, 1)); lab((xm + xe) / 2, seg(p2, 0.6, 1));
      // alignment guide from the end of Malta's bar
      const ga = seg(t, T.ghost + 0.65, T.ghost + 0.82);
      ctx.globalAlpha = da * ga; ctx.setLineDash([3, 5]); ctx.beginPath(); ctx.moveTo(bx(29.5), B.y1 + B.h / 2 + 6); ctx.lineTo(bx(29.5), yd + 9); ctx.stroke(); ctx.setLineDash([]);
      ctx.restore();
      text('× 2', F.mono(20, 500), xe + 16, yd + 7, P.ink, da * ga);
    }
    // Labels (flip between phase A and B)
    const lab = (a, b, y, tIn) => {
      const f = F.text(24, 500);
      if (t < T.phaseB + 0.25) rise(lay(a, f), B.x0, y, P.muted, t, tIn, { tOut: T.phaseB, dur: 0.6 });
      if (t > T.phaseB + 0.1) rise(lay(b, f), B.x0, y, P.muted, t, T.phaseB + 0.12, { dur: 0.6, stagger: 0.03 });
    };
    lab('Malta', 'People  ·  use generative AI for work', B.y1 - 54, T.bar1 + 0.08);
    lab('European Union', 'Organisations  ·  report using any AI', B.y2 - 54, T.bar2 + 0.08);
    // Headlines
    const hf = F.disp(66);
    rise(lay('Nearly twice the EU average.', hf), 150, 272, P.ink, t, T.head1, { tOut: T.phaseB, stagger: 0.045 });
    rise(lay('Individual use is running ahead.', hf), 150, 272, P.ink, t, T.head2, { stagger: 0.045 });
    // Source
    text('Source: Eurostat, 2025. Individual GenAI use; enterprises with 10+ employees.', F.text(18, 400), 150, 938, P.faint, seg(t, T.bar1 + 0.3, T.bar1 + 0.6) * (1 - seg(t, T.zoom - 0.2, T.zoom)));
  }
  function drawBand(t) {
    const xa = bx(21.6), xb = bx(29.5), cy = (B.y1 + B.y2) / 2;
    const hh = 176 * E.outExpo(seg(t, T.band, T.band + 0.65));
    const zp = seg(t, T.zoom, T.dark);
    ctx.save();
    ctx.beginPath(); ctx.rect(xa, cy - hh, xb - xa, hh * 2); ctx.clip();
    ctx.fillStyle = P.ochreSoft;
    ctx.fillRect(xa, cy - hh, xb - xa, hh * 2);
    // hatch: the unmeasured area
    ctx.globalAlpha = 0.38 * (1 - seg(zp, 0.2, 0.7));
    ctx.strokeStyle = P.ochre; ctx.lineWidth = 1.6; ctx.beginPath();
    for (let x = xa - 400; x < xb + 400; x += 13) { ctx.moveTo(x, cy - hh); ctx.lineTo(x + hh * 2, cy + hh); }
    ctx.stroke();
    const pa = E.inOutCubic(seg(t, T.zoom - 0.12, T.zoom + 0.3));
    if (pa > 0 && off) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = pa; ctx.drawImage(off, 0, 0); }
    ctx.restore();
    ctx.fillStyle = rgba(P.ochre, 1 - seg(zp, 0.3, 0.8));
    ctx.fillRect(xa - 1, cy - hh, 2, hh * 2); ctx.fillRect(xb - 1, cy - hh, 2, hh * 2);
    const la = seg(t, T.band + 0.25, T.band + 0.45);
    if (la > 0) text('THE SPACE IN BETWEEN', F.text(18, 600), xa, cy - hh - 16, P.ochre, la * (1 - zp), 'left', 2.2);
  }

  /* ============================================================ scene 3
     Shadow AI. Inside the gap: untracked use drifts in the dark, out of focus. */
  const NP = 240;
  const PT = [], DUST = [];
  function initParticles() {
    const r = rng(20260925);
    for (let i = 0; i < NP; i++) {
      const u = () => r();
      PT.push({
        X: 960 + (u() - 0.5) * 3300, Y: 540 + (u() - 0.5) * 1900, Z: 0.62 + u() * 2.0,
        s: 2.6 + 5.4 * u() ** 2, ph: u() * TAU, ph2: u() * TAU, vy: (u() - 0.5) * 30, amp: 30 + u() * 50,
        b: 0.62 + 0.38 * u(), tw: u(),
      });
    }
    // Extra dust that only lives in the dark (it is wiped away by the measure).
    for (let i = 0; i < 170; i++) {
      const u = () => r(), fg = i < 14;
      DUST.push({ X: 960 + (u() - 0.5) * 3600, Y: 540 + (u() - 0.5) * 2100, Z: fg ? 0.95 + u() * 0.35 : 0.9 + u() * 2.6,
        s: fg ? 10 + 14 * u() : 1.4 + 2.6 * u(), ph: u() * TAU, ph2: u() * TAU, vy: (u() - 0.5) * 24, amp: 20 + u() * 60, b: fg ? 0.35 : 0.3 + 0.5 * u(), fg });
    }
    // Four annotated particles, placed so their labels land in clear space.
    const lab = [
      ['Unapproved tools', 1270, 318], ['Unrecorded workflows', 1395, 492],
      ['Outputs nobody verified', 1540, 690], ['Sensitive data in consumer apps', 1160, 862],
    ];
    PT.labels = lab.map(([txt, sx, sy], k) => {
      const i = 17 + k * 41, p = PT[i];
      p.Z = 1.18 + k * 0.05; p.s = 5;
      const tt = T.sub3 + 0.35, z = p.Z - camZ(tt);
      // invert the projection for time tt (ignoring drift terms, then subtract them)
      const dxd = p.amp * Math.sin(0.55 * tt + p.ph), dyd = 0.7 * p.amp * Math.sin(0.7 * tt + p.ph2) + (tt - T.zoom) * p.vy;
      p.X = 960 + (sx - 960) * z + camX(tt) - dxd; p.Y = 540 + (sy - 540) * z - dyd;
      return { i, txt };
    });
  }
  const camZ = t => { const u = Math.max(0, t - T.zoom); return -0.9 + 0.9 * (1 - Math.exp(-2.2 * u)) + 0.045 * u; };
  const camX = t => Math.max(0, t - T.zoom) * 20;
  function darkPos(p, t) {
    const z = p.Z - camZ(t);
    const X = p.X + p.amp * Math.sin(0.55 * t + p.ph), Y = p.Y + 0.7 * p.amp * Math.sin(0.7 * t + p.ph2) + (t - T.zoom) * p.vy;
    return { x: 960 + (X - camX(t) - 960) / z, y: 540 + (Y - 540) / z, z };
  }
  function darkBg() {
    const g = ctx.createRadialGradient(900, 520, 80, 960, 560, 1250);
    g.addColorStop(0, '#1D2D27'); g.addColorStop(0.55, '#15211D'); g.addColorStop(1, '#0C1512');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  function scene3(t, opts = {}) {
    darkBg();
    // particles (unsnapped only when the measure sweep is running)
    const fade = seg(t, T.zoom - 0.12, T.zoom + 0.12);
    const Lx = opts.lineX ?? -1e9;
    for (let i = 0; i < NP; i++) {
      const p = PT[i];
      if (opts.skip && opts.skip(i)) continue;
      const d = darkPos(p, t);
      if (d.z < 0.2) continue;
      const r = p.s / d.z, blur = clamp(Math.abs(d.z - 1.12) * 7.5, 0, 16);
      const tw = 0.75 + 0.25 * Math.sin(t * 3 + p.ph * 3);
      softDot(d.x, d.y, r, blur, P.dOchre, fade * p.b * tw * clamp((d.z - 0.2) / 0.3));
    }
    for (const p of DUST) {
      const d = darkPos(p, t);
      if (d.z < 0.25) continue;
      const blur = p.fg ? 10 + 18 * clamp(Math.abs(d.z - 0.55)) : clamp(Math.abs(d.z - 1.12) * 7.5, 0, 14);
      softDot(d.x, d.y, p.s / d.z, blur, P.dOchre, fade * p.b * clamp((d.z - 0.25) / 0.3));
    }
    // annotations
    PT.labels.forEach(({ i, txt }, k) => {
      const p = PT[i]; const d = darkPos(p, t);
      const a = seg(t, T.ann + k * 0.2, T.ann + 0.3 + k * 0.2) * (d.x < Lx + 30 ? 0 : 1);
      if (a <= 0) return;
      ctx.beginPath(); ctx.arc(d.x, d.y, 11 + 6 * (1 - E.outCubic(seg(t, T.ann + k * 0.2, T.ann + 0.4 + k * 0.2))), 0, TAU);
      ctx.strokeStyle = rgba(P.dInk, 0.55 * a); ctx.lineWidth = 1.2; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(d.x + 13, d.y); ctx.lineTo(d.x + 34, d.y); ctx.stroke();
      text(txt, F.text(21, 500), d.x + 42, d.y + 7, P.dBody, a * 0.95);
    });
    // Title with a rack focus
    const tp = seg(t, T.title3, T.title3 + 0.85);
    if (tp > 0) {
      ctx.save();
      const blur = 26 * (1 - E.outCubic(tp));
      if (blur > 0.3) ctx.filter = `blur(${blur.toFixed(2)}px)`;
      const s = lerp(1.05, 1, E.outCubic(tp)) + 0.022 * E.inOutSine(seg(t, T.sweep4 - 1.4, T.sweep4));
      ctx.translate(150, 612); ctx.scale(s, s);
      text('Shadow AI', F.disp(212), 0, 0, P.dInk, clamp(tp * 1.6), 'left', lerp(14, -2, E.outCubic(tp)));
      ctx.restore(); ctx.filter = 'none';
    }
    rise(lay('Work the organisation never records.', F.sub(50)), 154, 728, P.dOchre, t, T.sub3, { stagger: 0.05 });
  }

  /* ============================================================ scene 4
     The measure. A ruler edge sweeps the frame: dark becomes paper, and every
     drifting point snaps into an ordered, measured grid. */
  const GRID = { cols: 30, rows: 8, x0: 150, x1: 1770, y0: 440, dy: 54 };
  const lineX = t => lerp(-40, W + 60, E.inOutCubic(seg(t, T.sweep4, T.sweep4End)));
  function initGrid() {
    const at = T.sweep4;
    const order = PT.map((p, i) => ({ i, x: darkPos(p, at).x, y: darkPos(p, at).y })).sort((a, b) => a.x - b.x);
    for (let c = 0; c < GRID.cols; c++) {
      const col = order.slice(c * GRID.rows, (c + 1) * GRID.rows).sort((a, b) => a.y - b.y);
      col.forEach((o, r) => {
        const p = PT[o.i];
        p.gx = lerp(GRID.x0, GRID.x1, c / (GRID.cols - 1)); p.gy = GRID.y0 + r * GRID.dy; p.gc = c; p.gr = r;
        // snap time: when the sweeping line reaches the point
        let tt = T.sweep4; while (tt < T.sweep4End && lineX(tt) < o.x) tt += 0.002;
        p.snap = tt;
      });
    }
  }
  function gridPos(p, t) {
    const d = darkPos(p, t), q = spring(t - p.snap, 2.1, 0.62);
    const breathe = 1 + 0.24 * Math.exp(-((t - T.sweep4End - 0.15 - p.gx / 5200) ** 2) / 0.0022);
    return { x: lerp(d.x, p.gx, q), y: lerp(d.y, p.gy, q), r: lerp(p.s / d.z, 6.2, clamp(q)) * breathe, q, d };
  }
  function lightBg(gridA = 1, zoom = 1) {
    ctx.fillStyle = P.paper; ctx.fillRect(0, 0, W, H);
    paperGrid(zoom, 960, 540, 0.55 * gridA);
  }
  function scene4(t) {
    const Lx = lineX(t);
    scene3(t, { lineX: Lx, skip: i => t >= PT[i].snap });
    // paper side
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, Math.max(0, Lx), H); ctx.clip();
    lightBg();
    const hf = F.disp(66), L = lay('A recurring measurement system.', hf);
    // words rise when the line has passed them
    const wx = []; for (let i = 0; i < L.text.length; i++) if (L.wordOf[i] >= 0 && wx[L.wordOf[i]] == null) wx[L.wordOf[i]] = 150 + L.xs[i];
    const tw = wx.map(x => { let tt = T.sweep4; while (tt < T.sweep4End && lineX(tt) < x) tt += 0.004; return tt; });
    ctx.save(); ctx.beginPath(); ctx.rect(0, 272 - L.asc - 10, W, L.asc + L.desc + 20); ctx.clip();
    glyphs(L, 150, 272, i => { const k = L.wordOf[i], ti = t - tw[k] - 0.02; if (ti <= 0) return null; const p = E.outExpo(clamp(ti / 0.7)); return { a: 1, dy: (1 - p) * 90, c: P.ink }; });
    ctx.restore();
    rise(lay('One code  ·  one anonymous assessment  ·  one benchmarked report', F.text(24, 500)), 150, 902, P.muted, t, T.sub4, { dur: 0.6, stagger: 0.03 });
    ctx.restore();
    // snapped points
    for (let i = 0; i < NP; i++) {
      const p = PT[i]; if (t < p.snap) continue;
      const g = gridPos(p, t);
      const col = mix(P.dOchre, P.pine, seg(g.q, 0, 0.5));
      softDot(g.x, g.y, g.r, clamp(Math.abs(g.d.z - 1.12) * 7.5, 0, 16) * (1 - clamp(g.q * 2)), col, 1);
    }
    // the measuring edge
    if (Lx > -30 && Lx < W + 40) {
      const gl = ctx.createLinearGradient(Lx, 0, Lx + 90, 0);
      gl.addColorStop(0, rgba(P.dOchre, 0.28)); gl.addColorStop(1, rgba(P.dOchre, 0));
      ctx.fillStyle = gl; ctx.fillRect(Lx, 0, 90, H);
      ctx.fillStyle = P.ochre; ctx.fillRect(Lx - 1.5, 0, 3, H);
      ctx.beginPath();
      for (let y = 6; y < H; y += 18) { const L2 = (Math.round(y / 18) % 5 === 0) ? 22 : 10; ctx.moveTo(Lx + 1.5, y); ctx.lineTo(Lx + 1.5 + L2, y); }
      ctx.strokeStyle = P.ochre; ctx.lineWidth = 1.5; ctx.stroke();
      const val = clamp(Lx / W) * 100;
      ctx.fillStyle = P.ochre; pill(Lx + 12, 118, 92, 32); ctx.fill();
      text(val.toFixed(1).padStart(5, '0'), F.mono(17, 500), Lx + 58, 140, P.dPaper, 1, 'center');
    }
  }

  /* ============================================================ scene 5
     Six dimensions. The measured grid pours into a radar that tilts up to
     face camera; values spring out to their scores. */
  const RC = { x: 1240, y: 596 }, RR = 262;
  const DIMS = [['Awareness', 100], ['Adoption', 83], ['Literacy', 100], ['Organisation', 79], ['Affinity (ATI)', 67], ['Demonstrated', 100]];
  const axA = k => -Math.PI / 2 + (k * Math.PI) / 3;
  const tiltAt = t => 1.02 * (1 - E.outCubic(seg(t, T.flow, T.flow + 1.35)));
  const spinAt = t => -0.55 * (1 - E.outCubic(seg(t, T.flow, T.flow + 1.35)));
  function proj(x, y, t) {
    const sp = spinAt(t), c = Math.cos(sp), s = Math.sin(sp);
    const X = x * c - y * s, Y = x * s + y * c, ti = tiltAt(t);
    const Y2 = Y * Math.cos(ti), Z2 = Y * Math.sin(ti), k = 1500 / (1500 + Z2);
    return [RC.x + X * k, RC.y + Y2 * k, k];
  }
  const hexPt = (rad, s) => {
    // point along a hexagon perimeter (s in [0,1)), vertices at the axis angles
    const e = s * 6, k = Math.floor(e) % 6, f = e - Math.floor(e);
    const a = axA(k), b = axA(k + 1);
    return [lerp(rad * Math.cos(a), rad * Math.cos(b), f), lerp(rad * Math.sin(a), rad * Math.sin(b), f)];
  };
  function initRadar() {
    const pts = PT.map((p, i) => ({ i, d: Math.hypot(p.gx - RC.x, p.gy - RC.y), a: Math.atan2(p.gy - RC.y, p.gx - RC.x) })).sort((a, b) => a.d - b.d);
    let o = 0;
    for (let ring = 1; ring <= 4; ring++) {
      const n = 24 * ring, grp = pts.slice(o, o + n).sort((a, b) => a.a - b.a); o += n;
      // slots sorted by the same angle convention
      const slots = []; for (let j = 0; j < n; j++) { const s = j / n, hp = hexPt((ring * RR) / 4, s); slots.push({ s, ring, a: Math.atan2(hp[1], hp[0]) }); }
      slots.sort((a, b) => a.a - b.a);
      grp.forEach((g, j) => { const p = PT[g.i]; p.ring = ring; p.hs = slots[j].s; p.fd = (ring - 1) * 0.05 + hash(g.i, 9) * 0.1; });
    }
  }
  function radarDots(t) {
    for (let i = 0; i < NP; i++) {
      const p = PT[i];
      if (!p.g0) { const g = gridPos(p, T.flow); p.g0 = { x: g.x, y: g.y, r: g.r }; }
      const q = E.inOutCubic(seg(t, T.flow + p.fd, T.flow + p.fd + 0.85));
      const hp = hexPt((p.ring * RR) / 4, p.hs);
      // hexagon -> circle in the radar-to-ring morph
      const cm = E.inOutCubic(seg(t, T.morph6, T.morph6 + 0.55));
      const ang = Math.atan2(hp[1], hp[0]), rad = Math.hypot(hp[0], hp[1]);
      const rr = lerp(rad, (p.ring * RR) / 4, cm);
      const [tx, ty] = proj(rr * Math.cos(ang), rr * Math.sin(ang), t);
      // curled flight from the grid into the slot (a shared clockwise drift around the radar)
      const sx = p.g0.x, sy = p.g0.y, dist = Math.hypot(tx - sx, ty - sy);
      const rx = sx - RC.x, ry = sy - RC.y, rl = Math.hypot(rx, ry) || 1;
      const curl = 0.28 * dist * Math.sin(Math.PI * q);
      const x = lerp(sx, tx, q) + (-ry / rl) * curl, y = lerp(sy, ty, q) + (rx / rl) * curl;
      const rad0 = p.g0.r, rad1 = 3.1;
      const al = 1 - seg(t, T.morph6 + 0.05, T.morph6 + 0.5);
      const col = mix(P.pine, '#BDB39D', seg(q, 0.4, 1));
      softDot(x, y, lerp(rad0, rad1, q), 0, col, al);
    }
  }
  function scene5(t) {
    const out = seg(t, T.morph6 - 0.05, T.morph6 + 0.3);
    // spokes
    for (let k = 0; k < 6; k++) {
      const p = E.outCubic(seg(t, T.spokes + k * 0.05, T.spokes + 0.45 + k * 0.05));
      if (p <= 0) continue;
      const [x0, y0] = proj(0, 0, t), [x1, y1] = proj(RR * p * Math.cos(axA(k)), RR * p * Math.sin(axA(k)), t);
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.strokeStyle = rgba('#BDB39D', 0.9 * (1 - out)); ctx.lineWidth = 1.5; ctx.stroke();
    }
    radarDots(t);
    // data polygon, morphing into the ring track
    const cm = E.inOutCubic(seg(t, T.morph6, T.morph6 + 0.55));
    if (t > T.poly) {
      const vr = DIMS.map(([, v], k) => (RR * v) / 100 * spring(t - T.poly - k * 0.05, 1.9, 0.55));
      ctx.beginPath();
      const N = 360;
      for (let i = 0; i <= N; i++) {
        const a = -Math.PI / 2 + (i / N) * TAU;
        const e = ((a + Math.PI / 2) / (Math.PI / 3)); const k = Math.floor(e) % 6, f = e - Math.floor(e);
        const a0 = axA(k), a1 = axA(k + 1), r0 = vr[k], r1 = vr[(k + 1) % 6];
        // intersection of ray with the polygon edge
        const p0x = r0 * Math.cos(a0), p0y = r0 * Math.sin(a0), p1x = r1 * Math.cos(a1), p1y = r1 * Math.sin(a1);
        const dx = Math.cos(a), dy = Math.sin(a), ex = p1x - p0x, ey = p1y - p0y;
        const den = dx * ey - dy * ex; const rp = Math.abs(den) < 1e-9 ? lerp(r0, r1, f) : (p0x * ey - p0y * ex) / den;
        const r = lerp(rp, 250, cm);
        const [x, y] = proj(r * dx, r * dy, t);
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.closePath();
      ctx.fillStyle = rgba(P.pine, 0.13 * (1 - cm)); ctx.fill();
      ctx.lineWidth = lerp(3, 40, cm); ctx.strokeStyle = mix(P.pine, P.track, cm); ctx.lineJoin = 'round'; ctx.stroke();
      // vertices
      DIMS.forEach(([, v], k) => {
        const [x, y] = proj(vr[k] * Math.cos(axA(k)), vr[k] * Math.sin(axA(k)), t);
        const a = 1 - out;
        if (k === 4) {
          for (let j = 0; j < 3; j++) ripple(x, y, t, T.poly + 0.45 + j * 0.6, 8, 34, P.ochre, 0.7, 1.5);
          dot(x, y, 9, P.ochre, a);
        } else dot(x, y, 6.5, P.pine, a);
      });
    }
    // labels
    DIMS.forEach(([name, v], k) => {
      const t0 = T.labels + k * 0.09, p = seg(t, t0, t0 + 0.55);
      if (p <= 0) return;
      const e = E.outExpo(p), a = clamp(p * 3) * (1 - out);
      const ang = axA(k), rad = RR + 38 + (1 - e) * -22 + out * 30;
      const [x, y] = proj(rad * Math.cos(ang), rad * Math.sin(ang), t);
      const align = k === 0 || k === 3 ? 'center' : k < 3 ? 'left' : 'right';
      const oy = k === 0 ? -34 : k === 3 ? 30 : 0;
      text(name, F.text(21, 500), x, y + oy + 26, P.body, a, align);
      odometer(v * E.outCubic(seg(t, t0 + 0.05, t0 + 0.6)), { x, y: y + oy - 2, font: F.disp(40), size: 40, intCols: v === 100 ? 3 : 2, color: k === 4 ? P.ochre : P.pine, align, alpha: a });
    });
    // copy
    const hf = F.disp(66);
    rise(lay('Six dimensions.', hf), 150, 272, P.ink, t, T.flow + 0.1, { tOut: T.morph6 - 0.02, stagger: 0.05 });
    rise(lay('One readiness score.', hf), 150, 352, P.pine, t, T.sub5, { tOut: T.morph6 + 0.02, stagger: 0.05 });
    rise(lay('Five self-reported, one tested. Each scored 0–100.', F.text(24, 500)), 150, 902, P.muted, t, T.cap5, { tOut: T.morph6, dur: 0.6, stagger: 0.03 });
  }

  /* ============================================================ scene 6
     Remeasurement. The ring fills take by take; the head of the arc is the
     same ochre point we started with. */
  const RING = { ro: 270, ri: 230 };
  const TAKES = [[43, '18 Jun 2026'], [59, '18 Jul 2026'], [71, '17 Aug 2026'], [81, '11 Sept 2026']];
  function ringVal(t) {
    let v = 0;
    TAKES.forEach(([s], i) => { const prev = i ? TAKES[i - 1][0] : 0; v += (s - prev) * E.outQuint(seg(t, T.take[i], T.take[i] + 0.62)); });
    return v;
  }
  const arcEnd = v => -Math.PI / 2 + (TAU * v) / 100;
  function scene6(t) {
    const out = seg(t, T.out6, T.out6 + 0.3);
    // track
    if (t < T.morph7 + 0.2 && t > T.morph6 + 0.54) {
      ctx.beginPath(); ctx.arc(RC.x, RC.y, 250, 0, TAU); ctx.lineWidth = 40; ctx.strokeStyle = rgba(P.track, 1 - seg(t, T.out6 + 0.05, T.morph7 + 0.15)); ctx.stroke();
    }
    const v = ringVal(t);
    if (t < T.morph7 && t > T.take[0]) {
      const grow = E.outBack(seg(t, T.take[0], T.take[0] + 0.25), 2.2);
      ctx.save(); ctx.translate(RC.x, RC.y); ctx.scale(1, 1);
      const S = ringSec(RING.ro, RING.ri, -Math.PI / 2, arcEnd(Math.max(v, 0.001)));
      pathSec({ a: S }, 0, 0, 1, 1);
      ctx.globalAlpha = clamp(grow * 3); ctx.fillStyle = P.pine; ctx.fill(); ctx.globalAlpha = 1;
      ctx.restore();
    }
    // counter
    if (t > T.take[0] - 0.05) {
      const a = seg(t, T.take[0] - 0.05, T.take[0] + 0.15) * (1 - out);
      const o = odometer(v, { x: RC.x - 8, y: RC.y + 52, font: F.disp(172), size: 172, intCols: 2, color: P.ink, align: 'center', alpha: a, suffix: '%', suffixFont: F.disp(64), suffixY: RC.y + 52, gap: 6 });
      void o;
      text('READINESS', F.text(17, 600), RC.x, RC.y + 108, P.muted, a, 'center', 2.6);
    }
    // takes list
    TAKES.forEach(([s, date], i) => {
      const t0 = T.take[i], p = seg(t, t0, t0 + 0.55);
      if (p <= 0) return;
      const e = E.outExpo(p), y = 478 + i * 88;
      const ox = -out * 60 - (1 - e) * 24, a = clamp(p * 2.5) * (1 - seg(t, T.out6 + i * 0.04, T.out6 + 0.25 + i * 0.04));
      const latest = i === TAKES.findLastIndex((_, j) => t >= T.take[j]);
      const cS = mix(P.muted, P.ink, latest ? 1 : 0);
      text(`TAKE ${i + 1}`, F.mono(18, 500), 150 + ox, y, P.muted, a, 'left', 1.2);
      text(date, F.text(22, 400), 262 + ox, y, P.muted, a);
      odometer(s * E.outQuint(seg(t, t0, t0 + 0.55)), { x: 700 + ox, y: y + 6, font: F.disp(46), size: 46, intCols: 2, color: cS, align: 'right', alpha: a });
      if (i > 0) {
        const bp = spring(t - t0 - 0.12, 2.6, 0.55), d = s - TAKES[i - 1][0];
        if (bp > 0) {
          ctx.save(); ctx.translate(760 + ox, y - 8); ctx.scale(bp, bp); ctx.globalAlpha = a;
          pill(-4, -17, 86, 34); ctx.fillStyle = P.pineSoft; ctx.fill();
          ctx.restore();
          text(`▲ ${d}`, F.text(19, 600), 796 + ox, y - 1, P.positive, a * clamp(bp), 'center');
        }
      }
      const lw = 740 * E.outExpo(seg(t, t0 + 0.05, t0 + 0.6));
      ctx.fillStyle = rgba(P.borderStrong, a); ctx.fillRect(150 + ox, y + 30, lw, 1.5);
    });
    const hf = F.disp(66);
    rise(lay('Measure again.', hf), 150, 272, P.ink, t, T.morph6 + 0.35, { tOut: T.out6, stagger: 0.05 });
    rise(lay('See what changed.', hf), 150, 352, P.pine, t, T.take[1] + 0.05, { tOut: T.out6 + 0.03, stagger: 0.05 });
  }

  /* ============================================================ scene 7
     The mark. The ring's gap swings to 45° and the ring inflates into the
     Mesura mark; the ochre point is flung out through the slot and lands as
     the full stop in mesura.ai. */
  const LOCK = { D: 84, cx: 0, cy: 452 };
  let MK;
  function lockX() { const minX = -1, maxX = 11.93; return 960 - ((maxX + minX) / 2) * LOCK.D; }
  function markState(t) {
    const m = E.inOutCubic(seg(t, T.morph7, T.hit));
    const mIn = E.inOutCubic(seg(t, T.morph7, T.hit - 0.12));
    const mOut = t < T.morph7 + 0.2 ? 0 : spring(t - T.morph7 - 0.2, 2.0, 0.5);
    const mv = E.brand(seg(t, T.hit + 0.02, T.dot));
    const bump = 1 + 0.07 * wobble(t - T.hit, 3.2, 7.5);
    const C0 = { x: 960, y: 520, D: 282 };
    const x = lerp(C0.x, lockX(), mv), y = lerp(C0.y, LOCK.cy, mv), D = lerp(C0.D, LOCK.D, mv) * bump;
    return { m, mIn, mOut, x, y, D, C0 };
  }
  const GAPC = (() => { const v = 81, a1 = arcEnd(v), a0 = -Math.PI / 2; return (a1 + a0 + TAU) / 2; })();
  const ROT = (() => { let r = SLOT - GAPC; while (r < 0) r += TAU; return r; })();
  function heroS6(t) {
    // the arc head (ochre point) — rides the ring, then the slot, then flies to the full stop
    const v = ringVal(t);
    const ms = markState(t);
    if (t < T.morph7) {
      const a = arcEnd(v);
      return { x: RC.x + 250 * Math.cos(a), y: RC.y + 250 * Math.sin(a), r: 11 };
    }
    const rot = ROT * ms.m;
    const a = arcEnd(81) + rot;
    const ringX = lerp(RC.x, ms.C0.x, ms.m), ringY = lerp(RC.y, ms.C0.y, ms.m);
    const onRing = { x: ringX + 250 * Math.cos(a), y: ringY + 250 * Math.sin(a) };
    const slotR = 0.6;
    const inSlot = { x: ms.x + ms.D * slotR * Math.cos(SLOT), y: ms.y + ms.D * slotR * Math.sin(SLOT) };
    const pre = { x: lerp(onRing.x, inSlot.x, ms.m), y: lerp(onRing.y, inSlot.y, ms.m), r: lerp(11, 16, ms.m) };
    const LP = { x: lockX() + 9.7376 * LOCK.D, y: LOCK.cy + 0.4286 * LOCK.D, r: 0.2016 * LOCK.D };
    const tl = T.hit + 0.08;
    if (t < tl) return pre;
    const p = seg(t, tl, T.dot), e = E.inOutCubic(p);
    const st = heroAtLaunch || (heroAtLaunch = (() => { const s = markState(tl); return { x: s.x + s.D * slotR * Math.cos(SLOT), y: s.y + s.D * slotR * Math.sin(SLOT) }; })());
    return { x: lerp(st.x, LP.x, e), y: lerp(st.y, LP.y, e) - 230 * Math.sin(Math.PI * Math.min(1, e * 1.0)), r: lerp(16, LP.r, e) };
  }
  let heroAtLaunch = null;
  function scene7(t) {
    const ms = markState(t);
    const v = ringVal(t);
    const rot = ROT * ms.m;
    // impact ripples (callback to the opening ping)
    ripple(ms.C0.x, ms.C0.y, t, T.hit, 290, 520, P.ochre, 0.8, 2.5);
    ripple(ms.C0.x, ms.C0.y, t, T.hit + 0.1, 290, 700, P.ochre, 1.0, 1.4);
    // wordmark
    const X = lockX(), Y = LOCK.cy, D = LOCK.D;
    const clipY = Y + 0.72 * D;
    ctx.save(); ctx.beginPath(); ctx.rect(X + 1.2 * D, 0, W, clipY); ctx.clip();
    WORDMARK.forEach((g, i) => {
      if (g.ch === '.') return;
      let t0, dy = 0, a = 1;
      if (g.color === 'pine') { t0 = T.word + i * 0.04; const p = spring(t - t0, 2.2, 0.72); if (t < t0) return; dy = (1 - p) * 1.5 * D; }
      else if (g.ch === 'idot') { t0 = T.dot + 0.16; if (t < t0) return; const p = seg(t, t0, t0 + 0.26); dy = -(1 - E.inCubic(p)) * 3 * D + (p >= 1 ? -0.35 * D * Math.abs(wobble(t - t0 - 0.26, 2.2, 8)) : 0); }
      else { t0 = T.dot + (g.ch === 'a' ? 0.02 : 0.07); const p = spring(t - t0, 2.4, 0.7); if (t < t0) return; dy = (1 - p) * 1.5 * D; }
      a = clamp((t - t0) / 0.06);
      ctx.save(); ctx.translate(X, Y + dy); ctx.scale(D, D);
      ctx.globalAlpha = a; ctx.fillStyle = g.color === 'pine' ? P.pine : P.ochre;
      ctx.fill(WPATH[i], 'evenodd'); ctx.restore(); ctx.globalAlpha = 1;
    });
    ctx.restore();
    // opaque core: letters rising behind the mark must not show through its hole or slot
    if (t > T.word - 0.05) {
      const S1 = MK.sec[0];
      ctx.beginPath(); S1.forEach(([x, y], i) => (i ? ctx.lineTo(ms.x + x * ms.D, ms.y + y * ms.D) : ctx.moveTo(ms.x + x * ms.D, ms.y + y * ms.D)));
      ctx.closePath(); ctx.fillStyle = P.paper; ctx.fill();
    }
    // ring -> mark
    if (t < T.hit + 0.8) {
      const S = ringSec(RING.ro, RING.ri, -Math.PI / 2, arcEnd(v));
      const cx = lerp(RC.x, ms.x, ms.m), cy = lerp(RC.y, ms.y, ms.m);
      pathSec({ a: S, b: MK.sec }, cx, cy, ms.D / ms.C0.D, ms.D, rot, ms.mOut, ms.mIn);
      const wp = E.inOutCubic(seg(t, T.morph7 + 0.02, T.hit - 0.04));
      if (wp <= 0) ctx.fillStyle = P.pine;
      else if (wp >= 1) ctx.fillStyle = P.ochre;
      else {
        const g = ctx.createConicGradient(arcEnd(v) + rot, cx, cy), f = 1 - wp * 1.04, soft = 0.04;
        g.addColorStop(0, P.pine); g.addColorStop(clamp(f - soft), P.pine); g.addColorStop(clamp(f), P.ochre); g.addColorStop(1, P.ochre);
        ctx.fillStyle = g;
      }
      ctx.fill();
    } else {
      markPath(MK, ms.x, ms.y, ms.D); ctx.fillStyle = P.ochre; ctx.fill();
    }
    // the ochre point: arc head -> slot -> full stop
    if (t > T.take[0]) {
      const h = heroS6(t), vv = heroVelF(t);
      const sq = 0.4 * wobble(t - T.dot, 5, 10);
      const grow = t < T.take[0] + 0.3 ? E.outBack(seg(t, T.take[0], T.take[0] + 0.3), 2.5) : 1;
      dot(h.x, h.y, h.r * grow, P.ochre, 1, vv[0], vv[1], sq);
      ripple(h.x, h.y, t, T.dot, h.r, 70, P.ochre, 0.55, 1.6);
    }
    // tagline
    const tf = F.sub(56);
    const L1 = lay('Measure where you stand.', tf), L2 = lay('Keep measuring.', tf);
    rise(L1, 960 - L1.width / 2, 668, P.ink, t, T.tag1, { stagger: 0.05 });
    rise(L2, 960 - L2.width / 2, 740, P.ochre, t, T.tag2, { stagger: 0.07 });
  }
  const heroVelF = t => { const h = 1 / 240, a = heroS6(t - h), b = heroS6(t + h); return [(b.x - a.x) / (2 * h), (b.y - a.y) / (2 * h)]; };
  let WPATH = [];

  /* =============================================================== HUD */
  const EYEBROW = [[T.bar1 - 0.05, 'EUROSTAT · 2025'], [T.phaseB + 0.05, 'MALTA · 2025'], [T.dark + 0.1, 'THE SPACE IN BETWEEN'], [T.sweep4 + 0.28, 'WHAT MESURA IS'], [T.flow + 0.05, 'WHAT MESURA MEASURES'], [T.morph6 + 0.15, 'HOW PROGRESS IS PROVEN'], [T.out6, '']];
  function hud(t, dark) {
    // eyebrow
    let k = -1; for (let i = 0; i < EYEBROW.length; i++) if (t >= EYEBROW[i][0]) k = i;
    if (k >= 0 && EYEBROW[k][1]) {
      const p = seg(t, EYEBROW[k][0], EYEBROW[k][0] + 0.42);
      const s = scramble(EYEBROW[k][1], p, t);
      const lx = t > T.sweep4 && t < T.sweep4End ? lineX(t) : null;
      const col = dark && !(lx != null && lx > 150) ? P.dOchre : P.ochre;
      const ea = t > T.zoom && t < T.dark + 0.1 ? 1 - seg(t, T.zoom, T.zoom + 0.12) : 1;
      text(s, F.text(20, 600), 150, 178, col, ea, 'left', 2.4);
    }
    // measuring rule + playhead
    const a = seg(t, 0.15, 0.6) * (1 - seg(t, T.out6 - 0.1, T.out6 + 0.4));
    if (a <= 0) return;
    const x0 = 150, x1 = 1770, y = 1012, px = lerp(x0, x1, t / DUR);
    const cPast = dark ? P.dMuted : P.muted, cFut = dark ? P.dFaint : P.faint;
    const reveal = E.outCubic(seg(t, 0.15, 0.9));
    const ticks = new Path2D();
    for (let i = 0; i <= Math.floor(DUR * 2); i++) {
      const x = lerp(x0, x1, (i / 2) / DUR); if ((x - x0) / (x1 - x0) > reveal) break;
      const hgt = i % 2 === 0 ? (i % 10 === 0 ? 14 : 9) : 5;
      ticks.moveTo(x + 0.5, y); ticks.lineTo(x + 0.5, y - hgt);
    }
    ctx.lineWidth = 1; ctx.strokeStyle = rgba(cFut, 0.75 * a); ctx.stroke(ticks);
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, px, H); ctx.clip(); ctx.strokeStyle = rgba(cPast, a); ctx.stroke(ticks); ctx.restore();
    ctx.fillStyle = rgba(cFut, 0.6 * a); ctx.fillRect(x0, y, (x1 - x0) * reveal, 1);
    ctx.fillStyle = rgba(cPast, a); ctx.fillRect(x0, y, px - x0, 1);
    ctx.fillStyle = rgba(dark ? P.dOchre : P.ochre, a); ctx.fillRect(px - 1, y - 20, 2, 26);
    [0, 5, 10, 15, 20, 25].forEach(s => text(`00:${String(s).padStart(2, '0')}`, F.mono(13), lerp(x0, x1, s / DUR), y + 26, dark ? P.dFaint : P.faint, a * clamp((reveal - s / DUR) * 8), s === 0 ? 'left' : 'center'));
  }

  /* ============================================================= frame */
  function drawFrame(t) {
    t = clamp(t, 0, DUR - 1e-6);
    reset();
    let dark = false;
    if (t < T.dark) {
      // Scenes 1-2 share one paper world with a slow push and, at the end, a dive into the gap.
      if (t > T.zoom - 0.13) renderTo(offCtx, () => scene3(t));
      ctx.fillStyle = P.paper; ctx.fillRect(0, 0, W, H);
      const push = 1 + 0.0035 * t;
      const zc = t > T.zoom ? Math.exp(Math.log(40) * E.inExpo(seg(t, T.zoom, T.dark))) : 1;
      const pre = 1 - 0.022 * E.inOutCubic(seg(t, T.zoom - 0.7, T.zoom)) * (1 - E.inOutCubic(seg(t, T.zoom, T.zoom + 0.15)));
      const fx = (bx(21.6) + bx(29.5)) / 2, fy = (B.y1 + B.y2) / 2;
      paperGrid(push * zc * pre, fx, fy, 0.55);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.translate(fx, fy); ctx.scale(zc * pre, zc * pre); ctx.translate(-fx, -fy);
      ctx.translate(960, 540); ctx.scale(push, push); ctx.translate(-960, -540);
      if (t < T.bar1 + 0.01) scene1(t);
      scene2(t);
      reset();
      dark = t > T.dark - 0.07;
    } else if (t < T.sweep4) {
      scene3(t); dark = true;
    } else if (t < T.flow) {
      scene4(t); dark = lineX(t) < 1200;
    } else {
      lightBg(1 - seg(t, T.morph7 + 0.15, T.hit + 0.2));
      if (t < T.morph6 + 0.5) scene5(t);
      if (t > T.morph6 + 0.2 && t < T.hit) scene6(t);
      if (t > T.morph7 - 0.001) {
        const k = 1 + 0.026 * E.inOutSine(seg(t, T.dot - 0.15, DUR));
        ctx.setTransform(k, 0, 0, k, 960 - 960 * k, 520 - 520 * k);
        scene7(t); reset();
      }
      else if (t > T.take[0]) { // hero dot riding the arc head
        const h = heroS6(t), vv = heroVelF(t);
        const grow = E.outBack(seg(t, T.take[0], T.take[0] + 0.3), 2.5);
        dot(h.x, h.y, h.r * grow, P.ochre, 1, vv[0], vv[1]);
      }
    }
    reset();
    hud(t, dark);
  }

  /* ============================================================== post */
  const post = frame => D.post(frame);
  function renderFrame(frame, opt = {}) {
    const t0 = frame / FPS;
    const n = opt.samples ?? samplesAt(t0), shutter = opt.shutter ?? shutterAt(t0);
    D.accumulate(t0, n, shutter, FPS, drawFrame);
    post(frame);
    return n;
  }
  const FAST = [[0, T.land + 0.06], [T.hop, T.dock1 + 0.06], [T.lift, T.dock2 + 0.05], [T.out1, T.bar1 + 1.2], [T.ghost, T.ghost + 0.85], [T.phaseB, T.phaseB + 0.85], [T.zoom - 0.05, T.dark + 0.4], [T.sweep4 - 0.05, T.sweep4End + 0.35], [T.flow, T.poly + 0.9], [T.morph6 - 0.05, T.morph6 + 0.65], [T.take[0], T.out6 + 0.35], [T.morph7, T.dot + 0.3]];
  const HEAVY = [[0.14, 0.46, 24], [T.zoom, T.zoom + 0.3, 16], [T.zoom + 0.3, T.zoom + 0.4, 32], [T.zoom + 0.4, T.dark + 0.03, 64], [T.sweep4, T.sweep4End + 0.02, 16], [T.morph7, T.hit + 0.12, 16], [T.hit + 0.08, T.dot + 0.04, 16]];
  const samplesAt = t => { for (const [a, b, n] of HEAVY) if (t >= a && t <= b) return n; return FAST.some(([a, b]) => t >= a && t <= b) ? 10 : 4; };
  const shutterAt = t => (t > T.zoom && t < T.dark + 0.05 ? 0.9 : 0.55);

  /* ============================================================== init */
  async function init() {
    await loadFonts();
    // graph-paper pattern
    const pc = document.createElement('canvas'); pc.width = pc.height = 48;
    const pg = pc.getContext('2d'); pg.fillStyle = P.gridDot; pg.beginPath(); pg.arc(24, 24, 1.25, 0, TAU); pg.fill();
    gridPat = ctx.createPattern(pc, 'repeat');
    off = document.createElement('canvas'); off.width = W; off.height = H;
    offCtx = off.getContext('2d', { willReadFrequently: true, alpha: false });
    MK = buildMark();
    WPATH = WORDMARK.map(g => new Path2D(g.d));
    initS1(); initParticles(); initGrid(); initRadar();
    drawFrame(0); post(0);
  }

  // Event sheet for the soundtrack: every audible moment is derived from the same animation maths.
  function cues() {
    const ticks = (fn, a, b, dec = 1, minGap = 0.028) => {
      const out = []; let last = null, lt = -1;
      for (let t = a; t <= b; t += 0.001) { const d = Math.floor(fn(t) * 10 ** dec + 1e-6); if (last !== null && d !== last && t - lt >= minGap) { out.push(+t.toFixed(4)); lt = t; } last = d; }
      return out;
    };
    const cols = [];
    for (let c = 0; c < GRID.cols; c++) { const ps = PT.filter(p => p.gc === c); cols.push({ t: Math.min(...ps.map(p => p.snap)), x: ps[0].gx }); }
    const L2t = []; for (let i = 0; i < Q.L2.text.length; i++) if (Q.L2.text[i] !== ' ') L2t.push(+(T.l2 + Q.L2.wordOf[i] * 0.1).toFixed(3));
    return {
      T, DUR,
      glyphs1: Q.tau.map((t, i) => ({ t: +t.toFixed(4), x: Q.x1 + Q.L1.xs[i] })).filter((_, i) => Q.L1.text[i] !== ' '),
      words2: [...new Set(L2t)],
      bar1: ticks(t => barVals(t)[0], T.bar1, T.bar1 + 1.2), bar2: ticks(t => barVals(t)[1], T.bar2, T.phaseB + 0.8),
      ring: ticks(ringVal, T.take[0], T.take[3] + 0.8, 0, 0.02),
      columns: cols,
      s3labels: PT.labels.map((l, k) => ({ t: +(T.ann + k * 0.2).toFixed(3), x: darkPos(PT[l.i], T.sub3 + 0.3).x })),
      spokes: [0, 1, 2, 3, 4, 5].map(k => +(T.spokes + k * 0.05).toFixed(3)),
      dims: DIMS.map((d, k) => ({ t: +(T.labels + k * 0.09).toFixed(3), x: proj((RR + 38) * Math.cos(axA(k)), (RR + 38) * Math.sin(axA(k)), T.poly + 0.5)[0] })),
      word: WORDMARK.map((g, i) => ({ ch: g.ch, t: g.color === 'pine' ? T.word + i * 0.04 : g.ch === 'idot' ? T.dot + 0.16 + 0.26 : T.dot + (g.ch === 'a' ? 0.02 : 0.07) })),
      lineX: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0].map(d => ({ t: T.sweep4 + d, x: lineX(T.sweep4 + d) })),
    };
  }

  return { W, H, FPS, DUR, init, drawFrame: t => { drawFrame(t); post(Math.floor(t * FPS)); }, renderFrame, samplesAt, cues };
}

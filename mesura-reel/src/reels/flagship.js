/* Mesura · Flagship reel
   29.6 seconds long, because 29.6% is the headline figure. 15 bars at ~121.6 BPM.
   All choreography is authored in beats (b); t = b × B seconds.

   b0   Hook          Malta ranks first in the EU.
   b4   Stat          29.6% of workers in Malta use generative AI at work.
   b10  Compare       First in the EU. Nearly double.
   b16  Turn          But only 21.6% of organisations formally measure it.
   b20  Shadow        The rest is shadow AI. Invisible to leadership.
   b24  Blind         Your dashboards can't see it.
   b28  Until         Until you measure it.
   b32  Sunrise       mesura — Measure your organisation's AI readiness.
   b36  Survey        One survey.
   b40  Report        A benchmarked report.
   b44  Read          A clear read on where you stand.
   b48  Question      Does your organisation measure it?
   b52  CTA           Start with a Diagnostic. [Get your Diagnostic] mesura.ai
   b59  Loop          whip back into the hook */
(function (G) {
  'use strict';
  const { M, R, K } = G;
  const { E, P, D } = M;
  const { tw, clamp, lerp, TAU } = M;

  const DUR = 29.6, BEATS = 60, B = DUR / BEATS;
  const X0 = 96, XR = 984;
  const cues = [];
  const cue = (b, type, o = {}) => cues.push(Object.assign({ b, type }, o));
  const hits = [];
  const hit = (b, amp, dur = 0.7, freq = 14) => hits.push([b, amp, dur, freq]);
  const S = [];
  const scene = (from, to, fn) => S.push({ from, to, fn });
  const shakeAt = (b) => M.shake(b, hits);

  // =====================================================================
  // HOOK · b0–4
  // =====================================================================
  function hook(ctx, b) {
    K.bg(ctx, P.paper);
    const push = tw(b, 3.42, 0.58, E.inExpo);
    const whipIn = 1 - tw(b, 0, 0.62, E.outExpo);
    const settle = tw(b, 0, 2.2, E.glide);
    const [kx, ky] = shakeAt(b);
    ctx.save();
    ctx.translate(kx, whipIn * 300 - push * 560 + ky);
    K.camera(ctx, { s: lerp(1.14, 1, settle) + b * 0.006, px: X0, py: 900 });
    const Bh = M.block(ctx, { lines: ['Malta ranks', '*first* in', 'the EU.'], size: 184, lh: 0.97, x: X0 - 6, y: 470, anchor: 'top' });
    const box = M.wordBox(Bh, (w) => w.accent);
    K.highlight(ctx, box, tw(b, 0.95, 0.9, E.outExpo), P.ochre, { top: 0.98, h: 1.2, padX: 14, r: 10 });
    M.drawBlock(ctx, Bh, { t: b, color: P.ink, in: { at: 0, dur: 1.0, stagger: 0.075, by: 'word', style: 'rise', rot: 6 } });

    // rank row: 27 member states, Malta first
    const rowY = 1266;
    ctx.fillStyle = P.ink;
    ctx.fillRect(X0, rowY, (XR - X0) * tw(b, 0.8, 1.2, E.outExpo), 3);
    K.rankRow(ctx, X0 + 7, rowY, XR - X0 - 14, 27, { t: b, at: 0.9, stagger: 0.028, h: 62, heroH: 190, lw: 7, heroW: 14, color: M.rgba(P.ink, 0.26), hero: P.ochre });
    const la = tw(b, 1.9, 0.8, E.outCubic);
    M.label(ctx, 'Rank 01 / 27', X0, rowY + 64, { fam: 'mono', weight: 500, size: 28, color: P.ink, ls: 0.04, alpha: la });
    M.label(ctx, 'Eurostat · 2025', XR, rowY + 64, { fam: 'mono', weight: 400, size: 28, color: P.inkMuted, ls: 0.04, align: 'right', alpha: la });
    ctx.restore();

    if (push > 0) {
      ctx.fillStyle = P.pine;
      ctx.fillRect(0, M.H * (1 - push) - 2, M.W, M.H * push + 4);
    }
  }
  cue(0, 'impact', { gain: 0.75 });
  hit(0.3, 5, 0.6, 13);
  cue(0, 'whoosh', { dur: 0.45, dir: 'up', gain: 0.6 });
  cue(0.95, 'swipe', { dur: 0.45 });
  for (let i = 0; i < 27; i++) cue(0.9 + (26 - i) * 0.028, 'tick', { pitch: 0.7 + (26 - i) * 0.018, gain: 0.16 });
  cue(1.0 + 26 * 0.028 + 0.1, 'pop', { gain: 0.7, pitch: 1.2 });
  cue(3.3, 'riser', { dur: 0.7 * B, gain: 0.7 });

  // =====================================================================
  // STAT → COMPARE · b4–16
  // =====================================================================
  const BASE = 1400, PCT = 27.33;
  const MT = { x: 600, w: 300, v: 29.6 };
  const EU = { x: 180, w: 300, v: 15.1 };
  const topOf = (v) => BASE - v * PCT;

  function statCompare(ctx, b) {
    const cnt = M.prog(b, 4.1, 6.0);
    const val = 29.6 * E.outQuart(cnt);
    const land = tw(b, 6.0, 0.6, E.linear);
    const fold = tw(b, 10.0, 0.9, E.snap);
    const fold2 = tw(b, 10.2, 1.0, E.snap);
    const statOut = tw(b, 10.0, 0.45, E.outCubic);
    const exit = tw(b, 15.35, 0.65, E.inExpo);

    K.bg(ctx, P.paper);
    if (fold > 0) compareChart(ctx, b, exit);

    const mTop = topOf(MT.v);
    const barH = (BASE - mTop) * (1 - exit);
    const rx0 = lerp(0, MT.x, fold), rx1 = lerp(M.W, MT.x + MT.w, fold);
    const ry0 = lerp(0, BASE - barH, fold2), ry1 = lerp(M.H, BASE, fold2);
    const rad = 10 * fold2;
    const field = () => { ctx.beginPath(); ctx.roundRect(rx0, ry0, rx1 - rx0, ry1 - ry0, [rad, rad, 0, 0]); };
    ctx.save();
    field();
    ctx.fillStyle = P.pine;
    ctx.fill();
    ctx.clip();
    if (statOut < 1) {
      // depth: a soft lift in the centre of the pine field
      const lg = ctx.createRadialGradient(540, 930, 40, 540, 930, 1000);
      lg.addColorStop(0, M.rgba('#2A6258', 0.9 * (1 - statOut)));
      lg.addColorStop(1, M.rgba(P.pine, 0));
      ctx.fillStyle = lg;
      ctx.fillRect(0, 0, M.W, M.H);
      ctx.save();
      const push = 1 + 0.03 * tw(b, 6.0, 4.0, E.outCubic);
      const [sx, sy] = shakeAt(b);
      K.camera(ctx, { s: push * (1 - statOut * 0.08), x: sx, y: sy, py: 900 });
      ctx.globalAlpha = 1 - statOut;
      statRing(ctx, b, val);
      ctx.restore();
    }
    ctx.restore();

    // the number travels from the ring centre to the top of Malta's bar (two-tone knockout)
    const mv = tw(b, 10.05, 1.15, E.snap);
    const [sx, sy] = shakeAt(b);
    const nx = lerp(540 + sx, MT.x + MT.w / 2, mv);
    const ny = lerp(1012 + sy, mTop - 40, mv) + (BASE - mTop - barH);
    const ns = lerp(250, 104, mv) * (1 + 0.03 * tw(b, 6.0, 4.0, E.outCubic) * (1 - mv));
    const numOpts = (color, suf) => ({ x: nx, y: ny, size: ns, color, align: 'center', decimals: 1, digits: 2, suffix: '%', suffixColor: suf, suffixP: land, hideLeadingZeros: true });
    if (exit < 1 && b >= 4) {
      ctx.save();
      ctx.globalAlpha = 1 - exit;
      if (mv > 0) M.odometer(ctx, val, numOpts(P.pine, M.mixHex(P.ochre, P.pine, mv)));
      field();
      ctx.clip();
      M.odometer(ctx, val, numOpts(P.onPine, M.mixHex(P.ochre, P.onPine, mv)));
      ctx.restore();
    }
  }

  function statRing(ctx, b, val) {
    const cx = 540, cy = 930, r = 400;
    const reveal = tw(b, 4.0, 1.1, E.outCubic);
    // slow-turning outer bezel
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(b * 0.06);
    ctx.strokeStyle = M.rgba(P.onPine, 0.14 * reveal);
    ctx.lineWidth = 2;
    ctx.setLineDash([2, 16]);
    ctx.beginPath();
    ctx.arc(0, 0, r + 92, 0, TAU);
    ctx.stroke();
    ctx.restore();
    M.tickRing(ctx, cx, cy, r, {
      n: 100, value: val / 100, reveal,
      active: P.ochre, idle: M.rgba(P.onPine, 0.2), major: M.rgba(P.onPine, 0.45),
      len: 24, lenMajor: 42, lenActive: 66, lw: 3, lwMajor: 4, lwActive: 6,
    });
    ctx.save();
    ctx.globalAlpha *= reveal;
    [['0', -90], ['25', 0], ['50', 90], ['75', 180]].forEach(([s, a]) => {
      const ang = M.deg(a);
      M.label(ctx, s, cx + Math.cos(ang) * (r + 48), cy + Math.sin(ang) * (r + 48) + 9, { fam: 'mono', weight: 400, size: 24, color: M.rgba(P.onPine, 0.5), ls: 0, align: 'center', upper: false });
    });
    ctx.restore();
    const ang = -Math.PI / 2 + (val / 100) * TAU;
    if (val > 0.05) {
      ctx.fillStyle = P.ochre;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(ang) * (r + 20), cy + Math.sin(ang) * (r + 20), 9, 0, TAU);
      ctx.fill();
    }
    const pl = tw(b, 6.0, 1.2, E.outCubic);
    if (pl > 0 && pl < 1) {
      ctx.save();
      ctx.strokeStyle = M.rgba(P.ochre, 0.9 * (1 - pl));
      ctx.lineWidth = lerp(10, 1, pl);
      ctx.beginPath();
      ctx.arc(cx, cy, r + 20 + pl * 170, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }
    const la = tw(b, 4.3, 1.0, E.outExpo);
    ctx.save();
    ctx.globalAlpha *= la;
    ctx.translate(0, (1 - la) * 30);
    M.label(ctx, 'Generative AI at work', 540, 318, { size: 28, color: P.ochre, ls: 0.16, align: 'center' });
    M.label(ctx, 'Eurostat · 2025', 540, 368, { fam: 'mono', weight: 400, size: 26, color: M.rgba(P.onPine, 0.62), ls: 0.04, align: 'center', upper: false });
    ctx.restore();
    M.text(ctx, { lines: ['of workers in Malta use', 'generative AI at work.'], fam: 'sans', weight: 500, size: 54, lh: 1.28, x: 540, y: 1388, align: 'center', anchor: 'top' },
      { t: b, color: P.onPine, in: { at: 6.05, dur: 0.9, stagger: 0.045, by: 'word', style: 'rise', rot: 4 } });
  }

  function compareChart(ctx, b, exit) {
    const g = tw(b, 10.6, 1.4, E.outExpo);
    ctx.save();
    ctx.setLineDash([3, 11]);
    ctx.lineWidth = 2;
    [10, 20, 30].forEach((v, i) => {
      const y = topOf(v);
      const p = clamp(g * 1.2 - i * 0.12);
      if (p <= 0) return;
      ctx.strokeStyle = M.rgba(P.inkMuted, 0.45 * (1 - exit));
      ctx.beginPath();
      ctx.moveTo(172, y);
      ctx.lineTo(172 + (930 - 172) * p, y);
      ctx.stroke();
      M.label(ctx, v + (v === 30 ? '%' : ''), X0, y + 9, { fam: 'mono', weight: 400, size: 27, color: P.inkMuted, ls: 0, upper: false, alpha: p * (1 - exit) });
    });
    ctx.restore();
    ctx.fillStyle = P.ink;
    ctx.fillRect(X0, BASE, (XR - X0) * tw(b, 10.5, 1.0, E.outExpo) * (1 - exit), 3);

    const eg = tw(b, 11.0, 1.3, E.outExpo) * (1 - exit);
    const euTop = BASE - (BASE - topOf(EU.v)) * eg;
    ctx.fillStyle = P.inkFaint;
    ctx.beginPath();
    ctx.roundRect(EU.x, euTop, EU.w, BASE - euTop, [10, 10, 0, 0]);
    ctx.fill();
    if (eg > 0.01) {
      M.odometer(ctx, EU.v * E.outQuart(M.prog(b, 11.0, 12.1)), { x: EU.x + EU.w / 2, y: euTop - 40, size: 104, color: P.inkFaint, align: 'center', decimals: 1, digits: 2, suffix: '%', suffixP: tw(b, 11.7, 0.6, E.linear) });
    }
    const cl = tw(b, 11.2, 0.9, E.outExpo) * (1 - exit);
    M.label(ctx, 'EU average', EU.x + EU.w / 2, BASE + 60, { size: 30, color: P.inkMuted, align: 'center', alpha: cl, ls: 0.14 });
    M.label(ctx, 'Malta', MT.x + MT.w / 2, BASE + 60, { size: 30, color: P.ink, align: 'center', alpha: cl, ls: 0.14 });

    M.text(ctx, { lines: ['First in the EU.'], size: 132, x: X0 - 4, y: 262, anchor: 'top' },
      { t: b, color: P.ink, in: { at: 10.9, dur: 1.0, stagger: 0.07, style: 'rise' }, out: { at: 15.3, dur: 0.55, stagger: 0.03, style: 'rise' } });
    const st = tw(b, 11.5, 1.0, E.outExpo) * (1 - tw(b, 15.3, 0.4, E.outCubic));
    M.label(ctx, 'Workers using generative AI at work', X0, 436, { fam: 'mono', weight: 400, size: 26, color: P.inkMuted, ls: 0.02, upper: false, alpha: st });

    const a1 = tw(b, 12.3, 0.9, E.outExpo) * (1 - exit);
    const euY = topOf(EU.v), mY = topOf(MT.v);
    if (a1 > 0) {
      ctx.save();
      ctx.strokeStyle = P.ochre;
      ctx.lineWidth = 3;
      ctx.setLineDash([10, 9]);
      ctx.beginPath();
      ctx.moveTo(EU.x + EU.w, euY);
      ctx.lineTo(EU.x + EU.w + (MT.x + MT.w - EU.x - EU.w) * a1, euY);
      ctx.stroke();
      ctx.restore();
    }
    M.dimLine(ctx, 540, euY - 6, 540, mY + 6, { p: tw(b, 12.7, 1.0, E.linear) * (1 - exit), color: P.ochre, lw: 4, tick: 30, arrow: 18 });
    M.text(ctx, { lines: ['Nearly', 'double.'], size: 80, lh: 0.98, x: 508, y: 690, align: 'right', anchor: 'middle' },
      { t: b, color: P.ochre, in: { at: 13.1, dur: 0.9, stagger: 0.08, style: 'rise' }, out: { at: 15.3, dur: 0.5, stagger: 0.03, style: 'rise' } });
    const ra = tw(b, 13.7, 0.8, E.outExpo) * (1 - exit);
    M.label(ctx, '29.6 ÷ 15.1 = 1.96×', 508, 804, { fam: 'mono', weight: 400, size: 27, color: P.inkMuted, ls: 0, upper: false, align: 'right', alpha: ra });
  }

  cue(4, 'impact', { gain: 1 });
  cue(4.1, 'counter', { dur: 1.9 * B, to: 29.6 });
  cue(6.0, 'land', { gain: 1 });
  hit(6.0, 8, 0.9, 12);
  cue(6.05, 'swipe', { dur: 0.4, gain: 0.5 });
  cue(9.7, 'whoosh', { dur: 0.6, dir: 'down', gain: 0.6 });
  cue(10.0, 'morph', { dur: 1.2 * B });
  cue(11.0, 'rise', { dur: 1.2 * B });
  cue(12.3, 'swipe', { dur: 0.35, gain: 0.5 });
  cue(12.7, 'measure', { dur: 0.5 });
  cue(13.1, 'pop', { gain: 0.6 });
  cue(15.3, 'suck', { dur: 0.7 * B });

  // =====================================================================
  // TURN + SHADOW · b16–24
  // =====================================================================
  const WF = { x: X0, y: 772, cell: 60, gap: 9 };

  function waffleWorld(ctx, b, T, dark) {
    K.bg(ctx, T.bg);
    const oldOut = { at: 20.95, dur: 0.5, stagger: 0.03, style: 'rise' };
    M.text(ctx, { lines: ['But only'], size: 88, x: X0 - 2, y: 250, anchor: 'top' }, { t: b, color: T.muted, in: { at: 16.0, dur: 0.8, stagger: 0.06, style: 'rise' }, out: oldOut });
    // big figure (odometer) with masked entrance/exit
    const nIn = tw(b, 16.15, 0.8, E.outExpo), nOut = tw(b, 20.95, 0.5, E.inExpo);
    if (nIn > 0 && nOut < 1) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 350, M.W, 250);
      ctx.clip();
      ctx.translate(0, (1 - nIn) * 250 - nOut * 250);
      M.odometer(ctx, 21.6 * E.outQuart(M.prog(b, 16.25, 17.35)), { x: X0 - 10, y: 568, size: 300, color: T.ochre, align: 'left', decimals: 1, digits: 2, suffix: '%', suffixP: tw(b, 17.25, 0.55, E.linear) });
      ctx.restore();
    }
    M.text(ctx, { lines: ['of organisations formally', 'measure it.'], fam: 'sans', weight: 500, size: 52, lh: 1.24, x: X0, y: 618, anchor: 'top' },
      { t: b, color: T.body, in: { at: 16.9, dur: 0.8, stagger: 0.04, style: 'rise' }, out: oldOut });
    K.waffle(ctx, {
      x: WF.x, y: WF.y, cell: WF.cell, gap: WF.gap, T,
      appear: (i) => tw(b, 16.35 + ((i % 10) + Math.floor(i / 10)) * 0.04, 0.6, E.linear),
      fill: (i) => (i < 22 ? tw(b, 17.45 + i * 0.058, 0.45, E.linear) : 0),
      partialIdx: 21, partialAmt: 0.6,
      activity: dark ? tw(b, 21.0, 1.2, E.outCubic) : 0, t: b * B, glow: dark ? tw(b, 20.6, 1.2, E.outCubic) : 0,
    });
    if (dark) {
      const newOut = { at: 24.7, dur: 0.5, stagger: 0.03, style: 'rise' };
      M.text(ctx, { lines: ['The rest is'], size: 88, x: X0 - 2, y: 250, anchor: 'top' }, { t: b, color: T.muted, in: { at: 21.15, dur: 0.8, stagger: 0.06, style: 'rise' }, out: newOut });
      M.text(ctx, { lines: ['shadow AI.'], fam: 'serifI', size: 196, x: X0 - 8, y: 568, anchor: 'baseline', ls: -0.015 }, { t: b, color: T.ink, in: { at: 21.3, dur: 1.0, stagger: 0.09, style: 'rise' }, out: newOut });
      M.text(ctx, { lines: ['Invisible to leadership.'], fam: 'sans', weight: 500, size: 52, x: X0, y: 618, anchor: 'top' }, { t: b, color: T.body, in: { at: 21.9, dur: 0.8, stagger: 0.05, style: 'rise' }, out: newOut });
    }
  }

  // The shadow edge: a straight terminator that sweeps right → left and tilts like a sundial's.
  const shadowEdge = (p) => {
    const ang = M.deg(lerp(-12, 18, p));
    return { nx: Math.cos(ang), ny: Math.sin(ang), ex: lerp(M.W + 420, -420, p), ey: M.H * 0.52 };
  };
  function shadowMask(x, p) {
    const { nx, ny, ex, ey } = shadowEdge(p);
    const soft = 70;
    const g = x.createLinearGradient(ex - nx * soft, ey - ny * soft, ex + nx * soft, ey + ny * soft);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,1)');
    x.fillStyle = g;
    x.fillRect(0, 0, M.W, M.H);
  }
  // warm rim light riding the terminator
  function shadowRim(ctx, p) {
    if (p <= 0 || p >= 1) return;
    const { nx, ny, ex, ey } = shadowEdge(p);
    const tx = -ny, ty = nx, L = 2600, wd = 150;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createLinearGradient(ex - nx * wd, ey - ny * wd, ex + nx * wd, ey + ny * wd);
    g.addColorStop(0, M.rgba(P.ochre, 0));
    g.addColorStop(0.46, M.rgba(P.ochre, 0.1));
    g.addColorStop(0.5, M.rgba('#FFE2A8', 0.55));
    g.addColorStop(0.54, M.rgba(P.ochre, 0.1));
    g.addColorStop(1, M.rgba(P.ochre, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(ex + tx * L - nx * wd, ey + ty * L - ny * wd);
    ctx.lineTo(ex + tx * L + nx * wd, ey + ty * L + ny * wd);
    ctx.lineTo(ex - tx * L + nx * wd, ey - ty * L + ny * wd);
    ctx.lineTo(ex - tx * L - nx * wd, ey - ty * L - ny * wd);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function shadowAI(ctx, b) {
    const sw = tw(b, 20.0, 1.15, E.inOutQuad);
    if (sw < 1) waffleWorld(ctx, b, K.LT, false);
    if (sw > 0) {
      if (sw >= 1) waffleWorld(ctx, b, K.DK, true);
      else M.layer(ctx, (x) => waffleWorld(x, b, K.DK, true), { mask: (x) => shadowMask(x, sw) });
      shadowRim(ctx, sw);
      M.vignette(ctx, 0.35 * sw, D.paperSunken, 0.5);
    }
  }
  cue(16.0, 'stop', { gain: 1 });
  cue(16.25, 'counter', { dur: 1.1 * B, to: 21.6, gain: 0.7 });
  cue(17.25, 'pop', { gain: 0.6, pitch: 0.9 });
  for (let i = 0; i < 22; i++) cue(17.45 + i * 0.058, 'tick', { pitch: 1.0 + i * 0.03, gain: 0.3 });
  cue(19.6, 'riser', { dur: 0.4 * B, gain: 0.4 });
  cue(20.0, 'sweep', { dur: 1.2 * B, gain: 1 });
  cue(20.0, 'boom', { gain: 1 });
  cue(21.3, 'swipe', { dur: 0.4, gain: 0.4 });

  // =====================================================================
  // BLIND DASHBOARD · b24–28   +   UNTIL · b28–32
  // =====================================================================
  const GLINT = { x: 540, y: 1330 };

  function activityDot(i, b) {
    const t = b * B;
    const ax = 540 + (M.rand(i, 61) - 0.5) * 1300, ay = 1000 + (M.rand(i, 62) - 0.5) * 1700;
    const wx = 120 + M.rand(i, 63) * 220, wy = 90 + M.rand(i, 64) * 200;
    const fx = 0.12 + M.rand(i, 65) * 0.35, fy = 0.1 + M.rand(i, 66) * 0.3;
    let x = ax + Math.sin(t * fx * TAU + i) * wx, y = ay + Math.cos(t * fy * TAU + i * 1.7) * wy;
    // drawn to the light
    const pull = tw(b, 29.2 + M.rand(i, 67) * 1.2, 1.8, E.inCubic);
    const gx = GLINT.x + (M.rand(i, 68) - 0.5) * 40, gy = GLINT.y + (M.rand(i, 69) - 0.5) * 20;
    x = lerp(x, gx, pull);
    y = lerp(y, gy, pull);
    return [x, y, pull];
  }

  function hiddenActivity(ctx, b, alpha) {
    if (alpha <= 0) return;
    const n = 150;
    for (let i = 0; i < n; i++) {
      const [x, y, pull] = activityDot(i, b);
      const tw_ = 0.5 + 0.5 * Math.sin(b * (1.3 + M.rand(i, 70) * 2) + i);
      const warm = M.rand(i, 71) < 0.18;
      const r = (2 + M.rand(i, 72) * 3.2) * (1 - pull * 0.6);
      ctx.fillStyle = M.rgba(warm ? D.ochre : D.mint, alpha * (0.2 + 0.55 * tw_) * (1 - pull * 0.3));
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TAU);
      ctx.fill();
    }
  }

  function blind(ctx, b) {
    const pan = tw(b, 24.8, 1.1, E.snap);
    K.bg(ctx, D.paper);
    if (pan < 1) {
      ctx.save();
      ctx.translate(0, -pan * M.H);
      waffleWorld(ctx, b, K.DK, true);
      ctx.restore();
    }
    const dim = tw(b, 28.0, 1.4, E.outCubic);
    ctx.save();
    ctx.translate(0, (1 - pan) * M.H);
    hiddenActivity(ctx, b, tw(b, 25.0, 1.0, E.outCubic));
    ctx.save();
    K.camera(ctx, { s: 1 - dim * 0.06, py: 1020 });
    K.dashboard(ctx, X0, 640, XR - X0, 760, {
      T: K.DK, t: b * B,
      tileP: (i) => tw(b, 25.25 + i * 0.12, 0.8, E.linear),
      sparkP: (i) => tw(b, 25.55 + i * 0.1, 1.2, E.outCubic),
      badgeP: tw(b, 25.8, 0.6, E.linear),
      scan: M.prog(b, 25.95, 27.55),
      blind: tw(b, 26.6, 0.25, E.linear) * (1 - tw(b, 27.2, 0.6, E.linear)),
      alpha: 1 - dim * 0.88,
    });
    ctx.restore();
    M.text(ctx, { lines: ['Your dashboards', "can't see it."], size: 122, lh: 1.0, x: X0 - 4, y: 262, anchor: 'top' },
      { t: b, color: D.ink, in: { at: 25.15, dur: 0.9, stagger: 0.07, style: 'rise' }, out: { at: 27.95, dur: 0.5, stagger: 0.03, style: 'rise' } });
    ctx.restore();

    M.vignette(ctx, 0.35, D.paperSunken, 0.5);

    // Until you measure it. (the ochre marker knocks "measure" out to dark type)
    const Bu = M.block(ctx, { lines: ['Until you', '*measure* it.'], size: 170, lh: 0.98, x: X0 - 6, y: 820, anchor: 'middle' });
    K.markBlock(ctx, Bu, {
      t: b, color: D.ink, in: { at: 28.3, dur: 1.0, stagger: 0.09, style: 'rise' }, out: { at: 31.55, dur: 0.45, stagger: 0.03, style: 'rise' },
      hl: { p: tw(b, 29.15, 0.85, E.outExpo) * (1 - tw(b, 31.35, 0.35, E.inExpo)), color: D.ochre, text: D.paperSunken, top: 0.98, h: 1.2, padX: 14, r: 10 },
    });

    // the glint on the horizon
    const gp = tw(b, 29.4, 2.6, E.inQuad);
    if (gp > 0) {
      const s = lerp(4, 70, gp);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      M.glow(ctx, GLINT.x, GLINT.y, s * 5, D.ochre, 0.55 * gp);
      const fl = ctx.createLinearGradient(GLINT.x - 520 * gp, 0, GLINT.x + 520 * gp, 0);
      fl.addColorStop(0, M.rgba(D.ochre, 0));
      fl.addColorStop(0.5, M.rgba('#FFE7B8', 0.75 * gp));
      fl.addColorStop(1, M.rgba(D.ochre, 0));
      ctx.fillStyle = fl;
      ctx.fillRect(GLINT.x - 520 * gp, GLINT.y - 2.5 * (0.5 + gp), 1040 * gp, 5 * (0.5 + gp));
      ctx.restore();
      M.mark(ctx, GLINT.x, GLINT.y, s * 1.6, { color: '#FFE2A8', rot: b * 0.3, alpha: clamp(gp * 3) });
    }
    hiddenActivityTop(ctx, b);
  }
  // particles that have been drawn into the light render above the text
  function hiddenActivityTop(ctx, b) {
    if (b < 29) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 150; i++) {
      const [x, y, pull] = activityDot(i, b);
      if (pull < 0.05) continue;
      ctx.fillStyle = M.rgba('#FFD890', 0.5 * pull * (1 - pull * 0.5));
      ctx.beginPath();
      ctx.arc(x, y, 2.4, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }
  cue(24.75, 'whoosh', { dur: 0.7, dir: 'up', gain: 0.7 });
  cue(25.15, 'swipe', { dur: 0.4, gain: 0.4 });
  for (let i = 0; i < 5; i++) cue(25.25 + i * 0.12, 'tick', { pitch: 0.9 + i * 0.06, gain: 0.25 });
  cue(25.95, 'scan', { dur: 1.6 * B });
  cue(26.6, 'glitch', { dur: 0.5 * B });
  cue(27.95, 'down', { dur: 1.2 * B });
  cue(28.3, 'swipe', { dur: 0.45, gain: 0.35 });
  cue(29.4, 'glint', { dur: 2.6 * B });
  cue(30.0, 'riser', { dur: 2.0 * B, gain: 1 });

  // =====================================================================
  // SUNRISE · b32–36
  // =====================================================================
  const LOCK = { size: 150, y: 900 };

  function lockGeom(ctx) {
    const L = M.layoutLine(ctx, 'mesura', 'serif', 600, LOCK.size, -0.01);
    const markSize = LOCK.size, gap = LOCK.size * 0.36;
    const total = markSize + gap + L.width;
    const x0 = 540 - total / 2;
    const mt = M.fontMetrics(ctx, 'serif', 600, LOCK.size);
    return { markX: x0 + markSize / 2, markY: LOCK.y - mt.xh / 2, markSize, x0 };
  }

  function sunrise(ctx, b) {
    const rise = tw(b, 32.0, 1.5, E.glide);
    const flood = tw(b, 32.1, 1.5, E.inOutCubic);
    const toLock = tw(b, 33.25, 1.1, E.snap);
    const Lg = lockGeom(ctx);
    const sunX = lerp(GLINT.x, 540, rise), sunY0 = lerp(GLINT.y, 860, rise);
    const sunS0 = lerp(110, 430, rise);
    const sx = lerp(sunX, Lg.markX, toLock), sy = lerp(sunY0, Lg.markY, toLock), ss = lerp(sunS0, Lg.markSize, toLock);
    const rot = lerp(-1.2, 0, E.outCubic(M.prog(b, 32.0, 34.2))) + (1 - toLock) * 0;
    const [kx, ky] = shakeAt(b);

    // dark world
    K.bg(ctx, D.paperSunken);
    ctx.save();
    ctx.translate(kx, ky);
    K.sun(ctx, sx, sy, ss, { rot, rays: 1, glow: 1, rayRot: b * 0.05, color: D.ochre, blend: 'lighter', rayLen: 2600 });
    K.motes(ctx, b * B, { n: 110, color: '#FFD890', alpha: 0.9 });
    ctx.restore();

    // paper light floods out from the sun
    const Rr = lerp(0, 2500, flood);
    if (flood > 0) {
      const draw = (x) => lightWorld(x, b, sx + kx, sy + ky, ss, rot);
      if (flood >= 1) draw(ctx);
      else M.layer(ctx, draw, {
        mask: (x) => {
          const g = x.createRadialGradient(sx, sy, Math.max(0, Rr - 260), sx, sy, Rr);
          g.addColorStop(0, 'rgba(0,0,0,1)');
          g.addColorStop(1, 'rgba(0,0,0,0)');
          x.fillStyle = g;
          x.fillRect(0, 0, M.W, M.H);
        },
      });
    }
  }

  function lightWorld(ctx, b, sx, sy, ss, rot) {
    K.bg(ctx, P.paper);
    const fade = 1 - tw(b, 34.0, 1.8, E.inOutCubic);
    // a quiet sunburst on paper
    K.sun(ctx, sx, sy, ss, { rot, rays: 0.55 * fade, glow: 0.4 * fade, rayRot: b * 0.05, color: P.ochre, blend: 'source-over', rayLen: 2600, core: false, rayWidth: 3.2 });
    ctx.save();
    ctx.translate(0, -tw(b, 35.35, 0.65, E.inExpo) * 0);
    const exit = tw(b, 36.4, 0.6, E.snap);
    // lockup → header position
    const hx = lerp(0, 1, exit);
    const Lg = lockGeom(ctx);
    ctx.save();
    const hs = lerp(1, 40 / LOCK.size, hx);
    const hdx = lerp(Lg.x0, X0, hx), hdy = lerp(LOCK.y, 262, hx);
    ctx.translate(hdx, hdy);
    ctx.scale(hs, hs);
    ctx.translate(-Lg.x0, -LOCK.y);
    M.mark(ctx, sx, sy, ss, { color: P.ochre, rot });
    const wr = tw(b, 33.9, 1.0, E.outExpo);
    if (wr > 0) {
      ctx.save();
      ctx.beginPath();
      const tx = Lg.x0 + Lg.markSize + LOCK.size * 0.36;
      ctx.rect(tx - 10, LOCK.y - LOCK.size, 700 * wr, LOCK.size * 1.6);
      ctx.clip();
      ctx.font = M.font('serif', 600, LOCK.size);
      ctx.letterSpacing = -0.01 * LOCK.size + 'px';
      ctx.fillStyle = P.pine;
      ctx.fillText('mesura', tx - (1 - wr) * 90, LOCK.y);
      ctx.restore();
    }
    ctx.restore();
    M.text(ctx, { lines: ["Measure your organisation's", 'AI readiness.'], size: 66, lh: 1.12, x: 540, y: 1040, align: 'center', anchor: 'top' },
      { t: b, color: P.inkBody, in: { at: 34.05, dur: 0.9, stagger: 0.05, style: 'rise' }, out: { at: 36.35, dur: 0.45, stagger: 0.02, style: 'rise' } });
    ctx.restore();
  }
  cue(32.0, 'sunrise', { gain: 1 });
  hit(32.0, 10, 1.2, 10);
  cue(33.25, 'morph', { dur: 1.1 * B, gain: 0.6 });
  cue(33.9, 'chime', { gain: 1 });
  cue(34.05, 'swipe', { dur: 0.4, gain: 0.35 });
  cue(36.4, 'whoosh', { dur: 0.5, dir: 'up', gain: 0.45 });

  // =====================================================================
  // PRODUCT · b36–48 · survey → report → where you stand
  // =====================================================================
  const CARD = { x: X0, y: 560, w: XR - X0, h: 880 };
  const Q1 = { q: ['How often do you use', 'AI tools at work?'], opts: ['Every day', 'A few times a week', 'Now and then', 'Not yet'], sel: 1, qn: '04' };
  const Q2 = { q: ['Has your team had', 'AI training this year?'], opts: ['Yes, all of us', 'Some of us', 'Not yet'], sel: 1, qn: '05' };
  const Q3 = { q: ['Do you have an AI', 'use policy?'], opts: ['Yes, and it is used', 'Yes, on paper', 'No'], sel: 1, qn: '06' };
  const RULER = { x: X0, y: 1180, w: XR - X0 };
  const rulerX = (v) => RULER.x + (RULER.w * v) / 100;

  function header(ctx, b, alpha) {
    if (alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha *= alpha;
    M.lockup(ctx, X0, 262, 40, { color: P.pine, rot: (b - 37) * 0.08 });
    ctx.restore();
  }

  function optionY(q, idx) {
    // mirrors K.survey layout: question 62px lh 1.08 from y+214 (cap top), options after +72
    const capTop = CARD.y + 214;
    const lastBase = capTop + 62 * 0.66 + (q.q.length - 1) * 62 * 1.08;
    return lastBase + 72 + idx * (96 + 16) + 48;
  }

  function product(ctx, b) {
    K.bg(ctx, P.paper);
    header(ctx, b, 1 - tw(b, 51.9, 0.5, E.outCubic));

    // ---- headlines
    M.text(ctx, { lines: ['One survey.'], size: 132, x: X0 - 4, y: 330, anchor: 'top' },
      { t: b, color: P.ink, in: { at: 37.05, dur: 0.9, stagger: 0.08, style: 'rise' }, out: { at: 39.75, dur: 0.5, stagger: 0.03, style: 'rise' } });
    M.text(ctx, { lines: ['A benchmarked', 'report.'], size: 116, lh: 0.98, x: X0 - 4, y: 330, anchor: 'top' },
      { t: b, color: P.ink, in: { at: 40.1, dur: 0.9, stagger: 0.07, style: 'rise' }, out: { at: 43.75, dur: 0.5, stagger: 0.03, style: 'rise' } });
    M.text(ctx, { lines: ['A clear read on', 'where you stand.'], size: 112, lh: 1.0, x: X0 - 4, y: 330, anchor: 'top' },
      { t: b, color: P.ink, in: { at: 44.1, dur: 0.9, stagger: 0.07, style: 'rise' }, out: { at: 47.75, dur: 0.5, stagger: 0.03, style: 'rise' } });
    const Bq = M.block(ctx, { lines: ['Does your', 'organisation', '*measure* it?'], size: 124, lh: 0.98, x: X0 - 4, y: 330, anchor: 'top' });
    K.markBlock(ctx, Bq, {
      t: b, color: P.ink, in: { at: 48.1, dur: 1.0, stagger: 0.08, style: 'rise' }, out: { at: 51.85, dur: 0.5, stagger: 0.03, style: 'rise' },
      hl: { p: tw(b, 48.95, 0.85, E.outExpo) * (1 - tw(b, 51.7, 0.35, E.inExpo)), color: P.ochre, top: 0.98, h: 1.2, padX: 12, r: 10 },
    });

    // ---- survey stack (b36–40.4), cards live in 3D
    if (b < 40.6) {
      const enter = tw(b, 37.0, 1.1, E.glide);
      const leave = tw(b, 39.75, 0.8, E.snap);
      const stackY = (1 - enter) * 1100 + leave * 1300;
      const qs = [Q1, Q2, Q3];
      // card k becomes front at time fronts[k]
      const fronts = [37.0, 38.55, 39.4];
      for (let k = qs.length - 1; k >= 0; k--) {
        const q = qs[k];
        const adv = k === 0 ? 1 : tw(b, fronts[k] - 0.05, 0.6, E.snap); // moved forward
        const flyOut = k < qs.length - 1 ? tw(b, fronts[k + 1] - 0.1, 0.6, E.inCubic) : 0;
        if (flyOut >= 1) continue;
        const depth = k === 0 ? 0 : lerp(k === 1 ? 1 : 2, 0, adv) - (k === 2 ? tw(b, fronts[1] - 0.05, 0.6, E.snap) : 0);
        const dd = Math.max(0, depth);
        const s = 1 - dd * 0.05;
        const oy = dd * 30;
        const rotY = (1 - enter) * 0.75 - flyOut * 1.25 - leave * 0.35;
        const selT = k === 0 ? 37.95 : k === 1 ? fronts[1] + 0.55 : 99;
        ctx.save();
        ctx.translate(CARD.x + CARD.w / 2 - flyOut * 760, CARD.y + CARD.h / 2 + stackY + oy - flyOut * 80);
        ctx.rotate(-flyOut * 0.1);
        ctx.scale(s, s);
        M.card3d(ctx, k, CARD, (x) => {
          K.survey(x, CARD.x, CARD.y, CARD.w, CARD.h, {
            q: q.q, opts: q.opts, sel: q.sel, qn: q.qn + ' / 12',
            selP: tw(b, selT, 0.45, E.outCubic),
            press: tw(b, selT - 0.1, 0.12, E.linear) * (1 - tw(b, selT + 0.1, 0.3, E.outCubic)),
            prog: lerp(0.26 + k * 0.08, 0.34 + k * 0.08, tw(b, selT, 0.6, E.outExpo)),
            shadowA: 0.1 * (1 - dd * 0.4),
          });
          if (dd > 0.02) {
            x.fillStyle = M.rgba(P.paper, 0.35 * dd);
            M.rrect(x, CARD.x, CARD.y, CARD.w, CARD.h, 34);
            x.fill();
          }
        }, { cx: 0, cy: 0, rotY, dist: 2200 });
        ctx.restore();
      }
      // finger
      const taps = [[37.95, Q1], [fronts[1] + 0.55, Q2]];
      let fx = 820, fy = 1500, fp = 0, press = 0, rip = 0;
      taps.forEach(([tt, q], i) => {
        const a = tw(b, tt - 0.55, 0.45, E.outCubic);
        if (a > 0) {
          const ty = optionY(q, q.sel) + stackY;
          fx = lerp(fx, 640 + i * 30, a);
          fy = lerp(fy, ty, a);
        }
        press = Math.max(press, tw(b, tt - 0.1, 0.12, E.linear) * (1 - tw(b, tt + 0.1, 0.3, E.outCubic)));
        const rp = M.prog(b, tt, tt + 0.9);
        if (rp > 0 && rp < 1) rip = rp;
      });
      fp = tw(b, 37.35, 0.45, E.outCubic) * (1 - tw(b, 39.55, 0.4, E.outCubic));
      K.tap(ctx, fx, fy, { p: fp, press, ripple: rip });
    }

    // ---- report (b39.8–44.6): swings up in perspective, then scrolls inside a soft viewport
    const rIn = tw(b, 39.85, 1.1, E.snap);
    const rOut = tw(b, 43.8, 0.9, E.snap);
    if (rIn > 0 && rOut < 1) {
      const sc = tw(b, 42.2, 1.0, E.snap);
      const REP = { x: X0, y: 650, w: XR - X0, h: 1320 };
      const ry = lerp(1980, REP.y, rIn) - sc * 330 - rOut * 1600;
      const tilt = -(1 - tw(b, 39.85, 1.5, E.glide)) * 0.62 + rOut * 0.5;
      ctx.save();
      if (rOut <= 0) {
        ctx.beginPath();
        ctx.rect(0, 604, M.W, M.H);
        ctx.clip();
      }
      ctx.translate(0, ry - REP.y);
      M.card3d(ctx, 3, REP, (x) => K.report(x, REP.x, REP.y, REP.w, REP.h, {
        headP: 1,
        scoreP: M.prog(b, 40.6, 41.9),
        benchP: tw(b, 41.6, 0.8, E.outCubic),
        badgeP: tw(b, 41.9, 0.6, E.linear),
        rowP: (i) => tw(b, 41.0 + i * 0.14, 1.1, E.linear),
        emergP: tw(b, 43.0, 0.6, E.linear),
      }), { rotX: tilt, dist: 2400, alpha: 1 - rOut * 0.85 });
      ctx.restore();
      if (sc > 0 && rOut <= 0) {
        const g = ctx.createLinearGradient(0, 604, 0, 680);
        g.addColorStop(0, M.rgba(P.paper, 1));
        g.addColorStop(1, M.rgba(P.paper, 0));
        ctx.fillStyle = g;
        ctx.fillRect(0, 600, M.W, 80);
      }
    }

    // ---- where you stand (b44–52)
    const rp = tw(b, 44.2, 1.2, E.outCubic);
    const fadeR = tw(b, 52.0, 0.6, E.outCubic);
    if (rp > 0 && fadeR < 1) {
      ctx.save();
      ctx.globalAlpha = 1 - fadeR;
      const you = 72 * E.outBack(M.prog(b, 44.9, 46.1), 1.2);
      K.benchRuler(ctx, RULER.x, RULER.y, RULER.w, {
        p: rp, bench: 58, benchP: tw(b, 45.0, 0.9, E.linear),
        you: Math.max(0, you), youP: tw(b, 44.8, 1.0, E.linear),
        dimP: tw(b, 46.3, 0.9, E.linear), hideHead: b >= 51.95,
      });
      const dl = tw(b, 46.6, 0.7, E.outExpo);
      M.label(ctx, '+14', (rulerX(58) + rulerX(72)) / 2, RULER.y - 166, { fam: 'serif', weight: 500, size: 58, color: P.ochre, ls: 0, align: 'center', upper: false, alpha: dl });
      K.badgeP(ctx, 540, RULER.y + 190, 'Above benchmark', { align: 'center', size: 32, p: tw(b, 46.9, 0.6, E.linear) });
      ctx.restore();
    }
  }
  cue(37.0, 'card', { gain: 0.8 });
  cue(37.05, 'swipe', { dur: 0.4, gain: 0.35 });
  cue(37.85, 'tap', { gain: 1 });
  cue(38.5, 'card', { gain: 0.6 });
  cue(39.0, 'tap', { gain: 0.9 });
  cue(39.35, 'card', { gain: 0.5 });
  cue(39.8, 'whoosh', { dur: 0.55, dir: 'up', gain: 0.55 });
  cue(40.6, 'counter', { dur: 1.3 * B, to: 72, gain: 0.55, step: 1 });
  for (let i = 0; i < 5; i++) cue(41.0 + i * 0.14, 'tick', { pitch: 1 + i * 0.07, gain: 0.25 });
  cue(41.9, 'pop', { gain: 0.6 });
  cue(42.2, 'scroll', { dur: 1.0 * B });
  cue(43.0, 'pop', { gain: 0.5, pitch: 0.85 });
  cue(43.8, 'whoosh', { dur: 0.5, dir: 'up', gain: 0.45 });
  cue(44.2, 'measure', { dur: 1.1 });
  cue(44.9, 'slide', { dur: 1.2 * B });
  cue(46.1, 'land', { gain: 0.6 });
  cue(46.3, 'measure', { dur: 0.45 });
  cue(46.9, 'pop', { gain: 0.7 });
  cue(48.1, 'swipe', { dur: 0.45, gain: 0.45 });

  // =====================================================================
  // CTA · b52–60 (+ loop whip)
  // =====================================================================
  const BTN = { cx: 540, cy: 1060, w: 740, h: 156, size: 52 };

  function cta(ctx, b) {
    product(ctx, b); // ruler + question exiting, header fading
    const loop = tw(b, 59.25, 0.75, E.inExpo);
    ctx.save();
    ctx.translate(0, -loop * 1500);
    // lockup, with a quiet sunburst behind the mark (echo of the sunrise)
    const lk = tw(b, 52.9, 1.0, E.outExpo);
    if (lk > 0) {
      const lrot = b * 0.12 + (1 - lk) * -1.5;
      const Lw = M.layoutLine(ctx, 'mesura', 'serif', 600, 78, -0.01).width;
      const mx = 540 - (78 + 78 * 0.36 + Lw) / 2 + 39, my = 380 - M.fontMetrics(ctx, 'serif', 600, 78).xh / 2;
      K.sun(ctx, mx, my, 78, { rot: lrot, rays: 0.42 * lk, glow: 0.3 * lk, color: P.ochre, blend: 'source-over', core: false, rayLen: 1700, rayWidth: 3.6 });
      M.lockup(ctx, 540, 380, 78, { align: 'center', color: P.pine, reveal: lk, rot: lrot, markAlpha: clamp(lk * 2) });
    }
    M.text(ctx, { lines: ['Start with a', 'Diagnostic.'], size: 150, lh: 0.98, x: 540, y: 520, align: 'center', anchor: 'top' },
      { t: b, color: P.ink, in: { at: 52.55, dur: 1.0, stagger: 0.08, style: 'rise' } });
    // the "You" marker becomes the button
    const m = tw(b, 52.0, 1.15, E.snap);
    const press = tw(b, 54.3, 0.1, E.linear) * (1 - tw(b, 54.45, 0.35, E.outCubic));
    K.button(ctx, {
      cx: BTN.cx, cy: BTN.cy, w: BTN.w, h: BTN.h, size: BTN.size, text: 'Get your Diagnostic',
      m, from: { x: rulerX(72), y: RULER.y - 300, d: 52 }, press,
      textP: tw(b, 52.85, 0.8, E.linear), ripple: M.prog(b, 54.35, 55.3), rx: 120, ry: 10,
    });
    const tapP = tw(b, 53.7, 0.5, E.outCubic) * (1 - tw(b, 55.2, 0.5, E.outCubic));
    K.tap(ctx, lerp(900, BTN.cx + 120, tw(b, 53.7, 0.6, E.outCubic)), lerp(1400, BTN.cy + 10, tw(b, 53.7, 0.6, E.outCubic)), { p: tapP, press, ripple: M.prog(b, 54.35, 55.2), rippleColor: P.onPine });
    // url
    const ty = tw(b, 54.7, 0.9, E.linear);
    M.typewrite(ctx, 'mesura.ai', 540, 1262, ty, { fam: 'mono', weight: 500, size: 50, color: P.ink, ls: 0.02, t: b * B, align: 'center', cursor: b < 57.5 });
    M.label(ctx, 'Link in bio', 540, 1330, { weight: 500, size: 30, color: P.inkMuted, ls: 0.02, align: 'center', upper: false, alpha: tw(b, 55.6, 0.8, E.outCubic) });
    ctx.restore();
  }
  cue(51.9, 'morph', { dur: 1.15 * B, gain: 0.8 });
  cue(52.55, 'swipe', { dur: 0.45, gain: 0.4 });
  cue(52.9, 'chime', { gain: 0.7, pitch: 1.5 });
  cue(54.3, 'tap', { gain: 1 });
  cue(54.35, 'confirm', { gain: 0.9 });
  cue(54.7, 'type', { n: 9, dur: 0.9 * B });
  cue(59.1, 'riser', { dur: 0.9 * B, gain: 0.8 });
  cue(59.4, 'whoosh', { dur: 0.6, dir: 'up', gain: 0.7 });

  // ---------------------------------------------------------------- table
  scene(0, 4, hook);
  scene(4, 16, statCompare);
  scene(16, 24, shadowAI);
  scene(24, 32, blind);
  scene(32, 37, sunrise);
  scene(37, 52, product);
  scene(52, 60, cta);

  function draw(ctx, t) {
    const b = t / B;
    for (const s of S) if (b >= s.from && b < s.to) { s.fn(ctx, b); break; }
  }

  const BLUR = [
    [0, 0.7, 12], [3.3, 4.15, 16], [4.1, 6.1, 12], [9.95, 11.4, 12], [15.3, 16.05, 14], [16.2, 17.4, 10],
    [19.9, 21.3, 8], [24.7, 26.0, 14], [31.8, 34.6, 8], [36.3, 38.2, 12], [38.4, 39.9, 12], [39.7, 41.0, 12],
    [42.1, 43.3, 10], [43.6, 45.0, 12], [51.7, 53.2, 12], [59.0, 60, 16],
  ];
  function blur(t) {
    const b = t / B;
    let n = 6;
    for (const [a, z, k] of BLUR) if (b >= a && b < z) n = Math.max(n, k);
    return n;
  }
  function post(ctx, t, f) {
    M.grain(ctx, f, 0.045);
  }

  R.define('flagship', { title: 'Flagship · 29.6s', duration: DUR, beats: BEATS, draw, blur, post, cues, music: 'flagship' });
})(typeof window !== 'undefined' ? window : globalThis);

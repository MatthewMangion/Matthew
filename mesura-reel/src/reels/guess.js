/* Mesura · "Guess the number" reel
   15.1 seconds long (the EU average). 8 bars at ~127 BPM. Built for comments:
   a slot counter spins while the viewer guesses, then the story plays out and asks
   "What did you guess?" before looping.

   b0   Hook + spin    Malta ranks first in the EU for this number. Guess before it stops.
   b7.9 Land           29.6% · of workers in Malta use generative AI at work. Were you close?
   b11.6 Compare       Nearly double the EU average.
   b16  Turn           But only 21.6% of organisations formally measure it.
   b20  Shadow         The rest is shadow AI.
   b24  Sunrise        mesura · Measure your organisation's AI readiness.
   b28  CTA            What did you guess? [Get your Diagnostic] mesura.ai */
(function (G) {
  'use strict';
  const { M, R, K } = G;
  const { E, P, D } = M;
  const { tw, clamp, lerp, TAU } = M;

  const DUR = 15.1, BEATS = 32, B = DUR / BEATS;
  const X0 = 96, XR = 984;
  const cues = [];
  const cue = (b, type, o = {}) => cues.push(Object.assign({ b, type }, o));
  const hits = [];
  const hit = (b, amp, dur = 0.7, freq = 14) => hits.push([b, amp, dur, freq]);
  const shakeAt = (b) => M.shake(b, hits);

  // slot columns: [speed (digits/beat), decel start, land, digit, phase]
  const COLS = [[2.6, 5.0, 6.3, 2, 0.35], [6.5, 5.8, 7.1, 9, 3.1], [13, 6.5, 7.9, 6, 5.7]];
  const LAND = 7.9;
  const NUM = { x: 540, y: 1010, size: 300 };

  // ----------------------------------------------------------------- hook, spin, land (b0–12)
  function spin(ctx, b) {
    K.bg(ctx, P.paper);
    const whipIn = 1 - tw(b, 0, 0.6, E.outExpo);
    const [kx, ky] = shakeAt(b);
    ctx.save();
    ctx.translate(kx, whipIn * 300 + ky);
    K.camera(ctx, { s: 1 + Math.min(b, LAND) * 0.004, py: 900 });

    // headline
    const Bh = M.block(ctx, { lines: ['Malta ranks', '*first* in the EU', 'for this number.'], size: 116, lh: 0.98, x: X0 - 4, y: 250, anchor: 'top' });
    K.markBlock(ctx, Bh, {
      t: b, color: P.ink, in: { at: 0, dur: 0.9, stagger: 0.06, style: 'rise' }, out: { at: 8.05, dur: 0.5, stagger: 0.025, style: 'rise' },
      hl: { p: tw(b, 0.9, 0.8, E.outExpo) * (1 - tw(b, 7.95, 0.35, E.inExpo)), color: P.ochre, top: 0.98, h: 1.2, padX: 12, r: 9 },
    });
    M.text(ctx, { lines: ['Were you close?'], size: 116, x: X0 - 4, y: 250, anchor: 'top' },
      { t: b, color: P.ink, in: { at: 8.45, dur: 0.9, stagger: 0.07, style: 'rise' }, out: { at: 11.45, dur: 0.45, stagger: 0.03, style: 'rise' } });

    // counter (slot until it lands; then static so the compare scene can carry it)
    if (b < 11.6) {
      const cols = COLS.map(([sp, t0, t1, d]) => ({ pos: K.slotPos(b, sp, t0, t1, d) }));
      const lp = tw(b, LAND, 0.9, E.linear);
      const pulse = 1 + 0.07 * Math.sin(Math.PI * clamp(lp * 2.2)) * (1 - lp);
      const inP = tw(b, 0.25, 0.9, E.outExpo);
      ctx.save();
      ctx.translate(NUM.x, NUM.y - 100);
      ctx.scale(pulse * lerp(0.85, 1, inP), pulse * lerp(0.85, 1, inP));
      ctx.translate(-NUM.x, -(NUM.y - 100));
      ctx.globalAlpha = clamp(inP * 2);
      K.slot(ctx, cols, { x: NUM.x, y: NUM.y, size: NUM.size, color: P.pine, align: 'center', dot: 2, suffix: '%', suffixColor: P.ochre });
      ctx.restore();
      // landing ring
      if (lp > 0 && lp < 1) {
        ctx.save();
        ctx.strokeStyle = M.rgba(P.ochre, 0.85 * (1 - lp));
        ctx.lineWidth = lerp(10, 1, lp);
        ctx.beginPath();
        ctx.arc(NUM.x, NUM.y - 100, 330 + lp * 260, 0, TAU);
        ctx.stroke();
        ctx.restore();
      }
    }

    // prompt + timer ruler
    M.text(ctx, { lines: ['Guess before it stops.'], fam: 'sans', weight: 500, size: 56, x: 540, y: 1172, align: 'center', anchor: 'top' },
      { t: b, color: P.inkBody, in: { at: 1.1, dur: 0.8, stagger: 0.05, style: 'rise' }, out: { at: 7.95, dur: 0.45, stagger: 0.03, style: 'rise' } });
    const rp = tw(b, 0.8, 1.0, E.outExpo) * (1 - tw(b, 8.0, 0.5, E.outCubic));
    if (rp > 0) {
      ctx.save();
      ctx.globalAlpha = rp;
      M.ruler(ctx, X0, 1330, XR - X0, { n: 40, major: 10, len: 12, majorLen: 26, color: M.rgba(P.ink, 0.45), lw: 2, p: rp, baseline: false });
      const tp = M.prog(b, 1.0, LAND);
      M.rrect(ctx, X0, 1312, XR - X0, 10, 5);
      ctx.fillStyle = P.paperSunken;
      ctx.fill();
      M.rrect(ctx, X0, 1312, Math.max(10, (XR - X0) * tp), 10, 5);
      ctx.fillStyle = P.pine;
      ctx.fill();
      M.label(ctx, 'Eurostat · 2025', X0, 1420, { fam: 'mono', weight: 400, size: 26, color: P.inkMuted, ls: 0.04, upper: false });
      M.label(ctx, (Math.max(0, LAND - Math.max(1, b)) * B).toFixed(1) + 's', XR, 1420, { fam: 'mono', weight: 500, size: 26, color: P.ink, ls: 0.04, align: 'right', upper: false });
      ctx.restore();
    }
    M.text(ctx, { lines: ['of workers in Malta use', 'generative AI at work.'], fam: 'sans', weight: 500, size: 54, lh: 1.26, x: 540, y: 1200, align: 'center', anchor: 'top' },
      { t: b, color: P.inkBody, in: { at: 8.25, dur: 0.9, stagger: 0.045, style: 'rise' }, out: { at: 11.45, dur: 0.45, stagger: 0.02, style: 'rise' } });
    ctx.restore();
  }
  cue(0, 'impact', { gain: 0.7 });
  cue(0, 'whoosh', { dur: 0.45, dir: 'up', gain: 0.55 });
  cue(0.9, 'swipe', { dur: 0.4, gain: 0.45 });
  cue(0.25, 'slot', { cols: COLS, end: LAND });
  cue(1.1, 'swipe', { dur: 0.35, gain: 0.3 });
  for (const c of COLS.slice(0, 2)) cue(c[2], 'tick', { pitch: 0.8, gain: 0.6 });
  cue(LAND, 'land', { gain: 1.1 });
  cue(LAND, 'impact', { gain: 0.55 });
  hit(LAND, 9, 0.9, 12);
  cue(8.25, 'swipe', { dur: 0.4, gain: 0.35 });
  cue(8.45, 'pop', { gain: 0.6 });

  // ----------------------------------------------------------------- compare (b11.6–16)
  const BASE = 1400, PCT = 26;
  const MT = { x: 600, w: 300 }, EU = { x: 180, w: 300 };
  const topOf = (v) => BASE - v * PCT;

  function compare(ctx, b) {
    K.bg(ctx, P.paper);
    const exit = tw(b, 15.35, 0.65, E.inExpo);
    const g = tw(b, 11.8, 1.0, E.outExpo);
    // grid + baseline
    ctx.save();
    ctx.setLineDash([3, 11]);
    ctx.lineWidth = 2;
    [10, 20, 30].forEach((v, i) => {
      const y = topOf(v), p = clamp(g * 1.2 - i * 0.12);
      if (p <= 0) return;
      ctx.strokeStyle = M.rgba(P.inkMuted, 0.45 * (1 - exit));
      ctx.beginPath();
      ctx.moveTo(172, y);
      ctx.lineTo(172 + 758 * p, y);
      ctx.stroke();
      M.label(ctx, v + (v === 30 ? '%' : ''), X0, y + 9, { fam: 'mono', weight: 400, size: 27, color: P.inkMuted, ls: 0, upper: false, alpha: p * (1 - exit) });
    });
    ctx.restore();
    ctx.fillStyle = P.ink;
    ctx.fillRect(X0, BASE, (XR - X0) * tw(b, 11.7, 0.9, E.outExpo) * (1 - exit), 3);
    // bars
    const mg = tw(b, 11.75, 1.0, E.snap) * (1 - exit);
    const eg = tw(b, 12.1, 1.0, E.outExpo) * (1 - exit);
    const mTop = BASE - (BASE - topOf(29.6)) * mg, eTop = BASE - (BASE - topOf(15.1)) * eg;
    ctx.fillStyle = P.inkFaint;
    ctx.beginPath();
    ctx.roundRect(EU.x, eTop, EU.w, BASE - eTop, [10, 10, 0, 0]);
    ctx.fill();
    ctx.fillStyle = P.pine;
    ctx.beginPath();
    ctx.roundRect(MT.x, mTop, MT.w, BASE - mTop, [10, 10, 0, 0]);
    ctx.fill();
    if (eg > 0.01) M.odometer(ctx, 15.1 * E.outQuart(M.prog(b, 12.1, 13.0)), { x: EU.x + EU.w / 2, y: eTop - 40, size: 104, color: P.inkFaint, align: 'center', decimals: 1, digits: 2, suffix: '%', suffixP: tw(b, 12.6, 0.5, E.linear) });
    const cl = tw(b, 12.2, 0.8, E.outExpo) * (1 - exit);
    M.label(ctx, 'EU average', EU.x + EU.w / 2, BASE + 60, { size: 30, color: P.inkMuted, align: 'center', alpha: cl, ls: 0.14 });
    M.label(ctx, 'Malta', MT.x + MT.w / 2, BASE + 60, { size: 30, color: P.ink, align: 'center', alpha: cl, ls: 0.14 });
    // the counter travels to Malta's bar
    const mv = tw(b, 11.6, 1.1, E.snap);
    const nx = lerp(NUM.x, MT.x + MT.w / 2, mv), ny = lerp(NUM.y, mTop - 40, mv), ns = lerp(NUM.size, 104, mv);
    if (exit < 1) {
      ctx.save();
      ctx.globalAlpha = 1 - exit;
      M.odometer(ctx, 29.6, { x: nx, y: ny, size: ns, color: P.pine, align: 'center', decimals: 1, digits: 2, suffix: '%', suffixColor: M.mixHex(P.ochre, P.pine, mv) });
      ctx.restore();
    }
    // headline + gap annotation
    M.text(ctx, { lines: ['Nearly double', 'the EU average.'], size: 112, lh: 0.98, x: X0 - 4, y: 250, anchor: 'top' },
      { t: b, color: P.ink, in: { at: 12.25, dur: 0.9, stagger: 0.07, style: 'rise' }, out: { at: 15.3, dur: 0.5, stagger: 0.03, style: 'rise' } });
    const euY = topOf(15.1), mY = topOf(29.6);
    const a1 = tw(b, 13.0, 0.8, E.outExpo) * (1 - exit);
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
    M.dimLine(ctx, 540, euY - 6, 540, mY + 6, { p: tw(b, 13.3, 0.9, E.linear) * (1 - exit), color: P.ochre, lw: 4, tick: 30, arrow: 18 });
    M.label(ctx, '1.96×', 508, (euY + mY) / 2 + 22, { fam: 'serif', weight: 500, size: 66, color: P.ochre, ls: 0, align: 'right', upper: false, alpha: tw(b, 13.7, 0.7, E.outExpo) * (1 - exit) });
  }
  cue(11.55, 'morph', { dur: 1.1 * B });
  cue(12.1, 'rise', { dur: 1.0 * B });
  cue(12.25, 'swipe', { dur: 0.4, gain: 0.4 });
  cue(13.3, 'measure', { dur: 0.45 });
  cue(13.7, 'pop', { gain: 0.6 });
  cue(15.3, 'suck', { dur: 0.7 * B });

  // ----------------------------------------------------------------- turn + shadow (b16–24)
  const WF = { x: X0, y: 772, cell: 60, gap: 9 };
  function waffleWorld(ctx, b, T, dark) {
    K.bg(ctx, T.bg);
    const oldOut = { at: 20.85, dur: 0.45, stagger: 0.03, style: 'rise' };
    M.text(ctx, { lines: ['But only'], size: 88, x: X0 - 2, y: 250, anchor: 'top' }, { t: b, color: T.muted, in: { at: 16.0, dur: 0.7, stagger: 0.05, style: 'rise' }, out: oldOut });
    const nIn = tw(b, 16.1, 0.7, E.outExpo), nOut = tw(b, 20.85, 0.45, E.inExpo);
    if (nIn > 0 && nOut < 1) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 350, M.W, 250);
      ctx.clip();
      ctx.translate(0, (1 - nIn) * 250 - nOut * 250);
      M.odometer(ctx, 21.6 * E.outQuart(M.prog(b, 16.15, 17.0)), { x: X0 - 10, y: 568, size: 300, color: T.ochre, align: 'left', decimals: 1, digits: 2, suffix: '%', suffixP: tw(b, 16.95, 0.5, E.linear) });
      ctx.restore();
    }
    M.text(ctx, { lines: ['of organisations formally', 'measure it.'], fam: 'sans', weight: 500, size: 52, lh: 1.24, x: X0, y: 618, anchor: 'top' },
      { t: b, color: T.body, in: { at: 16.6, dur: 0.7, stagger: 0.035, style: 'rise' }, out: oldOut });
    K.waffle(ctx, {
      x: WF.x, y: WF.y, cell: WF.cell, gap: WF.gap, T,
      appear: (i) => tw(b, 16.2 + ((i % 10) + Math.floor(i / 10)) * 0.035, 0.5, E.linear),
      fill: (i) => (i < 22 ? tw(b, 17.0 + i * 0.052, 0.4, E.linear) : 0),
      partialIdx: 21, partialAmt: 0.6,
      activity: dark ? tw(b, 20.8, 1.0, E.outCubic) : 0, t: b * B, glow: dark ? tw(b, 20.5, 1.0, E.outCubic) : 0,
    });
    if (dark) {
      const newOut = { at: 23.0, dur: 0.45, stagger: 0.03, style: 'rise' };
      M.text(ctx, { lines: ['The rest is'], size: 88, x: X0 - 2, y: 250, anchor: 'top' }, { t: b, color: T.muted, in: { at: 21.0, dur: 0.7, stagger: 0.05, style: 'rise' }, out: newOut });
      M.text(ctx, { lines: ['shadow AI.'], fam: 'serifI', size: 196, x: X0 - 8, y: 568, anchor: 'baseline', ls: -0.015 }, { t: b, color: T.ink, in: { at: 21.15, dur: 0.9, stagger: 0.08, style: 'rise' }, out: newOut });
      M.text(ctx, { lines: ['Invisible to leadership.'], fam: 'sans', weight: 500, size: 52, x: X0, y: 618, anchor: 'top' }, { t: b, color: T.body, in: { at: 21.6, dur: 0.7, stagger: 0.04, style: 'rise' }, out: newOut });
    }
  }
  const GLINT = { x: 540, y: 1330 };
  function shadow(ctx, b) {
    const sw = tw(b, 20.0, 1.1, E.inOutQuad);
    K.sweep(ctx, sw, (x) => waffleWorld(x, b, K.LT, false), (x) => waffleWorld(x, b, K.DK, true));
    if (sw > 0) M.vignette(ctx, 0.35 * sw, D.paperSunken, 0.5);
    // the waffle recedes, a glint appears on the horizon
    const gp = tw(b, 22.6, 1.4, E.inQuad);
    if (gp > 0) {
      ctx.save();
      ctx.fillStyle = M.rgba(D.paperSunken, 0.75 * tw(b, 23.0, 0.9, E.inOutCubic));
      ctx.fillRect(0, 0, M.W, M.H);
      ctx.restore();
      K.glint(ctx, GLINT.x, GLINT.y, gp, -1.2 + (b - 24) * 0.3);
    }
  }
  cue(16.0, 'stop', { gain: 0.9 });
  cue(16.15, 'counter', { dur: 0.85 * B, to: 21.6, gain: 0.6 });
  for (let i = 0; i < 22; i++) cue(17.0 + i * 0.052, 'tick', { pitch: 1.0 + i * 0.03, gain: 0.28 });
  cue(20.0, 'sweep', { dur: 1.1 * B });
  cue(20.0, 'boom', { gain: 0.9 });
  cue(21.15, 'swipe', { dur: 0.4, gain: 0.35 });
  cue(22.6, 'glint', { dur: 1.4 * B });
  cue(22.4, 'riser', { dur: 1.6 * B, gain: 0.9 });

  // ----------------------------------------------------------------- sunrise + CTA (b24–32)
  // logo sizes are mark heights; the full lockup is ~6.8× as wide
  const LOCK = { size: 118, y: 912 }, CTA = 78;
  function lockGeom(size, y) {
    const g = M.lockupGeom(size, 540, y, 'center');
    return { markX: g.markCx, markY: g.markCy, x0: g.x0, g };
  }
  function sunriseCta(ctx, b) {
    const rise = tw(b, 24.0, 1.3, E.glide);
    const flood = tw(b, 24.1, 1.3, E.inOutCubic);
    const toLock = tw(b, 25.0, 1.0, E.snap);
    const up = tw(b, 27.9, 0.8, E.snap); // lockup travels up for the CTA
    const loop = tw(b, 31.25, 0.75, E.inExpo);
    const size = lerp(LOCK.size, CTA, up), ly = lerp(LOCK.y, 380, up);
    const Lg = lockGeom(size, ly);
    const sunX = lerp(GLINT.x, 540, rise), sunY = lerp(GLINT.y, 860, rise), sunS = lerp(110, 420, rise);
    const sx = lerp(sunX, Lg.markX, toLock), sy = lerp(sunY, Lg.markY, toLock), ss = lerp(sunS, size, toLock);
    const rot = lerp(-1.2, 0, E.outCubic(M.prog(b, 24.0, 26.0)));
    const [kx, ky] = shakeAt(b);
    K.bg(ctx, D.paperSunken);
    ctx.save();
    ctx.translate(kx, ky);
    K.sun(ctx, sx, sy, ss, { rot, rays: 1, glow: 1, rayRot: b * 0.05, color: D.ochre, blend: 'lighter' });
    K.motes(ctx, b * B, { n: 100, color: '#FFD890', alpha: 0.9 });
    ctx.restore();
    const light = (x) => {
      K.bg(x, P.paper);
      x.save();
      x.translate(0, -loop * 1500);
      const fade = 1 - tw(b, 25.6, 1.8, E.inOutCubic);
      K.sun(x, sx, sy, ss, { rot, rays: 0.55 * fade + 0.4 * up, glow: 0.4 * fade + 0.3 * up, rayRot: b * 0.05, color: P.ochre, blend: 'source-over', core: false, rayWidth: 3.2, rayLen: 2000 });
      M.mark(x, sx, sy, ss, { color: P.gold, rot });
      M.wordmark(x, Lg.g.textX, ly, Lg.g.xh, { color: P.logo, reveal: tw(b, 25.55, 0.9, E.outExpo), slide: 70 });
      M.text(x, { lines: ["Measure your organisation's", 'AI readiness.'], size: 66, lh: 1.12, x: 540, y: 1040, align: 'center', anchor: 'top' },
        { t: b, color: P.inkBody, in: { at: 25.9, dur: 0.8, stagger: 0.045, style: 'rise' }, out: { at: 27.75, dur: 0.4, stagger: 0.02, style: 'rise' } });
      // CTA
      M.text(x, { lines: ['What did', 'you guess?'], size: 150, lh: 0.98, x: 540, y: 520, align: 'center', anchor: 'top' },
        { t: b, color: P.ink, in: { at: 28.25, dur: 0.9, stagger: 0.08, style: 'rise' } });
      const bp = tw(b, 28.8, 0.8, E.outBack);
      const press = tw(b, 30.25, 0.1, E.linear) * (1 - tw(b, 30.4, 0.3, E.outCubic));
      if (bp > 0) {
        x.save();
        x.translate(540, 1060);
        x.scale(lerp(0.6, 1, bp), lerp(0.6, 1, bp));
        x.globalAlpha *= clamp(bp * 2);
        x.translate(-540, -1060);
        K.button(x, { cx: 540, cy: 1060, w: 740, h: 156, size: 52, text: 'Get your Diagnostic', m: 1, press, textP: tw(b, 29.0, 0.6, E.linear), ripple: M.prog(b, 30.3, 31.1), rx: 120, ry: 10 });
        x.restore();
      }
      K.tap(x, lerp(900, 660, tw(b, 29.7, 0.5, E.outCubic)), lerp(1400, 1070, tw(b, 29.7, 0.5, E.outCubic)), { p: tw(b, 29.7, 0.4, E.outCubic) * (1 - tw(b, 30.9, 0.4, E.outCubic)), press, ripple: M.prog(b, 30.3, 31.0), rippleColor: P.onPine });
      const lb = tw(b, 29.4, 0.7, E.outExpo);
      M.label(x, 'Link in bio', 540, 1268 + (1 - lb) * 24, { weight: 500, size: 38, color: P.inkMuted, ls: 0.01, align: 'center', upper: false, alpha: lb });
      x.restore();
    };
    if (flood >= 1) light(ctx);
    else if (flood > 0) {
      const Rr = lerp(0, 2500, flood);
      M.layer(ctx, light, {
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
  cue(24.0, 'sunrise', { gain: 1 });
  hit(24.0, 10, 1.2, 10);
  cue(25.0, 'morph', { dur: 1.0 * B, gain: 0.6 });
  cue(25.55, 'chime', { gain: 1 });
  cue(25.9, 'swipe', { dur: 0.4, gain: 0.3 });
  cue(27.9, 'whoosh', { dur: 0.5, dir: 'up', gain: 0.45 });
  cue(28.25, 'swipe', { dur: 0.45, gain: 0.4 });
  cue(28.8, 'pop', { gain: 0.7 });
  cue(29.4, 'swipe', { dur: 0.35, gain: 0.3 });
  cue(30.25, 'tap', { gain: 1 });
  cue(30.3, 'confirm', { gain: 0.8 });
  cue(31.1, 'riser', { dur: 0.9 * B, gain: 0.8 });
  cue(31.35, 'whoosh', { dur: 0.6, dir: 'up', gain: 0.7 });

  const S = [[0, 11.6, spin], [11.6, 16, compare], [16, 24, shadow], [24, 32, sunriseCta]];
  function draw(ctx, t) {
    const b = t / B;
    for (const [a, z, fn] of S) if (b >= a && b < z) { fn(ctx, b); break; }
  }
  const BLUR = [[0, 0.7, 12], [0.2, 7.95, 10], [7.8, 8.6, 12], [11.4, 12.8, 12], [15.3, 16.05, 14], [16.1, 17.1, 10],
    [19.9, 21.2, 8], [23.8, 26.2, 8], [27.8, 28.8, 12], [31.0, 32, 16]];
  function blur(t) {
    const b = t / B;
    let n = 6;
    for (const [a, z, k] of BLUR) if (b >= a && b < z) n = Math.max(n, k);
    return n;
  }
  function post(ctx, t, f) {
    M.grain(ctx, f, 0.045);
  }

  function cover(ctx) {
    K.bg(ctx, P.pine);
    const lg = ctx.createRadialGradient(540, 930, 40, 540, 930, 1000);
    lg.addColorStop(0, M.rgba('#2A6258', 0.9));
    lg.addColorStop(1, M.rgba(P.pine, 0));
    ctx.fillStyle = lg;
    ctx.fillRect(0, 0, M.W, M.H);
    M.text(ctx, { lines: ['Guess the', 'number.'], size: 190, lh: 0.96, x: X0 - 6, y: 330, anchor: 'top' }, { t: 1, color: P.onPine, in: { style: 'none' } });
    ctx.font = M.font('serif', 500, 300);
    ctx.letterSpacing = '-18px';
    const q = '??.?', qw = ctx.measureText(q).width, pw = ctx.measureText('%').width;
    const x0 = 540 - (qw + pw) / 2;
    ctx.fillStyle = M.rgba(P.onPine, 0.95);
    ctx.fillText(q, x0, 1080);
    ctx.fillStyle = P.ochre;
    ctx.fillText('%', x0 + qw, 1080);
    M.text(ctx, { lines: ['Malta ranks first in the EU for it.'], fam: 'sans', weight: 500, size: 48, x: 540, y: 1180, align: 'center', anchor: 'top' }, { t: 1, color: M.rgba(P.onPine, 0.85), in: { style: 'none' } });
    M.ruler(ctx, X0, 1330, XR - X0, { n: 40, major: 10, len: 12, majorLen: 26, color: M.rgba(P.onPine, 0.4), lw: 2, p: 1, baseline: false });
    M.rrect(ctx, X0, 1312, XR - X0, 10, 5);
    ctx.fillStyle = M.rgba(P.onPine, 0.15);
    ctx.fill();
    M.rrect(ctx, X0, 1312, (XR - X0) * 0.62, 10, 5);
    ctx.fillStyle = P.ochre;
    ctx.fill();
    M.lockup(ctx, 540, 1590, 60, { align: 'center', color: P.onPine, markColor: P.gold });
  }

  R.define('guess', { title: 'Guess · 15.1s', duration: DUR, beats: BEATS, draw, blur, post, cues, cover, music: 'guess' });
})(typeof window !== 'undefined' ? window : globalThis);

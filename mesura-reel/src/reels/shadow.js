/* Mesura · "Shadow AI" reel
   21.6 seconds long (the share of organisations that formally measure AI use).
   10 bars at ~111 BPM. A leadership-pain hook that pays off on the same dashboard.

   b0   Hook       Your dashboard tracks everything. Except this.
   b4   Shadow     29.6% of workers in Malta use generative AI at work.
   b8   Measure    Only 21.6% of organisations formally measure it.
   b12  Shadow AI  The rest is shadow AI. Invisible to leadership.
   b16  Until      Until you measure it.
   b20  Sunrise    mesura · Measure your organisation's AI readiness.
   b24  Measured   See what your dashboards can't.
   b29  CTA        Start with a Diagnostic. [Get your Diagnostic] mesura.ai
   b33  Question   Who in your team uses AI?  → loops to the hook */
(function (G) {
  'use strict';
  const { M, R, K } = G;
  const { E, P, D } = M;
  const { tw, clamp, lerp } = M;

  const DUR = 21.6, BEATS = 40, B = DUR / BEATS;
  const X0 = 96, XR = 984;
  const cues = [];
  const cue = (b, type, o = {}) => cues.push(Object.assign({ b, type }, o));
  const hits = [];
  const hit = (b, amp, dur = 0.7, freq = 14) => hits.push([b, amp, dur, freq]);
  const shakeAt = (b) => M.shake(b, hits);

  const DASH = { x: X0, y: 640, w: XR - X0, h: 760 };
  const tileW = (DASH.w - 88 - 24) / 2, tileH = 208;
  const AI = { x: DASH.x + 44 + tileW + 24, y: DASH.y + 138 + tileH + 24, w: tileW, h: tileH };
  const AIc = { x: AI.x + AI.w / 2, y: AI.y + AI.h / 2 };
  const GLINT = { x: 540, y: 1330 };

  // ----------------------------------------------------------------- hook → dark (b0–8)
  function dashWorld(ctx, b, T, dark) {
    K.bg(ctx, T.bg);
    const zoomIn = tw(b, 2.4, 1.7, E.inOutCubic);
    const back = tw(b, 4.3, 1.5, E.snap);
    const s = lerp(1, 1.3, zoomIn) * lerp(1, 0.86, back);
    if (dark) K.activity(ctx, { t: b * B, n: 150, alpha: tw(b, 4.4, 1.2, E.outCubic) * (1 - tw(b, 7.8, 0.8, E.outCubic)) });
    ctx.save();
    K.camera(ctx, { s, px: AIc.x, py: AIc.y, y: back * 260 });
    const fadeOut = tw(b, 7.7, 0.8, E.outCubic);
    K.dashboard(ctx, DASH.x, DASH.y, DASH.w, DASH.h, {
      T, t: b * B,
      tileP: (i) => tw(b, 0.3 + i * 0.12, 0.7, E.linear),
      sparkP: (i) => tw(b, 0.55 + i * 0.1, 1.1, E.outCubic),
      badgeP: tw(b, 0.9, 0.6, E.linear),
      ring: tw(b, 2.35, 0.8, E.outCubic),
      blind: dark ? tw(b, 5.0, 0.25, E.linear) * (1 - tw(b, 5.6, 0.5, E.linear)) : 0,
      alpha: dark ? lerp(1, 0.3, back) * (1 - fadeOut) : 1,
    });
    ctx.restore();
    // headlines
    M.text(ctx, { lines: ['Your dashboard', 'tracks everything.'], size: 120, lh: 1.0, x: X0 - 4, y: 262, anchor: 'top' },
      { t: b, color: T.ink, in: { at: 0, dur: 0.9, stagger: 0.07, style: 'rise' }, out: { at: 2.05, dur: 0.45, stagger: 0.03, style: 'rise' } });
    const Bx = M.block(ctx, { lines: ['Except *this.*'], size: 150, x: X0 - 6, y: 262, anchor: 'top' });
    K.markBlock(ctx, Bx, {
      t: b, color: T.ink, in: { at: 2.3, dur: 0.8, stagger: 0.08, style: 'rise' }, out: { at: 4.35, dur: 0.45, stagger: 0.03, style: 'rise' },
      hl: { p: tw(b, 2.75, 0.7, E.outExpo) * (1 - tw(b, 4.2, 0.3, E.inExpo)), color: T.ochre, text: dark ? D.paperSunken : null, top: 0.98, h: 1.2, padX: 12, r: 10 },
    });
    if (dark) {
      const nIn = tw(b, 4.55, 0.8, E.outExpo), nOut = tw(b, 7.75, 0.45, E.inExpo);
      if (nIn > 0 && nOut < 1) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 260, M.W, 250);
        ctx.clip();
        ctx.translate(0, (1 - nIn) * 250 - nOut * 250);
        M.odometer(ctx, 29.6 * E.outQuart(M.prog(b, 4.6, 5.6)), { x: X0 - 10, y: 478, size: 300, color: D.ochre, align: 'left', decimals: 1, digits: 2, suffix: '%', suffixP: tw(b, 5.55, 0.5, E.linear) });
        ctx.restore();
      }
      M.text(ctx, { lines: ['of workers in Malta use', 'generative AI at work.'], fam: 'sans', weight: 500, size: 54, lh: 1.26, x: X0, y: 530, anchor: 'top' },
        { t: b, color: D.inkBody, in: { at: 5.2, dur: 0.8, stagger: 0.04, style: 'rise' }, out: { at: 7.75, dur: 0.45, stagger: 0.02, style: 'rise' } });
      M.label(ctx, 'Eurostat · 2025', X0, 720, { fam: 'mono', weight: 400, size: 26, color: D.inkMuted, ls: 0.04, upper: false, alpha: tw(b, 5.8, 0.6, E.outCubic) * (1 - tw(b, 7.7, 0.4, E.outCubic)) });
    }
  }
  function hookDark(ctx, b) {
    const whipIn = 1 - tw(b, 0, 0.6, E.outExpo);
    const [kx, ky] = shakeAt(b);
    ctx.save();
    ctx.translate(kx, whipIn * 300 + ky);
    const sw = tw(b, 4.0, 1.1, E.inOutQuad);
    K.sweep(ctx, sw, (x) => dashWorld(x, b, K.LT, false), (x) => dashWorld(x, b, K.DK, true));
    ctx.restore();
    if (sw > 0) M.vignette(ctx, 0.35 * sw, D.paperSunken, 0.5);
    if (b >= 7.6) waffleWorld(ctx, b, tw(b, 7.6, 0.4, E.linear));
  }
  cue(0, 'impact', { gain: 0.7 });
  cue(0, 'whoosh', { dur: 0.45, dir: 'up', gain: 0.55 });
  for (let i = 0; i < 5; i++) cue(0.3 + i * 0.12, 'tick', { pitch: 0.9 + i * 0.06, gain: 0.25 });
  cue(2.3, 'swipe', { dur: 0.4, gain: 0.45 });
  cue(2.35, 'measure', { dur: 0.45, gain: 0.8 });
  cue(2.4, 'riser', { dur: 1.6 * B, gain: 0.55 });
  cue(4.0, 'sweep', { dur: 1.1 * B });
  cue(4.0, 'boom', { gain: 1 });
  cue(4.6, 'counter', { dur: 1.0 * B, to: 29.6, gain: 0.6 });
  cue(5.55, 'land', { gain: 0.8 });
  hit(5.55, 6, 0.8, 12);
  cue(5.0, 'glitch', { dur: 0.5 * B });

  // ----------------------------------------------------------------- waffle / shadow AI / until (b7.6–20)
  const WF = { x: X0, y: 772, cell: 60, gap: 9 };
  function waffleWorld(ctx, b, alpha = 1) {
    const T = K.DK;
    ctx.save();
    ctx.globalAlpha = alpha;
    if (alpha >= 1) K.bg(ctx, T.bg);
    const gone = tw(b, 15.7, 0.9, E.outCubic);
    const oldOut = { at: 11.85, dur: 0.45, stagger: 0.03, style: 'rise' };
    M.text(ctx, { lines: ['Only'], size: 88, x: X0 - 2, y: 250, anchor: 'top' }, { t: b, color: T.muted, in: { at: 8.0, dur: 0.7, stagger: 0.05, style: 'rise' }, out: oldOut });
    const nIn = tw(b, 8.1, 0.8, E.outExpo), nOut = tw(b, 11.85, 0.45, E.inExpo);
    if (nIn > 0 && nOut < 1) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 350, M.W, 250);
      ctx.clip();
      ctx.translate(0, (1 - nIn) * 250 - nOut * 250);
      M.odometer(ctx, 21.6 * E.outQuart(M.prog(b, 8.2, 9.1)), { x: X0 - 10, y: 568, size: 300, color: T.ochre, align: 'left', decimals: 1, digits: 2, suffix: '%', suffixP: tw(b, 9.05, 0.5, E.linear) });
      ctx.restore();
    }
    M.text(ctx, { lines: ['of organisations formally', 'measure it.'], fam: 'sans', weight: 500, size: 52, lh: 1.24, x: X0, y: 618, anchor: 'top' },
      { t: b, color: T.body, in: { at: 8.6, dur: 0.8, stagger: 0.04, style: 'rise' }, out: oldOut });
    const newOut = { at: 15.55, dur: 0.45, stagger: 0.03, style: 'rise' };
    M.text(ctx, { lines: ['The rest is'], size: 88, x: X0 - 2, y: 250, anchor: 'top' }, { t: b, color: T.muted, in: { at: 12.1, dur: 0.7, stagger: 0.05, style: 'rise' }, out: newOut });
    M.text(ctx, { lines: ['shadow AI.'], fam: 'serifI', size: 196, x: X0 - 8, y: 568, anchor: 'baseline', ls: -0.015 }, { t: b, color: T.ink, in: { at: 12.25, dur: 0.9, stagger: 0.08, style: 'rise' }, out: newOut });
    M.text(ctx, { lines: ['Invisible to leadership.'], fam: 'sans', weight: 500, size: 52, x: X0, y: 618, anchor: 'top' }, { t: b, color: T.body, in: { at: 12.8, dur: 0.7, stagger: 0.04, style: 'rise' }, out: newOut });
    if (gone < 1) {
      ctx.save();
      ctx.globalAlpha *= 1 - gone;
      K.waffle(ctx, {
        x: WF.x, y: WF.y + gone * 80, cell: WF.cell, gap: WF.gap, T,
        appear: (i) => tw(b, 8.2 + ((i % 10) + Math.floor(i / 10)) * 0.04, 0.5, E.linear),
        fill: (i) => (i < 22 ? tw(b, 9.1 + i * 0.05, 0.4, E.linear) : 0),
        partialIdx: 21, partialAmt: 0.6,
        activity: tw(b, 9.5, 1.0, E.outCubic) * (1 + 0.6 * tw(b, 12, 1, E.linear)), t: b * B, glow: tw(b, 9.2, 1.0, E.outCubic),
      });
      ctx.restore();
    }
    ctx.restore();
  }
  function until(ctx, b) {
    waffleWorld(ctx, b);
    K.activity(ctx, { t: b * B, n: 150, alpha: tw(b, 15.8, 1.0, E.outCubic), pull: (i) => tw(b, 17.4 + M.rand(i, 67) * 1.1, 1.6, E.inCubic), to: GLINT });
    M.vignette(ctx, 0.35, D.paperSunken, 0.5);
    const Bu = M.block(ctx, { lines: ['Until you', '*measure* it.'], size: 170, lh: 0.98, x: X0 - 6, y: 820, anchor: 'middle' });
    K.markBlock(ctx, Bu, {
      t: b, color: D.ink, in: { at: 16.2, dur: 0.9, stagger: 0.08, style: 'rise' }, out: { at: 19.55, dur: 0.45, stagger: 0.03, style: 'rise' },
      hl: { p: tw(b, 16.95, 0.8, E.outExpo) * (1 - tw(b, 19.35, 0.35, E.inExpo)), color: D.ochre, text: D.paperSunken, top: 0.98, h: 1.2, padX: 14, r: 10 },
    });
    K.glint(ctx, GLINT.x, GLINT.y, tw(b, 17.6, 2.4, E.inQuad), b * 0.3);
    K.activity(ctx, { t: b * B, n: 150, top: true, pull: (i) => tw(b, 17.4 + M.rand(i, 67) * 1.1, 1.6, E.inCubic), to: GLINT });
  }
  cue(7.7, 'whoosh', { dur: 0.5, dir: 'down', gain: 0.4 });
  cue(8.0, 'swipe', { dur: 0.4, gain: 0.35 });
  cue(8.2, 'counter', { dur: 0.9 * B, to: 21.6, gain: 0.6 });
  for (let i = 0; i < 22; i++) cue(9.1 + i * 0.05, 'tick', { pitch: 1.0 + i * 0.03, gain: 0.26 });
  cue(12.1, 'down', { dur: 0.9 * B, gain: 0.6 });
  cue(12.25, 'swipe', { dur: 0.4, gain: 0.35 });
  cue(16.2, 'swipe', { dur: 0.45, gain: 0.35 });
  cue(17.6, 'glint', { dur: 2.4 * B });
  cue(18.0, 'riser', { dur: 2.0 * B, gain: 1 });

  // ----------------------------------------------------------------- sunrise → measured → CTA (b20–40)
  const LOCK = { size: 150, y: 900 };
  function lockGeom(ctx, size, y, cx = 540) {
    const L = M.layoutLine(ctx, 'mesura', 'serif', 600, size, -0.01);
    const total = size + size * 0.36 + L.width;
    const x0 = cx - total / 2;
    return { markX: x0 + size / 2, markY: y - M.fontMetrics(ctx, 'serif', 600, size).xh / 2, x0, total };
  }
  function finale(ctx, b) {
    const rise = tw(b, 20.0, 1.4, E.glide);
    const flood = tw(b, 20.1, 1.4, E.inOutCubic);
    const toLock = tw(b, 21.2, 1.0, E.snap);
    const toHead = tw(b, 23.7, 0.7, E.snap);   // lockup → small header
    const toCta = tw(b, 28.6, 0.8, E.snap);    // header → centred CTA lockup
    const loop = tw(b, 39.25, 0.75, E.inExpo);
    // lockup geometry through its three states
    const big = lockGeom(ctx, LOCK.size, LOCK.y);
    const hdrSize = 40, ctaSize = 78;
    const hdr = { x0: X0, markX: X0 + hdrSize / 2, markY: 262 - M.fontMetrics(ctx, 'serif', 600, hdrSize).xh / 2 };
    const ctaG = lockGeom(ctx, ctaSize, 380);
    const size = toCta > 0 ? lerp(hdrSize, ctaSize, toCta) : lerp(LOCK.size, hdrSize, toHead);
    const ly = toCta > 0 ? lerp(262, 380, toCta) : lerp(LOCK.y, 262, toHead);
    const lx0 = toCta > 0 ? lerp(hdr.x0, ctaG.x0, toCta) : lerp(big.x0, hdr.x0, toHead);
    const mtx = M.fontMetrics(ctx, 'serif', 600, size);
    const markX = lx0 + size / 2, markY = ly - mtx.xh / 2;
    const sunX = lerp(GLINT.x, 540, rise), sunY = lerp(GLINT.y, 860, rise), sunS = lerp(110, 420, rise);
    const sx = lerp(sunX, markX, toLock), sy = lerp(sunY, markY, toLock), ss = lerp(sunS, size, toLock);
    const rot = lerp(-1.2, 0, E.outCubic(M.prog(b, 20.0, 22.0))) + (b - 28.6) * 0.1 * toCta;
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
      const fade = 1 - tw(b, 21.8, 1.8, E.inOutCubic);
      K.sun(x, sx, sy, ss, { rot, rays: 0.55 * fade + 0.42 * toCta, glow: 0.4 * fade + 0.3 * toCta, rayRot: b * 0.05, color: P.ochre, blend: 'source-over', core: false, rayWidth: 3.4, rayLen: 1800 });
      M.mark(x, sx, sy, ss, { color: P.ochre, rot });
      const wr = tw(b, 21.7, 0.9, E.outExpo);
      if (wr > 0) {
        x.save();
        const tx = lx0 + size + size * 0.36;
        x.beginPath();
        x.rect(tx - 10, ly - size, 760 * wr, size * 1.6);
        x.clip();
        x.font = M.font('serif', 600, size);
        x.letterSpacing = -0.01 * size + 'px';
        x.fillStyle = P.pine;
        x.fillText('mesura', tx - (1 - wr) * 90, ly);
        x.restore();
      }
      M.text(x, { lines: ["Measure your organisation's", 'AI readiness.'], size: 66, lh: 1.12, x: 540, y: 1040, align: 'center', anchor: 'top' },
        { t: b, color: P.inkBody, in: { at: 22.0, dur: 0.8, stagger: 0.045, style: 'rise' }, out: { at: 23.6, dur: 0.4, stagger: 0.02, style: 'rise' } });
      // measured dashboard
      const dIn = tw(b, 24.0, 1.0, E.snap), dOut = tw(b, 28.5, 0.8, E.snap);
      if (dIn > 0 && dOut < 1) {
        x.save();
        x.translate(0, (1 - dIn) * 1300 + dOut * 1400);
        K.dashboard(x, DASH.x, DASH.y, DASH.w, DASH.h, {
          T: K.LT, t: b * B,
          tileP: (i) => tw(b, 24.2 + i * 0.1, 0.6, E.linear),
          sparkP: (i) => tw(b, 24.4 + i * 0.1, 1.0, E.outCubic),
          measured: tw(b, 25.3, 1.1, E.linear),
          ring: tw(b, 25.1, 0.8, E.outCubic),
        });
        x.restore();
      }
      M.text(x, { lines: ['See what your', "dashboards can't."], size: 116, lh: 0.98, x: X0 - 4, y: 330, anchor: 'top' },
        { t: b, color: P.ink, in: { at: 24.3, dur: 0.9, stagger: 0.07, style: 'rise' }, out: { at: 28.4, dur: 0.45, stagger: 0.03, style: 'rise' } });
      // CTA
      M.text(x, { lines: ['Start with a', 'Diagnostic.'], size: 150, lh: 0.98, x: 540, y: 520, align: 'center', anchor: 'top' },
        { t: b, color: P.ink, in: { at: 28.9, dur: 0.9, stagger: 0.08, style: 'rise' }, out: { at: 32.75, dur: 0.45, stagger: 0.03, style: 'rise' } });
      M.text(x, { lines: ['Who in your', 'team uses AI?'], size: 132, lh: 0.98, x: 540, y: 520, align: 'center', anchor: 'top' },
        { t: b, color: P.ink, in: { at: 33.1, dur: 0.9, stagger: 0.08, style: 'rise' } });
      const bp = tw(b, 29.4, 0.8, E.outBack);
      const press = tw(b, 31.0, 0.1, E.linear) * (1 - tw(b, 31.15, 0.3, E.outCubic));
      if (bp > 0) {
        x.save();
        x.translate(540, 1060);
        x.scale(lerp(0.6, 1, bp), lerp(0.6, 1, bp));
        x.globalAlpha *= clamp(bp * 2);
        x.translate(-540, -1060);
        K.button(x, { cx: 540, cy: 1060, w: 740, h: 156, size: 52, text: 'Get your Diagnostic', m: 1, press, textP: tw(b, 29.6, 0.6, E.linear), ripple: M.prog(b, 31.05, 31.9), rx: 120, ry: 10 });
        x.restore();
      }
      K.tap(x, lerp(900, 660, tw(b, 30.4, 0.5, E.outCubic)), lerp(1400, 1070, tw(b, 30.4, 0.5, E.outCubic)), { p: tw(b, 30.4, 0.4, E.outCubic) * (1 - tw(b, 31.7, 0.4, E.outCubic)), press, ripple: M.prog(b, 31.05, 31.8), rippleColor: P.onPine });
      M.typewrite(x, 'mesura.ai', 540, 1262, tw(b, 30.0, 0.8, E.linear), { fam: 'mono', weight: 500, size: 50, color: P.ink, ls: 0.02, t: b * B, align: 'center', cursor: b < 36 });
      M.label(x, 'Link in bio', 540, 1330, { weight: 500, size: 30, color: P.inkMuted, ls: 0.02, align: 'center', upper: false, alpha: tw(b, 30.6, 0.6, E.outCubic) });
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
  cue(20.0, 'sunrise', { gain: 1 });
  hit(20.0, 10, 1.2, 10);
  cue(21.2, 'morph', { dur: 1.0 * B, gain: 0.6 });
  cue(21.7, 'chime', { gain: 1 });
  cue(22.0, 'swipe', { dur: 0.4, gain: 0.3 });
  cue(23.7, 'whoosh', { dur: 0.5, dir: 'up', gain: 0.45 });
  cue(24.0, 'card', { gain: 0.7 });
  cue(24.3, 'swipe', { dur: 0.4, gain: 0.35 });
  for (let i = 0; i < 5; i++) cue(24.2 + i * 0.1, 'tick', { pitch: 1 + i * 0.06, gain: 0.22 });
  cue(25.1, 'measure', { dur: 0.45, gain: 0.8 });
  cue(25.3, 'counter', { dur: 1.1 * B, to: 72, gain: 0.5, step: 2 });
  cue(26.3, 'confirm', { gain: 0.7 });
  cue(28.5, 'whoosh', { dur: 0.5, dir: 'down', gain: 0.45 });
  cue(28.9, 'swipe', { dur: 0.45, gain: 0.4 });
  cue(29.4, 'pop', { gain: 0.7 });
  cue(30.0, 'type', { n: 9, dur: 0.8 * B });
  cue(31.0, 'tap', { gain: 1 });
  cue(31.05, 'confirm', { gain: 0.7 });
  cue(32.75, 'swipe', { dur: 0.45, gain: 0.35 });
  cue(33.1, 'pop', { gain: 0.5, pitch: 0.9 });
  cue(39.1, 'riser', { dur: 0.9 * B, gain: 0.8 });
  cue(39.35, 'whoosh', { dur: 0.6, dir: 'up', gain: 0.7 });

  const S = [[0, 8.0, hookDark], [8.0, 15.7, (c, b) => waffleWorld(c, b)], [15.7, 20, until], [20, 40, finale]];
  function draw(ctx, t) {
    const b = t / B;
    for (const [a, z, fn] of S) if (b >= a && b < z) { fn(ctx, b); break; }
    if (b >= 8.0 && b < 15.7) M.vignette(ctx, 0.35, D.paperSunken, 0.5);
  }
  const BLUR = [[0, 0.7, 12], [2.3, 5.4, 10], [4.5, 5.7, 10], [7.6, 9.2, 10], [11.8, 12.6, 8], [19.8, 22.4, 8],
    [23.6, 25.2, 12], [28.4, 29.6, 12], [39.0, 40, 16]];
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
    K.bg(ctx, D.paper);
    K.activity(ctx, { t: 3.2, n: 150, alpha: 0.9 });
    const Bc = M.block(ctx, { lines: ['Your dashboard', 'tracks everything.', 'Except *this.*'], size: 112, lh: 1.0, x: X0 - 4, y: 300, anchor: 'top' });
    K.markBlock(ctx, Bc, { t: 1, color: D.ink, in: { style: 'none' }, hl: { p: 1, color: D.ochre, text: D.paperSunken, top: 0.98, h: 1.2, padX: 12, r: 10 } });
    ctx.save();
    K.camera(ctx, { s: 0.92, px: 540, py: 1060 });
    K.dashboard(ctx, DASH.x, 700, DASH.w, DASH.h, { T: K.DK, t: 0, ring: 1 });
    ctx.restore();
    M.vignette(ctx, 0.35, D.paperSunken, 0.5);
    M.lockup(ctx, 540, 1590, 58, { align: 'center', color: D.ink, markColor: D.ochre });
  }

  R.define('shadow', { title: 'Shadow AI · 21.6s', duration: DUR, beats: BEATS, draw, blur, post, cues, cover, music: 'shadow' });
})(typeof window !== 'undefined' ? window : globalThis);

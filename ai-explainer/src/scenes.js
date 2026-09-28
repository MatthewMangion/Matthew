/* ==========================================================================
   RAISING AN AI · scene definitions
   All times in seconds. 120 BPM: beat = 0.5 s, bar = 2 s. Groove drops at 3.0.
   ========================================================================== */
(function () {
  'use strict';
  const {
    W, H, TAU, C, Ease, clamp, lerp, inv, tw, keys, spring, wobble, rng, hash1, noise, mix, mixHex, alpha,
    rr, circle, fillCircle, starPath, sparkle, polyline, polyLen, STY, setFont, measure, layout, charXs, drawText, text,
    drawBot, drawPerson, icon, Icon, confetti, burstLines, ring, camera, shake,
  } = M;

  const SCENES = [], CUES = [], OVERLAYS = [];
  const scene = (o) => (SCENES.push(o), o);
  const cue = (t, type, o = {}) => CUES.push(Object.assign({ t: +t.toFixed(4), type }, o));

  const CHAPTERS = [
    { name: 'PREDICT', start: 7, end: 15 },
    { name: 'READ', start: 15, end: 25 },
    { name: 'PRACTICE', start: 25, end: 33 },
    { name: 'MEANING', start: 33, end: 39 },
    { name: 'ATTENTION', start: 39, end: 51 },
    { name: 'MANNERS', start: 51, end: 59 },
    { name: 'THINK', start: 59, end: 65 },
  ];
  const DURATION = 81;

  const BG = [[0, C.cream], [7, C.ink], [15, C.sun], [25, C.cream], [33, C.night], [51, C.mint], [59, C.lilac], [65, C.tomato], [73, C.cream]];
  const bgAt = (T) => { let c = BG[0][1]; for (const [t, col] of BG) if (T >= t) c = col; return c; };
  window.bgAt = bgAt;
  window.postAt = (T) => {
    const bg = bgAt(T);
    const dark = bg === C.night || bg === C.ink;
    return { paper: bg === C.cream ? 0.55 : dark ? 0 : 0.28, grain: dark ? 0.07 : 0.05, vig: dark ? 0.4 : 0.14 };
  };

  /* ---------- shared helpers ---------- */
  const fill = (ctx, col) => { ctx.fillStyle = col; ctx.fillRect(-50, -50, W + 100, H + 100); };
  const blinkAt = (t, times, d = 0.14) => { for (const b of times) { const k = (t - b) / d; if (k >= 0 && k <= 1) return Math.sin(k * Math.PI); } return 0; };

  /* floating doodles used on light scenes */
  function doodles(ctx, t, set, seed = 1, appear = 0) {
    for (let i = 0; i < set.length; i++) {
      const d = set[i];
      const p = Ease.outBack(clamp((t - appear - i * 0.06) / 0.5));
      if (p <= 0) continue;
      const fx = noise(t * 0.35, seed + i * 3) * 18, fy = noise(t * 0.3, seed + i * 5 + 50) * 22;
      const rot = (d.rot || 0) + t * (d.spin || 0.2) * (i % 2 ? 1 : -1) + (d.kick ? wobble(t - d.kick, 2.5, 4) * 0.5 : 0);
      const s = p * (d.s || 1) * (1 + (d.kick ? Math.max(0, wobble(t - d.kick, 2, 5)) * 0.4 : 0));
      ctx.save(); ctx.translate(d.x + fx, d.y + fy); ctx.rotate(rot); ctx.scale(s, s);
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      if (d.k === 'squiggle') {
        ctx.strokeStyle = d.c; ctx.lineWidth = 12; ctx.beginPath();
        for (let k = 0; k <= 30; k++) { const u = k / 30; const x = -70 + u * 140, y = Math.sin(u * TAU * 1.5) * 18; k ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
        ctx.stroke();
      } else if (d.k === 'ring') { ctx.strokeStyle = d.c; ctx.lineWidth = 12; circle(ctx, 0, 0, 34); ctx.stroke(); }
      else if (d.k === 'spark') { sparkle(ctx, 0, 0, 40, d.c); }
      else if (d.k === 'tri') { ctx.fillStyle = d.c; ctx.beginPath(); ctx.moveTo(0, -34); ctx.lineTo(32, 26); ctx.lineTo(-32, 26); ctx.closePath(); ctx.fill(); }
      else if (d.k === 'dot') { fillCircle(ctx, 0, 0, 16, d.c); }
      else if (d.k === 'plus') { ctx.strokeStyle = d.c; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(-24, 0); ctx.lineTo(24, 0); ctx.moveTo(0, -24); ctx.lineTo(0, 24); ctx.stroke(); }
      else if (d.k === 'star') { starPath(ctx, 0, 0, 36, 16, 5, -Math.PI / 2, 4); ctx.fillStyle = d.c; ctx.fill(); }
      ctx.restore();
    }
  }

  /* exact geometry of the "." glyph (for the dot-zoom match cut) */
  const _pm = {};
  function periodMetrics(size) {
    if (_pm[size]) return _pm[size];
    const c = document.createElement('canvas').getContext('2d'); setFont(c, STY.s9, size);
    const m = c.measureText('.');
    return (_pm[size] = { cx: (m.actualBoundingBoxRight - m.actualBoundingBoxLeft) / 2, cy: (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2, r: (m.actualBoundingBoxRight + m.actualBoundingBoxLeft) / 2 + 0.6 });
  }

  /* polygon for a rotated rectangle (used by wipes) */
  function rotRect(ctx, cx, cy, w, h, a) {
    const c = Math.cos(a), s = Math.sin(a), pts = [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]];
    pts.forEach(([x, y], i) => { const X = cx + x * c - y * s, Y = cy + x * s + y * c; i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
    ctx.closePath();
  }
  /* diagonal band wipe: returns a clip function for an incoming scene */
  function bandWipe(t0, dur = 0.45, n = 7, ang = -0.55, dir = 1) {
    return (ctx, T) => {
      if (T >= t0 + dur + n * 0.035) return true;
      const D = 2400, bw = D / n;
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const k = dir > 0 ? i : n - 1 - i;
        const p = Ease.inOutCubic(clamp((T - t0 - k * 0.035) / dur));
        if (p <= 0) continue;
        const off = -D / 2 + bw * (i + 0.5);
        const cx = 540 + Math.cos(ang) * off, cy = 960 + Math.sin(ang) * off;
        rotRect(ctx, cx, cy, bw * p + 1, 3000, ang);
      }
      ctx.clip();
      return true;
    };
  }
  /* circular iris: incoming scene revealed inside a growing circle */
  function iris(t0, dur, x, y, ease = Ease.inOutCubic) {
    return (ctx, T) => {
      const p = ease(clamp((T - t0) / dur));
      if (p >= 1) return true;
      if (p <= 0) return false;
      ctx.beginPath(); ctx.arc(x, y, p * 2300, 0, TAU); ctx.clip();
      return true;
    };
  }
  const talkAmt = (t, ranges) => { for (const [a, b] of ranges) if (t >= a && t <= b) return Math.abs(Math.sin((t - a) * 17)) * 0.8; return 0; };

  /* blinking tomato "blank" (the cursor the viewer fills in) */
  function blank(ctx, x, y, w, h, t, o = {}) {
    const grow = Ease.outBack(clamp((t - (o.at || 0)) / 0.45));
    if (grow <= 0) return;
    const bl = o.noBlink ? 1 : (((t - (o.at || 0)) % 0.5) < 0.32 ? 1 : 0.28);
    const sq = o.squash || 0;
    ctx.save(); ctx.translate(x, y); ctx.scale(1 + sq * 0.1, 1 - sq * 0.45);
    ctx.globalAlpha *= bl;
    ctx.fillStyle = o.color || C.tomato;
    rr(ctx, -w / 2 * grow, -h / 2, w * grow, h, 14); ctx.fill();
    ctx.restore();
  }

  /* ==========================================================================
     S1 · HOOK (0 – 7)
     ========================================================================== */
  {
    const L1 = () => layout('Go brush', { size: 196, style: 's9' });
    const L2 = () => layout('your', { size: 196, style: 's9' });
    const L3 = () => layout('teeth.', { size: 196, style: 's9', color: C.tomato });
    const LE = () => layout('PARENTS, FINISH THIS SENTENCE ↓', { size: 44, style: 'mo', color: C.cream, maxW: 2000, ws: 0 });
    const LC = () => layout('Congrats.', { size: 180, style: 'si', color: C.tomato });
    const LD = () => layout('You just did\n{exactly|si,cobalt} what\nChatGPT does.', { size: 124, style: 's9', lh: 122 });
    const doodleSet = [
      { k: 'squiggle', x: 170, y: 430, c: C.tomato, rot: -0.3, kick: 3.0 },
      { k: 'ring', x: 925, y: 470, c: C.cobalt, kick: 3.0 },
      { k: 'spark', x: 900, y: 1330, c: C.sun, s: 1.2, kick: 3.0 },
      { k: 'tri', x: 150, y: 1290, c: C.mint, rot: 0.4, kick: 3.0 },
      { k: 'plus', x: 960, y: 900, c: C.pink, kick: 3.0 },
      { k: 'dot', x: 110, y: 860, c: C.sun, kick: 3.0 },
    ];
    const Y1 = 770, Y2 = 950, Y3 = 1130;
    const SLAM = 3.0;

    scene({
      id: 'hook', start: 0, end: 7.02,
      draw(ctx, t) {
        fill(ctx, C.cream);
        // dot-zoom end transition, pivot on the final period of "does."
        const LDl = LD();
        const lastLine = LDl.lines[LDl.lines.length - 1];
        const g = lastLine.groups[lastLine.groups.length - 1];
        const pc = g.pieces[g.pieces.length - 1];
        const xs = charXs(pc, LDl.size);
        const pm = periodMetrics(LDl.size);
        const dotX = 540 + g.gx + pc.x + xs[pc.text.length - 1] + pm.cx;
        const dotY = 860 + lastLine.y - pm.cy;
        const zp = Ease.inExpo(clamp((t - 6.3) / 0.7));
        const zoom = 1 + zp * 140;

        ctx.save();
        const sh = shake(t, [[SLAM, 1.3], [3.86, 0.35]], 28);
        const push = keys(t, [[0.5, 1], [2.9, 1.075, Ease.inOutQuad], [3.05, 1.0, Ease.outCubic]]);
        camera(ctx, { zoom: push, px: 540, py: 960, x: sh.x, y: sh.y, rot: sh.rot });
        const zm = Ease.inOutCubic(clamp((t - 6.2) / 0.62));
        if (zoom > 1 || zm > 0) camera(ctx, { zoom, px: dotX, py: dotY, x: (540 - dotX) * zm, y: (960 - dotY) * zm, rot: zp * 0.25 });

        // shockwave behind the slam
        if (t > SLAM && t < SLAM + 0.9) {
          const p = Ease.outCubic((t - SLAM) / 0.9);
          ctx.save(); ctx.globalAlpha = (1 - p) * 0.9; fillCircle(ctx, 540, Y3 - 70, 60 + p * 900, alpha(C.sun, 0.55)); ctx.restore();
        }
        doodles(ctx, t, doodleSet, 3, 0.05);

        // --- part 1: Go brush your ▮
        const ep = Ease.outBack(clamp((t - 0.02) / 0.4)), eq = Ease.inBack(clamp((t - 3.62) / 0.3));
        if (ep > 0 && eq < 1) {
          const LEl = LE(); const pw = LEl.width + 64;
          ctx.save(); ctx.translate(540, 552); ctx.scale(ep * (1 - eq), ep * (1 - eq)); ctx.rotate(-0.02);
          ctx.fillStyle = C.tomato; rr(ctx, -pw / 2, -40, pw, 80, 40); ctx.fill();
          ctx.restore();
          drawText(ctx, LEl, 540, 552 - 30, { T: t, at: 0.18, anim: 'type', per: 'char', stagger: 0.02, out: { at: 3.62, anim: 'fadeOut', stagger: 0, dur: 0.15 } });
        }
        drawText(ctx, L1(), 540, Y1 - 150, { T: t, at: -0.12, anim: 'slam', stagger: 0.2, dur: 0.26, out: { at: 3.72, anim: 'riseOut', stagger: 0.04, dur: 0.4 } });
        drawText(ctx, L2(), 540, Y2 - 150, { T: t, at: 0.28, anim: 'slam', dur: 0.26, out: { at: 3.78, anim: 'riseOut', dur: 0.4 } });
        if (t < SLAM) {
          const sq = Ease.inQuad(clamp((t - 2.72) / 0.28));
          blank(ctx, 540, Y3 - 64, measure('teeth.', STY.s9, 196) + 10, 150, t, { at: 0.55, squash: sq });
        }
        // the answer
        const L3l = L3();
        drawText(ctx, L3l, 540, Y3 - 150, { T: t, at: SLAM, anim: 'slam', per: 'word', dur: 0.24, out: { at: 3.84, anim: 'riseOut', dur: 0.4 } });
        burstLines(ctx, t - SLAM, { x: 540, y: Y3 - 70, r0: 330, len: 170, n: 16, lw: 12, color: C.ink, dur: 0.5, seed: 9 });
        // tooth pal
        const tp = Ease.outBack(clamp((t - SLAM - 0.12) / 0.5));
        const tq = Ease.inBack(clamp((t - 3.7) / 0.35));
        if (tp > 0 && tq < 1) {
          const bob = Math.sin((t - SLAM) * 5) * 8;
          icon(ctx, 'tooth', 880, Y3 - 280 + bob, 1.35 * tp * (1 - tq), 0.25 + wobble(t - SLAM - 0.12, 2.5, 3) * 0.6);
          sparkle(ctx, 950, Y3 - 360 + bob, 22 * tp * (1 - tq) * (0.7 + 0.3 * Math.sin(t * 12)), C.sun, t * 2);
          sparkle(ctx, 815, Y3 - 350 + bob, 14 * tp * (1 - tq), C.tomato, -t * 2);
        }
        // handwritten nudge
        const np = Ease.outBack(clamp((t - 1.25) / 0.45)), nq = clamp((t - 2.85) / 0.2);
        if (np > 0 && nq < 1) {
          ctx.save(); ctx.globalAlpha *= 1 - nq;
          ctx.translate(610, 1335); ctx.rotate(-0.06); ctx.scale(np, np);
          text(ctx, 'psst… you know this one', 0, 0, 'hd', 60, C.ink);
          ctx.restore();
          const ap = Ease.inOutCubic(clamp((t - 1.45) / 0.45));
          ctx.save(); ctx.globalAlpha *= 1 - nq; ctx.strokeStyle = C.ink; ctx.lineWidth = 6; ctx.lineCap = 'round';
          const pts = []; for (let k = 0; k <= 24; k++) { const u = k / 24; pts.push([lerp(330, 300, u) + Math.sin(u * 3) * -40, lerp(1300, 1175, u)]); }
          const len = polyLen(pts); ctx.setLineDash([len * ap, len]); polyline(ctx, pts); ctx.stroke(); ctx.setLineDash([]);
          if (ap > 0.95) { const e = pts[pts.length - 1]; ctx.beginPath(); ctx.moveTo(e[0] - 22, e[1] + 14); ctx.lineTo(e[0], e[1]); ctx.lineTo(e[0] + 20, e[1] + 18); ctx.stroke(); }
          ctx.restore();
        }

        // --- part 2: Congrats. You just did exactly what ChatGPT does.
        drawText(ctx, LC(), 540, 640, { T: t, at: 3.95, anim: 'pop', per: 'char', stagger: 0.035, dur: 0.5 });
        drawText(ctx, LDl, 540, 860, { T: t, at: 4.35, anim: 'rise', per: 'word', stagger: 0.11, dur: 0.6 });
        // Bub peeks in from the bottom edge
        const peek = keys(t, [[5.55, 0], [5.95, 1, Ease.outBack], [6.25, 1], [6.5, 0, Ease.inBack]]);
        if (peek > 0) drawBot(ctx, { x: 820, y: 2080 - peek * 330, s: 0.95, t, look: { x: -0.7, y: -0.9 }, blink: blinkAt(t, [6.0]), rot: -0.15, shadow: false });
        // the period we fly into
        if (zp > 0) fillCircle(ctx, dotX, dotY, pm.r, C.ink);
        ctx.restore();

        // confetti rides above the camera shake
        confetti(ctx, t - SLAM, { x: 540, y: Y3 - 80, n: 110, speed: 2200, spread: TAU, seed: 4, g: 1700, drag: 2.6, size: 20, life: 2.6 });
        if (zp > 0.6) { ctx.fillStyle = alpha(C.ink, clamp((zp - 0.6) / 0.25)); ctx.fillRect(0, 0, W, H); }
      },
    });
    cue(0.0, 'hit', { v: 0.8 }); cue(0.2, 'hit', { v: 0.7 }); cue(0.4, 'hit', { v: 0.75 }); cue(0.0, 'pop', { n: 0, v: 0.6 }); cue(0.2, 'pop', { n: 1, v: 0.6 }); cue(0.4, 'pop', { n: 2, v: 0.6 });
    cue(0.55, 'swipe');
    cue(0.15, 'type', { dur: 0.65 });
    [1.05, 1.55, 2.05, 2.55].forEach((x) => cue(x, 'tick'));
    cue(1.3, 'scribble', { dur: 0.5 });
    cue(2.0, 'riser', { dur: 1.0 });
    cue(SLAM, 'impact', { size: 1.2 }); cue(SLAM, 'confetti');
    cue(3.72, 'whoosh', { dur: 0.35, dir: 'up' });
    cue(3.95, 'chime');
    cue(5.55, 'boing'); cue(6.25, 'whoosh', { dur: 0.25 });
    cue(6.3, 'suck', { dur: 0.72 });
  }

  /* ==========================================================================
     S2 · PREDICT (7 – 15) · ink
     ========================================================================== */
  {
    const LA = () => layout('AI chatbots have one job:', { size: 62, style: 's7', color: '#BDB4A6' });
    const LB = () => layout('Guess the\n{next word.|si,sun,u}', { size: 158, style: 's9', color: C.cream, lh: 150 });
    const SENT = 'Go brush your teeth, put on your pajamas, and get into bed.';
    const LS = () => layout(SENT, { size: 64, style: 's7', color: C.ink, maxW: 740, align: 'left', lh: 78 });
    const TYPE0 = 9.05, FLY = 11.02, LAND = 11.36, CH0 = 11.75, STEP = 0.25;
    const wt = [TYPE0, TYPE0 + 0.13, TYPE0 + 0.26, LAND];
    for (let k = 0; k < 8; k++) wt.push(CH0 + k * STEP + 0.1);
    const ROWS1 = [['teeth', 92], ['hair', 5], ['shoes', 2], ['dog', 1]];
    const CHAIN = [
      [['put', 41], ['and', 30], ['then', 18]],
      [['on', 88], ['away', 7], ['in', 3]],
      [['your', 90], ['some', 6], ['the', 3]],
      [['pajamas', 72], ['PJs', 15], ['shoes', 9]],
      [['and', 80], ['then', 14], ['grab', 4]],
      [['get', 64], ['hop', 22], ['jump', 9]],
      [['into', 91], ['in', 6], ['to', 2]],
      [['bed', 95], ['the', 3], ['trouble', 1]],
    ];
    const BX = 110, BW = 860, BT = 560, PADX = 44, PADY = 38;
    const ROWH = 92;

    function bubbleShape(ctx, x, y, w, h, tailX, tailDir = 1) {
      const r = 44;
      ctx.beginPath();
      ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.lineTo(tailX + 40, y + h); ctx.lineTo(tailX + 10 * tailDir, y + h + 46); ctx.lineTo(tailX - 10, y + h);
      ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
    }

    scene({
      id: 'predict', start: 7, end: 15.2,
      draw(ctx, t) {
        fill(ctx, C.ink);
        // atmosphere: warm glow + drifting dot grid
        const gl = ctx.createRadialGradient(540, 1150, 50, 540, 1150, 1100);
        gl.addColorStop(0, 'rgba(46,75,255,0.22)'); gl.addColorStop(1, 'rgba(46,75,255,0)');
        ctx.fillStyle = gl; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = 'rgba(244,237,225,0.07)';
        const off = (t * 12) % 60;
        for (let y = -60 + off; y < H + 60; y += 60) for (let x = 30; x < W; x += 60) { ctx.fillRect(x - 2, y - 2, 4, 4); }

        // headline: "AI chatbots have one job:" -> "Guess the next word." -> shrinks to top
        drawText(ctx, LA(), 540, 405, { T: t, at: 7.15, anim: 'rise', stagger: 0.05, out: { at: 8.9, anim: 'fadeOut', dur: 0.25 } });
        const e = Ease.swift(clamp((t - 8.92) / 0.55));
        ctx.save();
        ctx.translate(540, lerp(510, 318, e)); ctx.scale(lerp(1, 0.56, e), lerp(1, 0.56, e));
        drawText(ctx, LB(), 0, 0, { T: t, at: 7.75, anim: 'slam', per: 'word', stagger: 0.14, dur: 0.3, decoAt: 8.45 });
        ctx.restore();

        // --- chat bubble with the growing sentence
        const Ls = LS();
        const vis = (i) => t >= wt[i];
        let lastVis = -1; for (let i = 0; i < wt.length; i++) if (vis(i)) lastVis = i;
        const bubIn = Ease.outBack(clamp((t - 8.95) / 0.45));
        // grow by lines
        const lineOf = (i) => Ls.units[i].line;
        const lineTimes = []; for (let i = 0; i < wt.length; i++) { const l = lineOf(i); if (lineTimes[l] == null) lineTimes[l] = wt[i]; }
        let bh = PADY * 2 + 64 * 1.02;
        for (let l = 1; l < lineTimes.length; l++) bh += Ls.lh * Ease.outBack(clamp((t - lineTimes[l] + 0.02) / 0.3));
        if (bubIn > 0) {
          ctx.save(); ctx.translate(540, BT + bh / 2); ctx.scale(bubIn, bubIn); ctx.translate(-540, -(BT + bh / 2));
          ctx.fillStyle = 'rgba(0,0,0,0.35)'; bubbleShape(ctx, BX + 10, BT + 14, BW, bh, 470); ctx.fill();
          ctx.fillStyle = C.cream; bubbleShape(ctx, BX, BT, BW, bh, 470); ctx.fill();
          drawText(ctx, Ls, BX + PADX, BT + PADY - 6, {
            anim: 'none', t: 99,
            unitFx: (i) => {
              const k = t - wt[i]; if (k < 0) return { a: 0 };
              return { s: lerp(0.4, 1, Ease.outBack(clamp(k / 0.2))), a: clamp(k / 0.05), color: k < 0.35 && i >= 3 ? mix(C.cobalt, C.ink, clamp(k / 0.35)) : null };
            },
          });
          // cursor after the last visible word
          if (t < 14.2) {
            const u = Ls.units[Math.max(0, lastVis)];
            const ln = Ls.lines[u.line];
            const cx = BX + PADX + u.gx + u.w + 12, cy = BT + PADY - 6 + ln.y;
            const on = ((t * 2) % 1) < 0.62 ? 1 : 0.25;
            ctx.fillStyle = alpha(C.tomato, on); rr(ctx, cx, cy - 50, 30, 58, 6); ctx.fill();
          }
          ctx.restore();
        }

        // --- probability panel
        const PT = BT + bh + 50;
        const panelIn = clamp((t - 9.3) / 0.3);
        if (panelIn > 0 && t < 14.9) {
          const chainK = Math.floor((t - CH0) / STEP);
          const inChain = t >= CH0;
          const k = clamp(chainK, 0, CHAIN.length - 1);
          const u = inChain ? clamp((t - CH0 - k * STEP) / 0.14) : 0;
          const rows = inChain ? CHAIN[k] : ROWS1;
          const prev = inChain ? (k === 0 ? ROWS1 : CHAIN[k - 1]) : ROWS1;
          const nRows = inChain ? 3 : 4;
          const panelOut = Ease.inBack(clamp((t - 14.1) / 0.35));
          for (let r = 0; r < 4; r++) {
            if (r >= nRows && !(inChain && t < CH0 + 0.2)) continue;
            const rowFade = r === 3 && inChain ? 1 - clamp((t - CH0) / 0.2) : 1;
            const rin = Ease.snap(clamp((t - 9.32 - r * 0.08) / 0.5));
            if (rin <= 0) continue;
            const y = PT + r * ROWH + (1 - rin) * 60 + panelOut * (400 + r * 60);
            ctx.save(); ctx.globalAlpha *= rin * rowFade * (1 - panelOut);
            // bar value
            const grow = Ease.outExpo(clamp((t - 9.55 - r * 0.09) / 0.8));
            let v = (rows[r] ? rows[r][1] : 0);
            if (inChain) v = lerp(prev[r] ? prev[r][1] : 0, v, Ease.outCubic(u)); else v *= grow;
            const top = r === 0;
            // highlight flash for the chosen word
            const flashT = inChain ? t - (CH0 + k * STEP + 0.08) : t - FLY;
            const flash = flashT > 0 && flashT < 0.35 && top ? 1 - flashT / 0.35 : 0;
            if (flash > 0) { ctx.fillStyle = alpha(C.sun, 0.3 * flash); rr(ctx, BX - 10, y - 38, BW + 20, 80, 22); ctx.fill(); }
            // label (with roll when the word changes)
            const drawLabel = (word, dy, al) => {
              ctx.save(); ctx.globalAlpha *= al;
              setFont(ctx, STY.s8, 58); ctx.fillStyle = top ? C.sun : C.cream; ctx.textAlign = 'left';
              ctx.fillText(word, BX + 16, y + 20 + dy); ctx.restore();
            };
            ctx.save(); ctx.beginPath(); ctx.rect(BX, y - 44, 330, 86); ctx.clip();
            const hideFly = !inChain && top && t >= FLY;
            if (!hideFly) {
              if (inChain && u < 1 && prev[r] && !(k === 0 && r === 0)) drawLabel(prev[r][0], -60 * Ease.inCubic(u), 1 - u);
              drawLabel(rows[r] ? rows[r][0] : '', inChain ? 60 * (1 - Ease.outCubic(u)) : 0, inChain ? u : 1);
            }
            ctx.restore();
            // bar track + fill
            const bx = 390, bw = 420;
            ctx.fillStyle = 'rgba(244,237,225,0.10)'; rr(ctx, bx, y - 24, bw, 48, 24); ctx.fill();
            const fw = Math.max(48 * Math.min(1, v * 4), bw * v / 100);
            if (v > 0.05) { ctx.fillStyle = top ? C.sun : 'rgba(244,237,225,0.45)'; rr(ctx, bx, y - 24, fw, 48, 24); ctx.fill(); }
            // percent
            setFont(ctx, STY.mo, 46); ctx.textAlign = 'right'; ctx.fillStyle = top ? C.sun : 'rgba(244,237,225,0.7)';
            ctx.fillText(Math.round(v) + '%', BX + BW - 6, y + 16);
            ctx.restore();
          }
          // "teeth" flies from the panel into the bubble
          if (t >= FLY && t < LAND + 0.02) {
            const p = Ease.inOutCubic(clamp((t - FLY) / (LAND - FLY)));
            const tu = Ls.units[3], tl = Ls.lines[tu.line];
            const x0 = BX + 16, y0 = PT + 20, x1 = BX + PADX + tu.gx, y1 = BT + PADY - 6 + tl.y;
            const x = lerp(x0, x1, p) + Math.sin(p * Math.PI) * 60, y = lerp(y0, y1, p) - Math.sin(p * Math.PI) * 50;
            ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(p * Math.PI) * -0.12); const sc = lerp(58, 64, p) / 58 * (1 + Math.sin(p * Math.PI) * 0.35);
            ctx.scale(sc, sc); setFont(ctx, STY.s8, 58); ctx.fillStyle = mix(C.sun, C.cobalt, p); ctx.textAlign = 'left'; ctx.fillText('teeth', 0, 0); ctx.restore();
          }
        }

        // --- Bub
        const enter = spring(t - 7.0, 1.5, 0.45);
        const hop = t > 13.95 ? Math.max(0, Math.sin(clamp((t - 13.95) / 0.45) * Math.PI)) * 90 : 0;
        const happy = t > 13.9 && t < 14.9;
        const lookY = t < 8.9 ? -0.85 : -1;
        const lookX = t > CH0 && t < 13.9 ? Math.sin((t - CH0) * 5) * 0.5 : 0;
        drawBot(ctx, {
          x: 540, y: lerp(2250, 1480, enter), s: 0.9, t, lift: hop,
          sq: 1 + wobble(t - 7.45, 2.2, 5) * 0.12 + wobble(t - 14.4, 3, 6) * 0.15,
          look: { x: lookX, y: lookY }, blink: blinkAt(t, [8.4, 10.3, 12.9]),
          eyes: happy ? 'happy' : null, mouth: happy ? 'open' : 'smile', talk: talkAmt(t, [[9.02, 9.45], [11.75, 13.85]]),
          antWob: wobble(t - 7.45, 3, 4) * 0.5, shadowCol: '#000', shadowA: 1.6,
        });

        // handwritten aside
        const np = Ease.outBack(clamp((t - 11.95) / 0.45)), nq = clamp((t - 14.3) / 0.25);
        if (np > 0 && nq < 1) {
          ctx.save(); ctx.globalAlpha *= 1 - nq; ctx.translate(850, 1390); ctx.rotate(-0.09); ctx.scale(np, np);
          text(ctx, 'one word', 0, 0, 'hd', 62, C.sun); text(ctx, 'at a time!', 0, 74, 'hd', 62, C.sun);
          ctx.restore();
        }
        // sparkles when the sentence completes
        if (t > 13.9) for (let i = 0; i < 6; i++) {
          const a = i / 6 * TAU + 0.4, p = clamp((t - 13.9 - i * 0.03) / 0.5);
          if (p > 0 && p < 1) sparkle(ctx, 540 + Math.cos(a) * (180 + p * 120), 1330 + Math.sin(a) * (120 + p * 90), 26 * Math.sin(p * Math.PI), i % 2 ? C.sun : C.cream, p * 3);
        }
      },
    });
    cue(7.0, 'whoosh', { dur: 0.4, dir: 'up' }); cue(7.42, 'boing');
    cue(7.75, 'hit'); cue(7.89, 'hit', { v: 0.7 });
    cue(8.45, 'scribble', { dur: 0.4 });
    cue(8.92, 'swoosh', { dur: 0.45 });
    cue(9.05, 'type', { dur: 0.4 });
    [0, 1, 2, 3].forEach((r) => cue(9.34 + r * 0.08, 'tick', { v: 0.6 }));
    cue(9.55, 'bars', { dur: 0.8 });
    cue(FLY, 'select'); cue(FLY + 0.02, 'whoosh', { dur: 0.3, v: 0.6 }); cue(LAND, 'pop', { n: 4 });
    for (let k = 0; k < 8; k++) cue(CH0 + k * STEP + 0.1, 'blip', { n: k });
    cue(13.9, 'ding'); cue(13.95, 'sparkle');
  }

  /* ==========================================================================
     S3 · READ (15 – 25) · sun
     ========================================================================== */
  {
    const CX = 540, CY = 1250;
    const LQ = () => layout('How does it know\nwhat comes {next?|si,tomato}', { size: 104, style: 's9', lh: 104 });
    const LR = () => layout('It read.', { size: 214, style: 's9' });
    const LL = () => layout('A lot.', { size: 250, style: 'si', color: C.tomato });
    const FLIP = ['Books', 'Websites', 'Encyclopedias', 'Recipes', 'News', 'Poems', 'Forums', 'Everything.'];
    const LO1 = () => layout("That's over", { size: 66, style: 's7' });
    const NUM = '10,000,000,000,000+';
    const LW = () => layout('words.', { size: 200, style: 'si', color: C.tomato });
    const LY1 = () => layout('Reading 24/7, nonstop,\nthat would take you', { size: 66, style: 's7', lh: 76 });
    const LY2 = () => layout('75,000+', { size: 220, style: 's9' });
    const LY3 = () => layout('years.', { size: 210, style: 'si', color: C.tomato });
    const LK = () => layout('Meanwhile, your toddler\nlearned to talk on {WAY|u,tomato} less.', { size: 70, style: 'hd', lh: 84 });
    const LK2 = () => layout('(kids are the real geniuses)', { size: 56, style: 'hd', color: C.cobalt });

    const R = rng(2024), CARDS = [];
    const NC = 150;
    for (let i = 0; i < NC; i++) {
      CARDS.push({
        ts: 16.45 + (i / NC) * 4.5 + R() * 0.06, life: 1.15 + R() * 0.65, a0: R() * TAU, r0: 1100 + R() * 300,
        spin: 2.0 + R() * 1.8, type: Math.floor(R() * 5), col: [C.tomato, C.cobalt, C.mint, C.pink, C.lilac, C.paper][Math.floor(R() * 6)],
        rot0: R() * TAU, rs: (R() - 0.5) * 7, s: 0.75 + R() * 0.55, seed: Math.floor(R() * 1000),
      });
    }
    function drawCard(ctx, c) {
      ctx.lineWidth = 5; ctx.strokeStyle = C.ink; ctx.lineJoin = 'round';
      const R2 = rng(c.seed);
      if (c.type === 0) { // book
        rr(ctx, -55, -75, 110, 150, 8); ctx.fillStyle = c.col === C.paper ? C.cobalt : c.col; ctx.fill(); ctx.stroke();
        ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(-55, -75, 16, 150);
        ctx.fillStyle = 'rgba(255,255,255,0.85)'; rr(ctx, -26, -48, 64, 12, 6); ctx.fill(); rr(ctx, -26, -28, 44, 10, 5); ctx.fill();
      } else if (c.type === 1) { // page
        rr(ctx, -58, -76, 116, 152, 6); ctx.fillStyle = C.paper; ctx.fill(); ctx.stroke();
        ctx.fillStyle = 'rgba(21,18,15,0.35)';
        for (let k = 0; k < 7; k++) rr(ctx, -40, -54 + k * 18, 80 * (0.5 + R2() * 0.5), 7, 3.5), ctx.fill();
      } else if (c.type === 2) { // browser window
        rr(ctx, -85, -60, 170, 120, 10); ctx.fillStyle = C.paper; ctx.fill(); ctx.stroke();
        ctx.fillStyle = C.ink; rr(ctx, -85, -60, 170, 24, 10); ctx.fill();
        [C.tomato, C.sun, C.mint].forEach((cc, k) => fillCircle(ctx, -68 + k * 14, -48, 4.5, cc));
        ctx.fillStyle = c.col === C.paper ? C.lilac : c.col; rr(ctx, -70, -26, 60, 70, 6); ctx.fill();
        ctx.fillStyle = 'rgba(21,18,15,0.3)'; for (let k = 0; k < 4; k++) rr(ctx, 0, -22 + k * 17, 64 * (0.5 + R2() * 0.5), 7, 3.5), ctx.fill();
      } else if (c.type === 3) { // sticky note
        ctx.fillStyle = c.col === C.paper ? C.sun : c.col; rr(ctx, -60, -60, 120, 120, 6); ctx.fill(); ctx.stroke();
        ctx.fillStyle = 'rgba(21,18,15,0.35)'; for (let k = 0; k < 4; k++) rr(ctx, -40, -34 + k * 20, 80 * (0.4 + R2() * 0.6), 8, 4), ctx.fill();
      } else { // chat bubble
        rr(ctx, -70, -45, 140, 80, 30); ctx.fillStyle = C.paper; ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-30, 35); ctx.lineTo(-44, 58); ctx.lineTo(-8, 35); ctx.fillStyle = C.paper; ctx.fill(); ctx.stroke();
        ctx.fillStyle = 'rgba(21,18,15,0.35)'; rr(ctx, -46, -20, 92, 9, 4.5); ctx.fill(); rr(ctx, -46, 0, 60, 9, 4.5); ctx.fill();
      }
    }
    let odoCanvas = null;
    function odometer(ctx, str, cx, top, size, t, t0) {
      if (!odoCanvas) { odoCanvas = document.createElement('canvas'); odoCanvas.width = W; odoCanvas.height = 150; }
      const o = odoCanvas.getContext('2d');
      o.setTransform(1, 0, 0, 1, 0, 0); o.globalCompositeOperation = 'source-over'; o.clearRect(0, 0, W, 150);
      const st = STY.mo8; setFont(o, st, size);
      const cw = o.measureText('0').width;
      const tot = cw * str.length; const x0 = cx - tot / 2;
      const lh = size * 0.86 * 1.18, base = 18 + size * 0.86 * 0.86;
      o.textAlign = 'left';
      let di = 0;
      for (let i = 0; i < str.length; i++) {
        const ch = str[i], x = x0 + i * cw;
        if (ch >= '0' && ch <= '9') {
          const d = +ch;
          const p = Ease.outCubic(clamp((t - t0 - di * 0.03) / 0.85)); di++;
          const spins = 2 + (str.length - i) * 0.5;
          const v = d - (1 - p) * spins * 10;
          const b = Math.floor(v);
          for (let k = -1; k < 2; k++) {
            const n = b + k, digit = ((n % 10) + 10) % 10;
            o.fillStyle = p >= 1 ? C.ink : C.ink;
            o.fillText(String(digit), x, base + (n - v) * lh);
          }
        } else {
          const a = ch === '+' ? clamp((t - t0 - 0.95) / 0.2) : 1;
          o.save(); o.globalAlpha = a; o.fillStyle = ch === '+' ? C.tomato : C.ink;
          const k = ch === '+' ? 1 + wobble(t - t0 - 0.95, 3, 5) * 0.5 : 1;
          o.translate(x + cw / 2, base - size * 0.3); o.scale(k, k); o.fillText(ch, -cw / 2, size * 0.3); o.restore();
        }
      }
      o.globalCompositeOperation = 'destination-in';
      const g = o.createLinearGradient(0, 0, 0, 150);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.2, 'rgba(0,0,0,1)'); g.addColorStop(0.8, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      o.fillStyle = g; o.fillRect(0, 0, W, 150);
      ctx.drawImage(odoCanvas, 0, top - 18);
    }

    scene({
      id: 'read', start: 14.55, end: 25.02, clip: bandWipe(14.55, 0.42, 7, -0.55),
      draw(ctx, t) {
        fill(ctx, C.sun);
        // slow sunburst
        ctx.save(); ctx.translate(CX, CY); ctx.rotate(t * 0.12);
        ctx.fillStyle = '#FFD363';
        for (let i = 0; i < 18; i++) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 2400, (i / 18) * TAU, ((i + 0.5) / 18) * TAU); ctx.closePath(); ctx.fill(); }
        ctx.restore();
        const vg = ctx.createRadialGradient(CX, CY, 100, CX, CY, 1300); vg.addColorStop(0, 'rgba(255,197,61,0)'); vg.addColorStop(1, 'rgba(255,170,30,0.55)');
        ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
        // page-turn parallax when S4 slides in
        const pt = Ease.inOutCubic(clamp((t - 24.5) / 0.5));
        ctx.save(); ctx.translate(-pt * 260, 0);
        const sh = shake(t, [[16.02, 0.7], [16.47, 0.9]], 20);
        ctx.translate(sh.x, sh.y);

        // vortex of everything ever written
        const speedUp = t > 19 && t < 21 ? 1 : 0;
        for (const c of CARDS) {
          const u = (t - c.ts) / c.life; if (u <= 0 || u >= 1) continue;
          const ease = Math.pow(u, 1.15);
          const r = c.r0 * Math.pow(1 - ease, 1.5);
          const th = c.a0 + c.spin * ease * (1 + ease);
          const x = CX + Math.cos(th) * r, y = CY - 40 + Math.sin(th) * r * 0.92;
          const sc = c.s * lerp(1, 0.12, Math.pow(ease, 1.8));
          ctx.save(); ctx.translate(x, y); ctx.rotate(c.rot0 + c.rs * u); ctx.scale(sc, sc);
          ctx.globalAlpha *= 1 - clamp((u - 0.88) / 0.12);
          drawCard(ctx, c); ctx.restore();
        }
        void speedUp;

        // Bub, reading everything
        const reading = t > 16.4 && t < 21.1;
        const dizzy = t > 20.15 && t < 21.1;
        const tired = t > 21.1 && t < 22.85;
        const shiftX = Ease.inOutCubic(clamp((t - 22.8) / 0.5)) * 200;
        const intake = reading ? Math.max(0, Math.sin(t * 22)) * 0.035 : 0;
        const bIn = Ease.outBack(clamp((t - 15.0) / 0.5));
        drawBot(ctx, {
          x: CX + shiftX, y: CY, s: 1.05 * bIn, t, sq: 1 + intake + wobble(t - 16.45, 2.5, 4) * 0.08,
          glasses: Ease.outBounce(clamp((t - 16.2) / 0.45)),
          look: reading ? { x: Math.sin(t * 10.5) * 0.9, y: 0.15 } : t > 23 ? { x: -1, y: 0.3 } : { x: 0, y: -0.6 },
          blink: tired ? 0.55 : blinkAt(t, [15.9, 23.6]), eyes: dizzy ? 'spin' : null,
          mouth: reading && !dizzy ? 'o' : tired ? 'flat' : 'smile',
          antWob: reading ? Math.sin(t * 17) * 0.15 : 0,
        });

        // headline beats
        drawText(ctx, LQ(), 540, 395, { T: t, at: 15.05, anim: 'rise', stagger: 0.06, out: { at: 15.78, dur: 0.26, stagger: 0.015 } });
        drawText(ctx, LR(), 540, 330, { T: t, at: 16.05, anim: 'slam', stagger: 0.16, dur: 0.24, out: { at: 18.85, dur: 0.3 } });
        drawText(ctx, LL(), 540, 545, { T: t, at: 16.45, anim: 'pop', per: 'char', stagger: 0.04, dur: 0.45, out: { at: 18.9, anim: 'riseOut', dur: 0.3 },
          unitFx: (i) => ({ rot: Math.sin(t * 5 + i) * 0.04 }) });

        // flipper pill: all the things it read
        const fIn = Ease.outBack(clamp((t - 16.85) / 0.4)), fOut = Ease.inBack(clamp((t - 18.85) / 0.3));
        if (fIn > 0 && fOut < 1) {
          const idx = clamp(Math.floor((t - 16.9) / 0.25), 0, FLIP.length - 1);
          const u = clamp((t - 16.9 - idx * 0.25) / 0.12);
          const wNow = measure(FLIP[idx], STY.s9, 84) + 90, wPrev = idx > 0 ? measure(FLIP[idx - 1], STY.s9, 84) + 90 : wNow;
          const pw = lerp(wPrev, wNow, Ease.outBack(u));
          const last = idx === FLIP.length - 1;
          ctx.save(); ctx.translate(540, 860); ctx.scale(fIn * (1 - fOut) * (last ? 1 + wobble(t - 18.65, 3, 5) * 0.15 : 1), fIn * (1 - fOut));
          ctx.fillStyle = last ? C.ink : C.paper; rr(ctx, -pw / 2, -62, pw, 124, 62); ctx.fill();
          ctx.lineWidth = 6; ctx.strokeStyle = C.ink; ctx.stroke();
          ctx.save(); rr(ctx, -pw / 2, -62, pw, 124, 62); ctx.clip();
          setFont(ctx, STY.s9, 84); ctx.textAlign = 'center';
          if (idx > 0 && u < 1) { ctx.fillStyle = C.ink; ctx.fillText(FLIP[idx - 1], 0, 30 - Ease.inCubic(u) * 110); }
          ctx.fillStyle = last ? C.sun : C.ink; ctx.fillText(FLIP[idx], 0, 30 + (1 - Ease.outCubic(u)) * 110);
          ctx.restore(); ctx.restore();
        }

        // odometer: 10 trillion+ words
        drawText(ctx, LO1(), 540, 345, { T: t, at: 18.95, anim: 'rise', out: { at: 21.1, dur: 0.3 } });
        const oIn = clamp((t - 19.0) / 0.2), oOut = Ease.inQuad(clamp((t - 21.12) / 0.3));
        if (oIn > 0 && oOut < 1) {
          ctx.save(); ctx.globalAlpha *= oIn * (1 - oOut); ctx.translate(0, -oOut * 120);
          odometer(ctx, NUM, 540, 440, 96, t, 19.0);
          ctx.restore();
        }
        drawText(ctx, LW(), 540, 590, { T: t, at: 19.85, anim: 'pop', per: 'char', stagger: 0.04, out: { at: 21.15, dur: 0.3 } });

        // 75,000+ years
        drawText(ctx, LY1(), 540, 330, { T: t, at: 21.35, anim: 'rise', stagger: 0.05, out: { at: 22.85, dur: 0.3 } });
        drawText(ctx, LY2(), 540, 500, { T: t, at: 21.72, anim: 'slam', per: 'char', stagger: 0.05, dur: 0.24, out: { at: 22.9, dur: 0.3 } });
        drawText(ctx, LY3(), 540, 700, { T: t, at: 22.05, anim: 'pop', per: 'char', stagger: 0.04, out: { at: 22.95, dur: 0.3 } });
        const hgIn = Ease.outBack(clamp((t - 22.0) / 0.4)), hgOut = Ease.inBack(clamp((t - 22.9) / 0.3));
        if (hgIn > 0 && hgOut < 1) {
          const flips = Math.floor(clamp((t - 22.2) / 0.5, 0, 3));
          const fr = Ease.outBack(clamp((t - 22.2 - flips * 0.5) / 0.3));
          icon(ctx, 'hourglass', 900, 745, 1.2 * hgIn * (1 - hgOut), (flips + fr) * Math.PI + 0.2, clamp((t - 21.9) / 3));
        }

        // toddler aside
        drawText(ctx, LK(), 540, 360, { T: t, at: 23.05, anim: 'fade', per: 'word', stagger: 0.05, dur: 0.4, decoAt: 23.7 });
        drawText(ctx, LK2(), 540, 585, { T: t, at: 23.75, anim: 'pop', stagger: 0.05 });
        const kIn = Ease.outBack(clamp((t - 23.0) / 0.45));
        if (kIn > 0) {
          const hopK = Math.abs(Math.sin((t - 23.0) * 7)) * 22 * clamp((t - 23.4) / 0.2);
          drawPerson(ctx, { x: 270, y: 1575, s: 0.95 * kIn, h: 170, w: 124, hr: 72, skin: C.skin1, hair: '#6B3F1F', hairStyle: 'curly', shirt: C.tomato, lift: hopK, wave: Math.sin(t * 9) * 0.5, mouth: 'o' });
          const bp = Ease.outBack(clamp((t - 23.25) / 0.4));
          if (bp > 0) {
            ctx.save(); ctx.translate(300, 1085); ctx.scale(bp, bp); ctx.rotate(-0.05);
            ctx.fillStyle = C.paper; ctx.strokeStyle = C.ink; ctx.lineWidth = 6;
            rr(ctx, -190, -62, 380, 124, 34); ctx.fill(); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(-40, 60); ctx.lineTo(-60, 104); ctx.lineTo(0, 60); ctx.fillStyle = C.paper; ctx.fill(); ctx.stroke();
            ctx.fillStyle = C.paper; ctx.fillRect(-38, 54, 36, 10);
            text(ctx, 'MORE SNACK!', 0, 22, 's9', 60, C.ink);
            ctx.restore();
          }
        }
        ctx.restore();
        // page-turn shadow
        if (pt > 0) {
          const x = W * (1 - pt);
          const sg = ctx.createLinearGradient(x - 90, 0, x, 0); sg.addColorStop(0, 'rgba(0,0,0,0)'); sg.addColorStop(1, 'rgba(0,0,0,0.28)');
          ctx.fillStyle = sg; ctx.fillRect(x - 90, 0, 92, H);
        }
      },
    });
    cue(14.55, 'swoosh', { dur: 0.5 });
    cue(15.05, 'whoosh', { dur: 0.3, v: 0.5 });
    cue(16.05, 'hit'); cue(16.21, 'hit', { v: 0.8 }); cue(16.45, 'impact', { size: 0.7 });
    cue(16.2, 'boing', { v: 0.6 });
    cue(16.5, 'vortex', { dur: 4.6 });
    for (let i = 0; i < 8; i++) cue(16.9 + i * 0.25, 'flip', { n: i });
    cue(19.0, 'odometer', { dur: 1.3 }); cue(20.3, 'lock');
    cue(20.15, 'dizzy', { dur: 0.9 });
    cue(21.72, 'hit', { v: 0.9 }); cue(22.05, 'chime', { v: 0.7 });
    [22.2, 22.7, 23.2].forEach((x) => cue(x, 'tick', { v: 0.7 }));
    cue(23.0, 'boing', { v: 0.8 }); cue(23.25, 'pop', { n: 5 }); cue(23.3, 'kid');
    cue(24.5, 'page', { dur: 0.5 });
  }

  /* ==========================================================================
     S4 · PRACTICE (25 – 33) · notebook cream
     ========================================================================== */
  {
    const LT1 = () => layout('Then it practiced', { size: 112, style: 's9' });
    const LT2 = () => layout('a {guessing game.|si,tomato}', { size: 112, style: 's9' });
    const LCARD = () => layout('The cat sat\non the', { size: 94, style: 's8', lh: 104, align: 'left' });
    const LCAP = () => layout('Wrong? {Nudge the dials.|si,cobalt}', { size: 70, style: 's8' });
    const LZ1 = () => layout('Hundreds of {billions|si,tomato}\nof these little dials.', { size: 84, style: 's9', lh: 90 });
    const LZ2 = () => layout('Guess. Check. Tweak.\n{Trillions of times.|si,tomato}', { size: 84, style: 's9', lh: 94 });
    const CARD = { x: 540, y: 770, w: 860, h: 300, rot: -0.025 };
    const TX0 = 110 + 70;
    const BL = { x: 0, y: 0, w: 250 };
    const PITCH = 170, GX = 200, GY = 1110;
    const MOON = 26.95, STAMP = 27.17, MAT = 28.62, OK = 28.85;
    const ZS = 29.45, ZD = 2.35, ZEND = 0.028;

    let dialTile = null;
    function tile() {
      if (dialTile) return dialTile;
      const c = document.createElement('canvas'); c.width = c.height = PITCH;
      const x = c.getContext('2d');
      x.fillStyle = C.cream; x.fillRect(0, 0, PITCH, PITCH);
      dial(x, PITCH / 2, PITCH / 2, 62, 0.6);
      dialTile = c; return c;
    }
    function dial(ctx, x, y, r, ang, simple) {
      circle(ctx, x, y, r); ctx.fillStyle = C.paper; ctx.fill();
      ctx.lineWidth = Math.max(1, r * 0.1); ctx.strokeStyle = C.ink; ctx.stroke();
      if (!simple) {
        ctx.lineWidth = Math.max(1, r * 0.045);
        ctx.beginPath();
        for (let k = 0; k < 12; k++) { const a = (k / 12) * TAU; ctx.moveTo(x + Math.cos(a) * r * 0.72, y + Math.sin(a) * r * 0.72); ctx.lineTo(x + Math.cos(a) * r * 0.86, y + Math.sin(a) * r * 0.86); }
        ctx.stroke();
      }
      ctx.strokeStyle = C.tomato; ctx.lineWidth = Math.max(1.2, r * 0.13); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(ang) * r * 0.66, y + Math.sin(ang) * r * 0.66); ctx.stroke();
      fillCircle(ctx, x, y, r * 0.14, C.ink);
    }
    const dialAngle = (i, j, t) => {
      const base = hash1(i * 131 + j * 71, 5) * TAU;
      const d = Math.hypot(i - 2, j);
      let a = base;
      if (j === 0 && i >= 0 && i <= 4) { // the five hero dials: two nudges
        a += 1.4 * spring(t - 27.85 - i * 0.07, 2.4, 0.35) * (i % 2 ? 1 : -1) + 0.7 * spring(t - 28.3 - i * 0.05, 2.6, 0.4) * (i % 2 ? -1 : 1);
      }
      a += Math.sin(d * 0.35 - (t - ZS) * 5) * 0.9 * clamp((t - ZS + 0.2) / 0.6);
      return a;
    };

    scene({
      id: 'practice', start: 24.5, end: 33.05,
      clip: (ctx, T) => {
        const p = Ease.inOutCubic(clamp((T - 24.5) / 0.5));
        if (p <= 0) return false; if (p >= 1) return true;
        const x = W * (1 - p); ctx.beginPath(); ctx.rect(x, 0, W - x + 1, H); ctx.clip(); return true;
      },
      draw(ctx, t) {
        fill(ctx, C.cream);
        const pageIn = Ease.inOutCubic(clamp((t - 24.5) / 0.5));
        ctx.save(); ctx.translate((1 - pageIn) * 120, 0);
        // camera for the powers-of-ten zoom out
        const zp = Ease.inOutCubic(clamp((t - ZS) / ZD));
        const z = Math.exp(Math.log(ZEND) * zp);
        const pivotSY = lerp(GY, 1000, Ease.inOutCubic(clamp((t - ZS) / 1.2)));
        const S = (wx, wy) => [540 + (wx - 540) * z, pivotSY + (wy - GY) * z];
        // notebook rules (fade out while zooming)
        const ruleA = 1 - clamp((t - ZS) / 0.5);
        if (ruleA > 0) {
          ctx.save(); ctx.globalAlpha *= ruleA;
          ctx.strokeStyle = 'rgba(46,75,255,0.16)'; ctx.lineWidth = 3;
          for (let y = 300; y < H; y += 76) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
          ctx.strokeStyle = 'rgba(255,77,46,0.35)'; ctx.beginPath(); ctx.moveTo(96, 0); ctx.lineTo(96, H); ctx.stroke();
          ctx.restore();
        }
        const sh = shake(t, [[STAMP, 1]], 24);
        ctx.save(); ctx.translate(sh.x, sh.y);

        // ---- dial field (drawn in world space, clipped to Bub's silhouette at the end)
        const dialsIn = t > 27.6;
        if (dialsIn) {
          ctx.save();
          // silhouette clip (world: Bub scaled x90 around the hero row)
          const sil = clamp((t - ZS - 0.4) / 1.0);
          if (sil > 0) {
            const [sx, sy] = S(540, GY + 1500);
            ctx.save(); ctx.translate(sx, sy); ctx.scale(90 * z, 90 * z); M.botPath(ctx); ctx.restore();
            ctx.save(); ctx.globalAlpha = 1; ctx.rect(0, 0, W, H); ctx.restore();
            ctx.clip();
          }
          const pitch = PITCH * z;
          const indA = clamp((pitch - 18) / 12);
          const patA = clamp((30 - pitch) / 12);
          if (patA > 0) {
            const pat = ctx.createPattern(tile(), 'repeat');
            const [ox, oy] = S(GX - PITCH / 2, GY - PITCH / 2);
            pat.setTransform(new DOMMatrix([z, 0, 0, z, ox, oy]));
            ctx.save(); ctx.globalAlpha *= patA; ctx.fillStyle = pat; ctx.fillRect(0, 0, W, H); ctx.restore();
          }
          if (indA > 0) {
            const wx0 = 540 - 540 / z, wx1 = 540 + 540 / z, wy0 = GY - pivotSY / z, wy1 = GY + (H - pivotSY) / z;
            const i0 = Math.floor((wx0 - GX) / PITCH) - 1, i1 = Math.ceil((wx1 - GX) / PITCH) + 1;
            const j0 = Math.floor((wy0 - GY) / PITCH) - 1, j1 = Math.ceil((wy1 - GY) / PITCH) + 1;
            ctx.save(); ctx.globalAlpha *= indA;
            for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
              const hero = j === 0 && i >= 0 && i <= 4;
              const appear = hero ? Ease.outBack(clamp((t - 27.7 - i * 0.06) / 0.4)) : Ease.outBack(clamp((t - 29.2 - Math.hypot(i - 2, j) * 0.05) / 0.4));
              if (appear <= 0) continue;
              const [x, y] = S(GX + i * PITCH, GY + j * PITCH);
              dial(ctx, x, y, 62 * z * appear, dialAngle(i, j, t), pitch < 50);
            }
            ctx.restore();
          }
          ctx.restore();
        }
        // Bub emerges from the dial field
        const bubA = clamp((t - 31.25) / 0.5);
        if (bubA > 0) {
          const [sx, sy] = S(540, GY + 1500);
          drawBot(ctx, { x: sx, y: sy, s: 90 * z, t, bodyAlpha: 0.82 * bubA, alpha: 1, blink: blinkAt(t, [32.25]), look: { x: 0, y: -0.2 }, shadow: false, mouth: t > 32.3 ? 'open' : 'smile' });
        }

        // ---- foreground: title, flash card, Bub guessing (fades as we zoom out)
        const fg = 1 - clamp((t - 29.3) / 0.3);
        if (fg > 0) {
          ctx.save(); ctx.globalAlpha *= fg;
          drawText(ctx, LT1(), 540, 330, { T: t, at: 25.05, anim: 'rise', stagger: 0.07 });
          drawText(ctx, LT2(), 540, 455, { T: t, at: 25.3, anim: 'rise', stagger: 0.07, decoAt: 25.9 });
          // flash card
          const cin = Ease.outBack(clamp((t - 25.75) / 0.55));
          if (cin > 0.001) {
            ctx.save(); ctx.globalAlpha *= clamp(cin * 3); ctx.translate(CARD.x, CARD.y - (1 - cin) * 300); ctx.rotate(CARD.rot + (1 - cin) * 0.35);
            ctx.fillStyle = 'rgba(21,18,15,0.14)'; rr(ctx, -CARD.w / 2 + 12, -CARD.h / 2 + 16, CARD.w, CARD.h, 26); ctx.fill();
            ctx.fillStyle = C.paper; rr(ctx, -CARD.w / 2, -CARD.h / 2, CARD.w, CARD.h, 26); ctx.fill();
            ctx.lineWidth = 7; ctx.strokeStyle = C.ink; ctx.stroke();
            const Lc = LCARD();
            drawText(ctx, Lc, -CARD.w / 2 + 70, -CARD.h / 2 + 50, { T: t, at: 25.95, anim: 'rise', stagger: 0.06 });
            // blank after "on the"
            const l2 = Lc.lines[1];
            BL.x = -CARD.w / 2 + 70 + l2.w + 40 + BL.w / 2; BL.y = -CARD.h / 2 + 50 + l2.y - 34;
            blank(ctx, BL.x, BL.y, BL.w, 92, t, { at: 26.2, noBlink: t > MOON, color: t > OK ? mix(C.tomato, C.mint, clamp((t - OK) / 0.15)) : C.tomato, squash: wobble(t - OK, 3, 6) * 0.3 });
            // words landing in the blank
            const land = (word, t0, col) => {
              const p = Ease.outBack(clamp((t - t0) / 0.3));
              if (p <= 0) return;
              ctx.save(); ctx.translate(BL.x, BL.y + 34); ctx.scale(p, p);
              setFont(ctx, STY.s8, 94); ctx.fillStyle = col; ctx.textAlign = 'center'; ctx.fillText(word, 0, 0); ctx.restore();
            };
            if (t < 27.5) land('moon', MOON + 0.2, C.paper);
            else { // moon falls out
              const q = clamp((t - 27.5) / 0.6);
              if (q < 1) { ctx.save(); ctx.translate(BL.x, BL.y + 34 + q * q * 900); ctx.rotate(q * 1.4); setFont(ctx, STY.s8, 94); ctx.fillStyle = C.tomato; ctx.globalAlpha *= 1 - q; ctx.textAlign = 'center'; ctx.fillText('moon', 0, 0); ctx.restore(); }
            }
            if (t > MAT) land('mat', MAT + 0.2, C.paper);
            // stamp X
            const sp = clamp((t - STAMP) / 0.22), sq2 = clamp((t - 27.55) / 0.25);
            if (sp > 0 && sq2 < 1) {
              ctx.save(); ctx.translate(BL.x, BL.y); ctx.rotate(-0.18); const k = lerp(2.2, 1, Ease.outBack(sp)); ctx.scale(k, k); ctx.globalAlpha *= clamp(sp * 3) * (1 - sq2);
              ctx.strokeStyle = C.tomato; ctx.lineWidth = 12; circle(ctx, 0, 0, 92); ctx.stroke();
              Icon.cross(ctx, 1, C.tomato, 18);
              ctx.restore();
            }
            // check
            const ck = clamp((t - OK) / 0.35);
            if (ck > 0) { ctx.save(); ctx.translate(BL.x + 190, BL.y - 10); ctx.scale(1.3, 1.3); Icon.check(ctx, Ease.outCubic(ck), C.mint, 18); ctx.restore(); }
            ctx.restore();
            ring(ctx, t - OK, { x: CARD.x + BL.x, y: CARD.y + BL.y, r0: 60, r1: 320, color: C.mint, lw: 16, dur: 0.6 });
          }
          // caption
          drawText(ctx, LCAP(), 540, 945, { T: t, at: 27.6, anim: 'rise', stagger: 0.06 });
          // Bub + speech bubble
          const bIn = spring(t - 26.3, 1.6, 0.5);
          const sad = t > STAMP && t < 27.95, glad = t > OK;
          drawBot(ctx, {
            x: 250, y: lerp(2200, 1500, bIn), s: 0.78, t,
            look: t < MOON ? { x: 0.8, y: -0.8 } : { x: 0.6, y: -0.9 },
            eyes: sad ? 'x' : glad ? 'happy' : null, mouth: sad ? 'sad' : glad ? 'open' : 'smile',
            talk: talkAmt(t, [[26.55, 26.85], [28.28, 28.55]]), blink: blinkAt(t, [26.1, 28.1]),
            sq: 1 + wobble(t - STAMP, 3, 5) * 0.15 + wobble(t - OK, 3, 5) * 0.12, lift: glad ? Math.max(0, Math.sin(clamp((t - OK) / 0.4) * Math.PI)) * 70 : 0,
          });
          const sb = (word, t0, t1) => {
            const p = Ease.outBack(clamp((t - t0) / 0.35)), q = Ease.inBack(clamp((t - t1) / 0.25));
            if (p <= 0 || q >= 1) return;
            ctx.save(); ctx.translate(640, 1395); ctx.scale(p * (1 - q), p * (1 - q)); ctx.rotate(-0.04);
            ctx.fillStyle = C.paper; ctx.strokeStyle = C.ink; ctx.lineWidth = 6;
            rr(ctx, -150, -64, 300, 128, 40); ctx.fill(); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(-150, 20); ctx.lineTo(-196, 44); ctx.lineTo(-146, -12); ctx.fill(); ctx.stroke();
            ctx.fillRect(-154, -14, 10, 38);
            text(ctx, word, 0, 26, 's9', 76, C.ink);
            ctx.restore();
          };
          sb('moon?', 26.55, MOON);
          sb('mat!', 28.28, MAT);
          ctx.restore();
        }
        // flying guesses
        const fly = (word, t0, dur) => {
          const p = Ease.inOutCubic(clamp((t - t0) / dur)); if (p <= 0 || p >= 1) return;
          const x0 = 640, y0 = 1420, x1 = CARD.x + BL.x, y1 = CARD.y + BL.y + 34;
          const x = lerp(x0, x1, p), y = lerp(y0, y1, p) - Math.sin(p * Math.PI) * 200;
          ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(p * Math.PI) * 0.2); setFont(ctx, STY.s9, lerp(76, 94, p)); ctx.fillStyle = C.ink; ctx.textAlign = 'center'; ctx.fillText(word, 0, 0); ctx.restore();
        };
        fly('moon', MOON, 0.2); fly('mat', MAT, 0.2);
        ctx.restore();

        // captions over the zoom
        const capCard = (L, at, outAt, y) => {
          const a = Ease.outBack(clamp((t - at) / 0.4)), q = Ease.inBack(clamp((t - outAt) / 0.3));
          if (a <= 0 || q >= 1) return;
          ctx.save(); ctx.translate(540, y + L.height / 2); ctx.scale(a * (1 - q), a * (1 - q)); ctx.rotate(-0.015);
          const w = L.width + 90, h = L.height + 70;
          ctx.fillStyle = 'rgba(21,18,15,0.18)'; rr(ctx, -w / 2 + 10, -h / 2 + 12, w, h, 30); ctx.fill();
          ctx.fillStyle = C.paper; rr(ctx, -w / 2, -h / 2, w, h, 30); ctx.fill(); ctx.lineWidth = 7; ctx.strokeStyle = C.ink; ctx.stroke();
          drawText(ctx, L, 0, -L.height / 2, {});
          ctx.restore();
        };
        capCard(LZ1(), 30.05, 31.35, 360);
        capCard(LZ2(), 31.45, 32.75, 360);
        ctx.restore();
      },
    });
    cue(24.95, 'hit', { v: 0.6 });
    cue(25.75, 'swoosh', { dur: 0.35 }); cue(26.05, 'thud', { v: 0.6 });
    cue(26.3, 'boing', { v: 0.7 }); cue(26.55, 'pop', { n: 2 });
    cue(MOON, 'whoosh', { dur: 0.2, v: 0.5 }); cue(STAMP, 'buzzer'); cue(STAMP, 'stamp');
    cue(27.5, 'fall', { dur: 0.6 });
    for (let i = 0; i < 5; i++) { cue(27.72 + i * 0.06, 'pop', { n: i, v: 0.5 }); cue(27.85 + i * 0.07, 'ratchet'); cue(28.3 + i * 0.05, 'ratchet', { v: 0.6 }); }
    cue(28.28, 'pop', { n: 3 }); cue(MAT, 'whoosh', { dur: 0.2, v: 0.5 }); cue(OK, 'ding'); cue(OK, 'sparkle');
    cue(29.2, 'multiply', { dur: 0.5 });
    cue(ZS, 'zoomout', { dur: ZD });
    cue(30.05, 'pop', { n: 6 }); cue(31.45, 'pop', { n: 7 });
    cue(31.3, 'reveal', { dur: 1.0 }); cue(32.3, 'boing', { v: 0.6 });
  }

  /* ---------- tiny 3D helpers ---------- */
  function proj(p, cam) {
    const x = p[0] - cam.tx, y = p[1] - cam.ty, z = p[2] - cam.tz;
    const cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw);
    const x1 = x * cy + z * sy, z1 = -x * sy + z * cy;
    const cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
    const y1 = y * cp - z1 * sp, z2 = y * sp + z1 * cp + cam.dist;
    if (z2 < 30) return null;
    const k = cam.f / z2;
    return { x: cam.cx + x1 * k, y: cam.cy + y1 * k, k, z: z2 };
  }
  /* hand-drawn "≈" (not in the subset fonts) */
  function approx(ctx, x, y, s, col, t) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.strokeStyle = col; ctx.lineWidth = 10; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const dy of [-13, 13]) {
      ctx.beginPath();
      for (let k = 0; k <= 32; k++) { const u = k / 32, xx = -36 + u * 72, yy = dy - Math.sin(u * TAU + Math.sin(t * 5) * 0.6) * 7; k ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); }
      ctx.stroke();
    }
    ctx.restore();
  }

  /* ==========================================================================
     S5 · MEANING (33 – 39) · night, 3D map of meaning
     ========================================================================== */
  {
    const LM = () => layout('It builds a\n{map of meaning.|si,sun}', { size: 108, style: 's9', color: C.cream, lh: 108 });
    const LSIM = () => layout('Similar ideas live\n{close together.|si,sun}', { size: 98, style: 's9', color: C.cream, lh: 104 });
    const R = rng(33);
    const CL = [
      { col: C.lilac, c: [-290, -60, 120], words: ['nap', 'sleep', 'bedtime', 'lullaby', 'snooze'], on: 33.8,
        off: [[-190, -40, 40], [60, -150, -60], [-60, 90, 80], [200, 10, -40], [110, 170, 60]] },
      { col: C.sun, c: [200, 170, -120], words: ['snack', 'cookie', 'juice box', 'crackers'], on: 34.3,
        off: [[-170, -110, 0], [150, -170, 50], [130, 90, -40], [-120, 120, 60]] },
      { col: C.tomato, c: [-240, 430, -60], words: ['tantrum', 'meltdown', 'screaming', 'time-out'], on: 34.8,
        off: [[-150, -40, 0], [150, 50, 20], [70, 200, -40], [-60, -210, -30]] },
      { col: C.mint, c: [300, 650, 180], words: ['coffee', 'espresso', 'survival'], on: 35.3,
        off: [[-150, -50, 0], [130, -110, 40], [40, 120, -20]] },
    ];
    const NODES = [];
    CL.forEach((cl, ci) => cl.words.forEach((w, wi) => {
      const o = cl.off[wi];
      const p = [cl.c[0] + o[0], cl.c[1] + o[1], cl.c[2] + o[2]];
      NODES.push({ w, ci, p, i: wi });
    }));
    const STARS = [];
    for (let i = 0; i < 520; i++) {
      const u = R() * 2 - 1, th = R() * TAU, r = 500 + Math.pow(R(), 0.6) * 2600;
      STARS.push({ p: [Math.sqrt(1 - u * u) * Math.cos(th) * r, u * r * 0.9, Math.sqrt(1 - u * u) * Math.sin(th) * r], b: 0.3 + R() * 0.7, tw: R() * 10, c: R() < 0.12 ? C.sun : R() < 0.2 ? C.lilac : C.cream });
    }
    const camAt = (t) => {
      const push = Ease.inOutCubic(clamp((t - 37.0) / 1.35));
      const warp = Ease.inExpo(clamp((t - 38.35) / 0.65));
      const chaos = CL[2].c;
      return {
        tx: lerp(0, chaos[0], push), ty: lerp(290, chaos[1], push), tz: lerp(0, chaos[2], push),
        yaw: lerp(-0.42, 0.3, Ease.inOutCubic(clamp((t - 32.6) / 6.2))), pitch: 0.1 + Math.sin(t * 0.4) * 0.04,
        dist: lerp(lerp(1900, 1600, Ease.outCubic(clamp((t - 32.6) / 4.4))), 760, push) - warp * 1300, f: 1450, cx: 540, cy: lerp(1090, 900, push),
      };
    };

    scene({
      id: 'meaning', start: 32.55, end: 39.05,
      draw(ctx, t) {
        const fin = clamp((t - 32.55) / 0.45);
        ctx.save(); ctx.globalAlpha *= fin;
        fill(ctx, C.night);
        // nebula
        const neb = (x, y, r, col, a) => { const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, alpha(col, a)); g.addColorStop(1, alpha(col, 0)); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); };
        neb(260 + Math.sin(t * 0.3) * 60, 700, 900, C.cobalt, 0.28); neb(860, 1400, 800, C.lilac, 0.16); neb(600, 1900, 700, C.pink, 0.10);
        const cam = camAt(t), camPrev = camAt(t - 1 / 60);
        const warp = clamp((t - 38.35) / 0.65);
        // stars (streak during warp)
        for (const s of STARS) {
          const q = proj(s.p, cam); if (!q) continue;
          const tw = 0.6 + 0.4 * Math.sin(t * 3 + s.tw);
          const a = s.b * tw * clamp(1.6 - q.z / 3200);
          if (warp > 0.02) {
            const q0 = proj(s.p, camPrev); if (!q0) continue;
            ctx.strokeStyle = alpha(s.c === C.cream ? C.cream : s.c, Math.min(1, a * 1.4)); ctx.lineWidth = Math.max(1.5, q.k * 3);
            const ex = q.x + (q.x - q0.x) * 5, ey = q.y + (q.y - q0.y) * 5;
            ctx.beginPath(); ctx.moveTo(q0.x, q0.y); ctx.lineTo(ex, ey); ctx.stroke();
          } else {
            ctx.fillStyle = alpha(s.c, a); const r = Math.max(1.2, q.k * 3.2); ctx.fillRect(q.x - r / 2, q.y - r / 2, r, r);
          }
        }
        // constellation lines
        CL.forEach((cl, ci) => {
          const lp = Ease.inOutCubic(clamp((t - cl.on - 0.15) / 0.55));
          if (lp <= 0) return;
          const ns = NODES.filter((n) => n.ci === ci);
          ctx.save(); ctx.strokeStyle = alpha(cl.col, 0.55 * (1 - warp)); ctx.lineCap = 'round';
          for (let i = 0; i < ns.length; i++) for (let j = i + 1; j < ns.length; j++) {
            if (j !== i + 1 && !(i === 0 && j === ns.length - 1)) continue;
            const a = proj(ns[i].p, cam), b = proj(ns[j].p, cam); if (!a || !b) continue;
            ctx.lineWidth = Math.max(1.5, 3 * (a.k + b.k) / 2);
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(lerp(a.x, b.x, lp), lerp(a.y, b.y, lp)); ctx.stroke();
          }
          ctx.restore();
        });
        // word nodes, far to near
        const qs = NODES.map((n) => ({ n, q: proj(n.p, cam) })).filter((o) => o.q).sort((a, b) => b.q.z - a.q.z);
        for (const { n, q } of qs) {
          const cl = CL[n.ci];
          const act = Ease.outBack(clamp((t - cl.on - n.i * 0.07) / 0.45));
          const depthA = clamp(1.5 - q.z / 3000) * (1 - clamp(warp * 2.5));
          const col = cl.col;
          if (act > 0) {
            const g = ctx.createRadialGradient(q.x, q.y, 0, q.x, q.y, 90 * q.k * act);
            g.addColorStop(0, alpha(col, 0.45 * depthA)); g.addColorStop(1, alpha(col, 0));
            ctx.fillStyle = g; circle(ctx, q.x, q.y, 90 * q.k * act); ctx.fill();
          }
          fillCircle(ctx, q.x, q.y, Math.max(3, (6 + act * 5) * q.k), alpha(act > 0 ? col : C.cream, (0.35 + 0.65 * clamp(act)) * depthA));
          if (act > 0.01) {
            const size = clamp(66 * q.k, 34, 150) * (0.7 + 0.3 * act);
            ctx.save(); ctx.globalAlpha *= clamp(act) * depthA;
            setFont(ctx, STY.s7, size); ctx.fillStyle = C.cream; ctx.textAlign = 'center';
            ctx.fillText(n.w, q.x, q.y - 18 * q.k - size * 0.3);
            ctx.restore();
          }
        }
        // "tantrum ≈ meltdown" lockup as the camera pushes in
        const eq = Ease.outBack(clamp((t - 37.5) / 0.45)) * (1 - Ease.inCubic(clamp((t - 38.3) / 0.25)));
        if (eq > 0.001) {
          ctx.save(); ctx.translate(540, 1500); ctx.scale(eq, eq);
          const wl = measure('tantrum', STY.s9, 92), wr = measure('meltdown', STY.s9, 92), gap = 120, tot = wl + gap + wr;
          ctx.fillStyle = 'rgba(12,11,26,0.72)'; rr(ctx, -tot / 2 - 50, -100, tot + 100, 250, 60); ctx.fill();
          text(ctx, 'tantrum', -tot / 2 + wl / 2, 0, 's9', 92, C.cream);
          text(ctx, 'meltdown', tot / 2 - wr / 2, 0, 's9', 92, C.cream);
          approx(ctx, -tot / 2 + wl + gap / 2, -32, 1.25, C.sun, t);
          ctx.rotate(-0.03); text(ctx, 'basically the same thing', 0, 100, 'hd', 60, C.sun);
          ctx.restore();
        }
        ctx.restore();
        // type
        drawText(ctx, LM(), 540, 330, { T: t, at: 33.05, anim: 'rise', stagger: 0.07, out: { at: 35.75, dur: 0.3 }, decoAt: 33.7 });
        drawText(ctx, LSIM(), 540, 330, { T: t, at: 36.05, anim: 'rise', stagger: 0.06, out: { at: 37.3, dur: 0.3 } });
        // flash into the next scene
        const fl = clamp((t - 38.8) / 0.12) * (1 - clamp((t - 38.95) / 0.1));
        if (fl > 0) { ctx.fillStyle = alpha(C.cream, 0.85 * fl); ctx.fillRect(0, 0, W, H); }
      },
    });
    cue(32.55, 'shimmer', { dur: 1.2 });
    CL.forEach((cl, ci) => cl.words.forEach((w, i) => cue(cl.on + i * 0.07, 'twinkle', { n: ci * 5 + i })));
    cue(35.75, 'swoosh', { dur: 0.3, v: 0.5 });
    cue(37.0, 'swell', { dur: 1.3 });
    cue(37.5, 'boing', { v: 0.6 });
    cue(38.3, 'warp', { dur: 0.7 });
  }

  /* ==========================================================================
     S6 · ATTENTION (39 – 47) · night, attention arcs
     ========================================================================== */
  {
    const LH1 = () => layout('Then it does\nwhat kids {won’t:|si,sun}', { size: 104, style: 's9', color: C.cream, lh: 106 });
    const PA = () => layout('PAY\nATTENTION.', { size: M.fitSize('ATTENTION.', 's9', 900, 180), style: 's9', color: C.sun, lh: 150 });
    const S1 = 'The kid won’t eat the broccoli because it’s cold.';
    const S2 = 'The kid won’t eat the broccoli because she’s tired.';
    const LA1 = () => layout(S1, { size: 74, style: 's7', color: C.cream, maxW: 900, lh: 158, ws: 0.6 });
    const LA2 = () => layout(S2, { size: 74, style: 's7', color: C.cream, maxW: 900, lh: 158, ws: 0.6 });
    const LCAP = () => layout('Every word checks every\nother word to work out\n{who’s who.|si,sun}', { size: 80, style: 's8', color: C.cream, lh: 86 });
    const TOP = 930;
    const W1 = [0.03, 0.09, 0.03, 0.06, 0.02, 0.62, 0.05, 1, 0.10];
    const W2 = [0.05, 0.58, 0.07, 0.04, 0.02, 0.08, 0.06, 1, 0.10];
    const FOCUS = 7;
    const A1 = 42.1, MORPH = 43.45, A2 = 43.95;
    const chipRects = (L) => L.units.map((g) => {
      const ln = L.lines[g.line];
      const x = 540 + g.gx - 22, y = TOP + ln.y - L.size * 0.76 - 22;
      return { x, y, w: g.w + 44, h: L.size * 0.76 + 46, cx: 540 + g.gx + g.w / 2, text: g.pieces.map((p) => p.text).join('') };
    });
    const bez = (a, b, c, u) => [(1 - u) * (1 - u) * a[0] + 2 * (1 - u) * u * b[0] + u * u * c[0], (1 - u) * (1 - u) * a[1] + 2 * (1 - u) * u * b[1] + u * u * c[1]];
    const SCR = 'abcdefghijklmnopqrstuvwxyz’';

    function arcs(ctx, t, rects, Wt, t0, tOut) {
      const out = clamp((t - tOut) / 0.2);
      if (t < t0 || out >= 1) return;
      const f = rects[FOCUS];
      const order = Wt.map((w, i) => [w, i]).filter(([, i]) => i !== FOCUS).sort((a, b) => a[0] - b[0]);
      order.forEach(([w, i], k) => {
        const r = rects[i];
        const p = Ease.inOutCubic(clamp((t - t0 - k * 0.09) / 0.45));
        if (p <= 0) return;
        const a = [f.cx, f.y - 4], c = [r.cx, r.y - 4];
        const lift = 110 + Math.abs(a[0] - c[0]) * 0.32 + Math.abs(a[1] - c[1]) * 0.25;
        const b = [(a[0] + c[0]) / 2, Math.min(a[1], c[1]) - lift];
        const pts = []; for (let s = 0; s <= 40; s++) pts.push(bez(c, b, a, s / 40));
        const len = polyLen(pts);
        ctx.save();
        ctx.globalAlpha *= (0.32 + 0.68 * Math.min(1, w * 1.6)) * (1 - out);
        ctx.strokeStyle = C.sun; ctx.lineWidth = 4 + 30 * w; ctx.lineCap = 'round';
        if (w > 0.3) { ctx.shadowColor = C.sun; ctx.shadowBlur = 30; }
        ctx.setLineDash([len * p, len]); polyline(ctx, pts); ctx.stroke(); ctx.setLineDash([]);
        ctx.shadowBlur = 0;
        // signal dots travelling toward the focus word
        if (p >= 1) {
          const n = Math.max(1, Math.round(w * 14));
          for (let d = 0; d < n; d++) {
            const u = fract((t - t0) * 0.8 + d / n);
            const q = bez(c, b, a, u);
            fillCircle(ctx, q[0], q[1], 4 + w * 10, C.paper);
          }
        }
        ctx.restore();
      });
    }
    const fract = (x) => x - Math.floor(x);

    scene({
      id: 'attention', start: 38.95, end: 47.02,
      draw(ctx, t) {
        fill(ctx, C.night);
        const gl = ctx.createRadialGradient(540, 900, 0, 540, 900, 1200); gl.addColorStop(0, 'rgba(183,166,255,0.16)'); gl.addColorStop(1, 'rgba(183,166,255,0)');
        ctx.fillStyle = gl; ctx.fillRect(0, 0, W, H);
        // exit: shrink into the first layer of the stack
        const ex = Ease.inCubic(clamp((t - 46.72) / 0.3));
        ctx.save(); camera(ctx, { zoom: 1 - ex * 0.45, px: 540, py: 1000, y: ex * 300 }); ctx.globalAlpha *= 1 - ex;
        const sh = shake(t, [[40.0, 0.8]], 18); ctx.translate(sh.x, sh.y);

        drawText(ctx, LH1(), 540, 340, { T: t, at: 39.05, anim: 'rise', stagger: 0.07, out: { at: 40.95, dur: 0.3 } });
        drawText(ctx, PA(), 540, 610, { T: t, at: 39.95, anim: 'pop', per: 'char', stagger: 0.035, dur: 0.5, out: { at: 41.0, anim: 'riseOut', dur: 0.3 },
          unitFx: (i) => ({ rot: Math.sin(t * 9 + i * 1.3) * 0.05 * clamp((t - 40.4) / 0.3), dy: Math.sin(t * 7 + i) * 4 }) });

        // chips + arcs
        const m = Ease.inOutCubic(clamp((t - MORPH) / 0.35));
        const r1 = chipRects(LA1()), r2 = chipRects(LA2());
        const rects = r1.map((a, i) => ({ x: lerp(a.x, r2[i].x, m), y: lerp(a.y, r2[i].y, m), w: lerp(a.w, r2[i].w, m), h: a.h, cx: lerp(a.cx, r2[i].cx, m), text: m < 0.5 ? a.text : r2[i].text }));
        arcs(ctx, t, rects, W1, A1, MORPH - 0.1);
        arcs(ctx, t, rects, W2, A2, 46.7);
        rects.forEach((r, i) => {
          const pin = Ease.outBack(clamp((t - 41.1 - i * 0.05) / 0.4));
          if (pin <= 0.001) return;
          const isF = i === FOCUS && t > 41.85;
          const win = (i === 5 && t > A1 + 0.95 && t < MORPH) || (i === 1 && t > A2 + 0.95);
          const pulse = isF ? 1 + wobble(t - 41.85, 3, 5) * 0.12 + wobble(t - MORPH, 3, 5) * 0.12 : 1 + (win ? wobble(t - (i === 5 ? A1 + 0.95 : A2 + 0.95), 3, 5) * 0.12 : 0);
          ctx.save(); ctx.translate(r.x + r.w / 2, r.y + r.h / 2); ctx.scale(pin * pulse, pin * pulse);
          if (win) { ctx.shadowColor = C.sun; ctx.shadowBlur = 40; }
          ctx.fillStyle = isF ? C.sun : win ? '#2B2560' : '#1D1A42';
          rr(ctx, -r.w / 2, -r.h / 2, r.w, r.h, r.h / 2); ctx.fill(); ctx.shadowBlur = 0;
          ctx.lineWidth = win ? 6 : 3; ctx.strokeStyle = win ? C.sun : 'rgba(244,237,225,0.28)'; ctx.stroke();
          // text (with scramble during the morph)
          let str = r.text;
          if ((i === 7 || i === 8) && t > MORPH - 0.05 && t < MORPH + 0.35) {
            const n = Math.round(lerp(r1[i].text.length, r2[i].text.length, m)), f = Math.floor(t * 30);
            str = ''; for (let k = 0; k < n; k++) str += SCR[Math.floor(hash1(f * 17 + k, i) * SCR.length)];
          }
          setFont(ctx, STY.s7, 74); ctx.fillStyle = isF ? C.ink : C.cream; ctx.textAlign = 'center';
          ctx.fillText(str, 0, 74 * 0.36);
          ctx.restore();
        });
        // who "it" / "she" points to
        const note = (str, i, t0, t1) => {
          const p = Ease.outBack(clamp((t - t0) / 0.4)), q = clamp((t - t1) / 0.2);
          if (p <= 0.001 || q >= 1) return;
          const last = rects.reduce((a, r) => Math.max(a, r.y + r.h), 0);
          ctx.save(); ctx.globalAlpha *= 1 - q; ctx.translate(540, last + 120); ctx.rotate(-0.04); ctx.scale(p, p);
          text(ctx, str, 0, 0, 'hd', 76, C.sun); ctx.restore();
        };
        note('“it” = the broccoli', 5, A1 + 1.0, MORPH - 0.1);
        note('“she” = the kid', 1, A2 + 1.0, 46.6);
        drawText(ctx, LCAP(), 540, 330, { T: t, at: 45.25, anim: 'rise', stagger: 0.05 });
        ctx.restore();
      },
    });
    cue(39.05, 'whoosh', { dur: 0.3, v: 0.5 });
    cue(39.95, 'impact', { size: 0.8 }); for (let i = 0; i < 12; i++) cue(39.95 + i * 0.035, 'pop', { n: i, v: 0.35 });
    cue(40.95, 'swoosh', { dur: 0.35 });
    for (let i = 0; i < 9; i++) cue(41.1 + i * 0.05, 'pop', { n: i, v: 0.4 });
    cue(41.85, 'select');
    cue(A1, 'arcs', { dur: 1.0 }); cue(A1 + 0.95, 'ding', { v: 0.7 });
    cue(MORPH, 'scramble', { dur: 0.35 });
    cue(A2, 'arcs', { dur: 1.0 }); cue(A2 + 0.95, 'ding', { v: 0.8 });
    cue(45.25, 'whoosh', { dur: 0.3, v: 0.4 });
    cue(46.72, 'suck', { dur: 0.3 });
  }

  /* ==========================================================================
     S7 · LAYERS (47 – 51) · isometric stack → "Transformer"
     ========================================================================== */
  {
    const LL1 = () => layout('And it does this in\n{dozens of layers.|si,sun}', { size: 100, style: 's9', color: C.cream, lh: 104 });
    const LT1 = () => layout('That’s the {“T”|si,sun} in ChatGPT:', { size: 74, style: 's8', color: C.cream });
    const LT2 = () => layout('Transformer.', { size: M.fitSize('Transformer.', 's9', 880, 170), style: 's9', color: C.sun });
    const N = 8, BASE = 1500, GAP = 66, HW = 340, HD = 196, TH = 24;
    const land = (i) => 47.2 + i * 0.2;
    const HUE = [C.cobalt, '#4B4BFF', '#6A4DFF', '#8750F0', '#A55BE0', '#C765C8', '#E0709F', C.tomato];

    function plate(ctx, cx, cy, i, sq, glow) {
      const hw = HW * (1 + sq * 0.06), hd = HD * (1 + sq * 0.06), th = TH * (1 - sq * 0.4);
      const T = [cx, cy - hd], Rr = [cx + hw, cy], B = [cx, cy + hd], L = [cx - hw, cy];
      const poly = (pts) => { ctx.beginPath(); pts.forEach((p, k) => (k ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); };
      const col = HUE[i % HUE.length];
      ctx.fillStyle = mix(col, '#000000', 0.55); poly([L, B, [B[0], B[1] + th], [L[0], L[1] + th]]); ctx.fill();
      ctx.fillStyle = mix(col, '#000000', 0.7); poly([B, Rr, [Rr[0], Rr[1] + th], [B[0], B[1] + th]]); ctx.fill();
      const g = ctx.createLinearGradient(L[0], T[1], Rr[0], B[1]);
      g.addColorStop(0, mix(col, C.night, 0.25)); g.addColorStop(1, mix(col, C.night, 0.6));
      ctx.fillStyle = g; poly([T, Rr, B, L]); ctx.fill();
      ctx.save(); if (glow > 0) { ctx.shadowColor = mix(col, '#FFFFFF', 0.4); ctx.shadowBlur = 30 * glow; }
      ctx.strokeStyle = alpha('#FFFFFF', 0.55 + 0.45 * glow); ctx.lineWidth = 3; poly([T, Rr, B, L]); ctx.stroke(); ctx.restore();
      // neurons on the plate
      for (let u = 1; u < 5; u++) for (let v = 1; v < 5; v++) {
        const a = u / 5, b = v / 5;
        const x = L[0] + (T[0] - L[0]) * a + (B[0] - L[0]) * b, y = L[1] + (T[1] - L[1]) * a + (B[1] - L[1]) * b;
        const on = 0.35 + 0.65 * Math.max(0, Math.sin(glow * 3 + u * 1.7 + v * 2.3 + i));
        ctx.fillStyle = alpha('#FFFFFF', 0.25 + 0.6 * on * glow);
        ctx.beginPath(); ctx.ellipse(x, y, 9, 5.5, 0, 0, TAU); ctx.fill();
      }
    }

    scene({
      id: 'layers', start: 47.0, end: 51.1,
      draw(ctx, t) {
        fill(ctx, C.night);
        const gl = ctx.createRadialGradient(540, 1250, 0, 540, 1250, 1100); gl.addColorStop(0, 'rgba(46,75,255,0.30)'); gl.addColorStop(1, 'rgba(46,75,255,0)');
        ctx.fillStyle = gl; ctx.fillRect(0, 0, W, H);
        const hits = []; for (let i = 0; i < N; i++) hits.push([land(i) + 0.1, 0.35]);
        const sh = shake(t, hits, 14);
        ctx.save(); ctx.translate(sh.x, sh.y);
        // stack gently rises/zooms to feel taller
        const rise = Ease.inOutCubic(clamp((t - 48.8) / 1.8));
        camera(ctx, { zoom: 1 - rise * 0.12, px: 540, py: 1250, y: rise * 60 });
        for (let i = 0; i < N; i++) {
          const p = clamp((t - land(i) + 0.45) / 0.45);
          if (p <= 0) continue;
          const drop = (1 - Ease.outBounce(p)) * -620;
          const sq = Math.max(0, wobble(t - land(i), 3, 6));
          const cy = BASE - i * GAP + drop;
          const glow = clamp((t - 48.8 - (N - i) * 0.02) / 0.3) * (0.6 + 0.4 * Math.sin((t - 48.8) * 6 - i * 0.8));
          ctx.save(); ctx.globalAlpha *= clamp(p * 3);
          plate(ctx, 540, cy, i, sq, glow);
          ctx.restore();
        }
        // light beams rising through the stack
        if (t > 48.8) {
          for (let k = 0; k < 7; k++) {
            const u = fract2((t - 48.8) * 0.9 + k / 7);
            const x = 540 + Math.sin(k * 2.1) * 200, y = BASE + 40 - u * (N * GAP + 180);
            ctx.save(); ctx.globalAlpha *= Math.sin(u * Math.PI);
            const g2 = ctx.createRadialGradient(x, y, 0, x, y, 40); g2.addColorStop(0, 'rgba(255,240,200,1)'); g2.addColorStop(1, 'rgba(255,197,61,0)');
            ctx.fillStyle = g2; circle(ctx, x, y, 40); ctx.fill(); ctx.restore();
          }
        }
        // layer counter
        const landed = Math.min(N, Math.max(0, Math.floor((t - 47.2) / 0.2) + 1));
        let cnt = landed; if (t > 48.85) cnt = Math.round(lerp(8, 96, Ease.inOutCubic(clamp((t - 48.85) / 0.6))));
        if (t > 47.2) {
          ctx.save(); ctx.globalAlpha *= clamp((t - 47.2) / 0.2);
          setFont(ctx, STY.mo, 40); ctx.fillStyle = alpha(C.cream, 0.8); ctx.textAlign = 'left';
          ctx.fillText('LAYER ' + String(cnt).padStart(2, '0'), 820 - 170, BASE + 300);
          ctx.fillStyle = C.sun; ctx.fillRect(820 - 170, BASE + 318, 330 * (cnt / 96), 6);
          ctx.restore();
        }
        ctx.restore();
        drawText(ctx, LL1(), 540, 330, { T: t, at: 47.05, anim: 'rise', stagger: 0.06, out: { at: 48.8, dur: 0.3 } });
        drawText(ctx, LT1(), 540, 340, { T: t, at: 48.95, anim: 'rise', stagger: 0.05 });
        drawText(ctx, LT2(), 540, 460, { T: t, at: 49.4, anim: 'slam', per: 'char', stagger: 0.04, dur: 0.24,
          unitFx: (i) => ({ dy: Math.sin(t * 6 + i * 0.6) * 5 * clamp((t - 49.9) / 0.3) }) });
        // not the robot kind
        const np = Ease.outBack(clamp((t - 50.0) / 0.4));
        if (np > 0.001) {
          ctx.save(); ctx.translate(430, 752); ctx.rotate(-0.04); ctx.scale(np, np);
          text(ctx, '(no, not the robot kind)', 0, 0, 'hd', 64, C.cream);
          ctx.restore();
          const shakeNo = Math.sin((t - 50.1) * 28) * 0.22 * clamp((t - 50.1) / 0.1) * (1 - clamp((t - 50.6) / 0.2));
          icon(ctx, 'robot', 900, 715, 1.15 * np, shakeNo, C.paper);
          const sl = Ease.outCubic(clamp((t - 50.25) / 0.25));
          if (sl > 0) {
            ctx.save(); ctx.translate(900, 715); ctx.strokeStyle = C.tomato; ctx.lineWidth = 12; ctx.lineCap = 'round';
            circle(ctx, 0, 0, 78 * sl); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(-55 * sl, -55 * sl); ctx.lineTo(55 * sl, 55 * sl); ctx.stroke(); ctx.restore();
          }
        }
      },
    });
    const fract2 = (x) => x - Math.floor(x);
    cue(47.05, 'whoosh', { dur: 0.3, v: 0.4 });
    for (let i = 0; i < N; i++) cue(land(i), 'thud', { n: i });
    cue(48.85, 'counter', { dur: 0.6 });
    cue(48.95, 'whoosh', { dur: 0.3, v: 0.4 });
    cue(49.4, 'impact', { size: 0.8 });
    cue(50.0, 'pop', { n: 3 }); cue(50.1, 'nope'); cue(50.25, 'stamp', { v: 0.6 });
  }

  /* vertical blinds wipe */
  function blinds(t0, dur = 0.42, n = 6) {
    return (ctx, T) => {
      if (T >= t0 + dur + n * 0.04) return true;
      ctx.beginPath(); const bw = W / n; let any = false;
      for (let i = 0; i < n; i++) { const p = Ease.inOutCubic(clamp((T - t0 - i * 0.04) / dur)); if (p <= 0) continue; any = true; ctx.rect(i * bw, 0, bw + 1, H * p); }
      if (!any) return false;
      ctx.clip(); return true;
    };
  }
  /* halftone corner dots */
  function halftone(ctx, col, cx, cy, reach, spacing = 38, maxR = 11) {
    ctx.fillStyle = col;
    for (let y = spacing / 2; y < H; y += spacing) for (let x = spacing / 2; x < W; x += spacing) {
      const d = Math.hypot(x - cx, y - cy) / reach; if (d >= 1) continue;
      const r = maxR * (1 - d); if (r < 0.8) continue;
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    }
  }
  /* speech bubble with text */
  function speech(ctx, x, y, str, p, o = {}) {
    if (p <= 0.001) return;
    const size = o.size || 54, st = o.style || 's8';
    const L = layout(str, { size, style: st, color: o.color || C.ink, maxW: o.maxW || 560, lh: size * 1.12 });
    const w = L.width + 70, h = L.height + 54;
    ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot || 0); ctx.scale(p, p);
    ctx.fillStyle = o.bg || C.paper; ctx.strokeStyle = C.ink; ctx.lineWidth = 6; ctx.lineJoin = 'round';
    rr(ctx, -w / 2, -h / 2, w, h, 36); ctx.fill(); ctx.stroke();
    const tx = o.tail || -w / 2 + 60;
    ctx.beginPath(); ctx.moveTo(tx, h / 2 - 3); ctx.lineTo(tx - 30, h / 2 + 46); ctx.lineTo(tx + 36, h / 2 - 3); ctx.fill(); ctx.stroke();
    ctx.fillRect(tx - 2, h / 2 - 12, 36, 12);
    drawText(ctx, L, 0, -L.height / 2, {});
    ctx.restore();
  }

  /* ==========================================================================
     S8 · MANNERS (51 – 59) · mint, sticker chart
     ========================================================================== */
  {
    const LS1 = () => layout('Smart? {Yes.|si,paper}', { size: 124, style: 's9' });
    const LS2 = () => layout('Well-behaved?\n{Not yet.|si,tomato}', { size: 116, style: 's9', lh: 116 });
    const LR = () => layout('So humans {raise|si,paper} it.', { size: 98, style: 's9' });
    const LC1 = () => layout('It’s basically\na {sticker chart.|si,paper}', { size: 108, style: 's9', lh: 112 });
    const ROWS = ['Helpful', 'Honest', 'Kind', 'Safe'];
    const CH = { x: 90, y: 790, w: 900, h: 660 };
    const STAR0 = 55.35, STEP = 0.1;
    const OUTBURSTS = [['lol', 51.3, -300, -170], ['BANANA!', 51.55, 250, -230], ['no.', 51.8, -290, 120], ['whatever', 52.05, 270, 110], ['?!', 52.3, -40, -300]];
    const R = rng(88); const THUMBS = [];
    for (let i = 0; i < 14; i++) THUMBS.push({ t: 53.35 + i * 0.1 + R() * 0.04, x: 110 + R() * 860, y: 820 + R() * 620, up: R() < 0.72, rot: (R() - 0.5) * 0.8, s: 0.8 + R() * 0.5 });

    scene({
      id: 'manners', start: 50.55, end: 59.1, clip: iris(50.55, 0.5, 900, 715, Ease.inCubic),
      draw(ctx, t) {
        fill(ctx, C.mint);
        halftone(ctx, 'rgba(255,255,255,0.13)', W + 60, -60, 900);
        halftone(ctx, 'rgba(0,0,0,0.07)', -60, H + 60, 900);
        const sh = shake(t, [[58.05, 1.1]], 26);
        ctx.save(); ctx.translate(sh.x, sh.y);
        // top type
        drawText(ctx, LS1(), 540, 330, { T: t, at: 51.05, anim: 'rise', stagger: 0.28, out: { at: 52.95, dur: 0.3 } });
        drawText(ctx, LS2(), 540, 480, { T: t, at: 51.75, anim: 'rise', stagger: 0.4, out: { at: 52.98, dur: 0.3 } });
        drawText(ctx, LR(), 540, 345, { T: t, at: 53.05, anim: 'rise', stagger: 0.08, out: { at: 57.2, dur: 0.3 } });
        const pn = Ease.outBack(clamp((t - 53.55) / 0.4)), pq = clamp((t - 55.0) / 0.25);
        if (pn > 0.001 && pq < 1) { ctx.save(); ctx.globalAlpha *= 1 - pq; ctx.translate(540, 560); ctx.rotate(-0.03); ctx.scale(pn, pn); text(ctx, 'people rate its answers', 0, 0, 'hd', 70, C.ink); ctx.restore(); }
        drawText(ctx, LC1(), 540, 330, { T: t, at: 57.3, anim: 'rise', stagger: 0.07 });

        // thumbs rain
        for (const th of THUMBS) {
          const p = clamp((t - th.t) / 0.5), q = clamp((t - 55.0 - (th.x / 1000) * 0.15) / 0.3);
          if (p <= 0 || q >= 1) continue;
          const y = lerp(-150, th.y, Ease.outBounce(p));
          icon(ctx, 'thumb', th.x, y, th.s * (1 - Ease.inBack(q)), th.rot + wobble(t - th.t - 0.3, 3, 4) * 0.3, th.up, th.up ? C.sun : C.tomato);
        }

        // sticker chart
        const cin = Ease.snap(clamp((t - 54.95) / 0.6));
        if (cin > 0.001) {
          ctx.save(); ctx.translate(0, (1 - cin) * 1200); ctx.rotate((1 - cin) * 0.08);
          ctx.fillStyle = 'rgba(0,0,0,0.16)'; rr(ctx, CH.x + 14, CH.y + 18, CH.w, CH.h, 34); ctx.fill();
          ctx.fillStyle = C.paper; rr(ctx, CH.x, CH.y, CH.w, CH.h, 34); ctx.fill();
          ctx.save(); rr(ctx, CH.x, CH.y, CH.w, CH.h, 34); ctx.clip();
          ctx.fillStyle = C.tomato; ctx.fillRect(CH.x, CH.y, CH.w, 124);
          ctx.restore();
          ctx.lineWidth = 7; ctx.strokeStyle = C.ink; rr(ctx, CH.x, CH.y, CH.w, CH.h, 34); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(CH.x, CH.y + 124); ctx.lineTo(CH.x + CH.w, CH.y + 124); ctx.stroke();
          text(ctx, 'GOOD BOT CHART', 540, CH.y + 84, 's9', 62, C.paper);
          [CH.x + 70, CH.x + CH.w - 70].forEach((x, k) => { starPath(ctx, x, CH.y + 62, 26, 12, 5, -Math.PI / 2, 3); ctx.fillStyle = C.sun; ctx.fill(); ctx.lineWidth = 4; ctx.stroke(); void k; });
          for (let r = 0; r < 4; r++) {
            const y = CH.y + 124 + 60 + r * 118 + 20;
            setFont(ctx, STY.s8, 56); ctx.fillStyle = C.ink; ctx.textAlign = 'left'; ctx.fillText(ROWS[r], CH.x + 44, y + 20);
            if (r < 3) { ctx.strokeStyle = 'rgba(21,18,15,0.12)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(CH.x + 30, y + 72); ctx.lineTo(CH.x + CH.w - 30, y + 72); ctx.stroke(); }
            for (let k = 0; k < 5; k++) {
              const x = CH.x + 390 + k * 104;
              ctx.save(); ctx.setLineDash([7, 8]); ctx.strokeStyle = 'rgba(21,18,15,0.25)'; ctx.lineWidth = 4; circle(ctx, x, y, 38); ctx.stroke(); ctx.restore();
              const ts = STAR0 + (r * 5 + k) * STEP;
              const sp = clamp((t - ts) / 0.35);
              if (sp > 0) {
                const sc = Ease.outBackBig(sp);
                ctx.save(); ctx.translate(x, y); ctx.rotate((1 - Ease.outCubic(sp)) * -1.2 + Math.sin(k * 3 + r) * 0.12); ctx.scale(sc, sc);
                starPath(ctx, 0, 0, 46, 22, 5, -Math.PI / 2, 6); ctx.fillStyle = C.gold; ctx.fill(); ctx.lineWidth = 6; ctx.strokeStyle = C.ink; ctx.stroke();
                sparkle(ctx, -12, -12, 9, 'rgba(255,255,255,0.85)');
                ctx.restore();
                if (sp < 1) for (let s2 = 0; s2 < 4; s2++) { const a = s2 / 4 * TAU + r + k; const d = 40 + sp * 50; sparkle(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d, 12 * Math.sin(sp * Math.PI), C.sun, a); }
              }
            }
          }
          setFont(ctx, STY.mo5, 26); ctx.fillStyle = 'rgba(21,18,15,0.55)'; ctx.textAlign = 'center';
          ctx.globalAlpha *= clamp((t - 58.45) / 0.3);
          ctx.fillText('a.k.a. “Reinforcement Learning from Human Feedback”', 540, CH.y + CH.h - 30);
          ctx.restore();
        }
        // FOR ROBOTS. stamp
        const fp = clamp((t - 58.05) / 0.2);
        if (fp > 0) {
          ctx.save(); ctx.translate(540, 1130); ctx.rotate(-0.14); const k = lerp(2.4, 1, Ease.outBack(fp)); ctx.scale(k, k); ctx.globalAlpha *= clamp(fp * 4);
          const L = layout('For robots.', { size: 170, style: 'si', color: C.tomato });
          const w = L.width + 80, h = 210;
          ctx.fillStyle = C.paper; rr(ctx, -w / 2, -h / 2, w, h, 26); ctx.fill(); ctx.lineWidth = 10; ctx.strokeStyle = C.tomato; ctx.stroke();
          drawText(ctx, L, 0, -h / 2 + 18, {});
          ctx.restore();
        }

        // Bub: hyper toddler energy -> calm -> sits on the chart -> gets a sticker
        const hyper = t < 53.0;
        const onChart = Ease.inOutCubic(clamp((t - 54.9) / 0.6));
        let bx = 540, by = 1230, bs = 1.0, rot = 0, lift = 0;
        if (hyper) {
          const k = clamp((t - 51.1) / 0.3);
          bx = 540 + Math.sin(t * 6.3) * 250 * k; lift = Math.abs(Math.sin(t * 8.5)) * 230 * k; rot = Math.sin(t * 12) * 0.35 * k;
        } else {
          const settle = spring(t - 53.0, 1.8, 0.45);
          bx = lerp(540 + Math.sin(53 * 6.3) * 250, 540, settle);
        }
        bx = lerp(bx, 850, onChart); by = lerp(by, 700, onChart); bs = lerp(1.0, 0.58, onChart);
        const bIn = Ease.outBack(clamp((t - 51.0) / 0.4));
        const star = Ease.outBackBig(clamp((t - 58.3) / 0.35));
        drawBot(ctx, {
          x: bx, y: by, s: bs * bIn, t, lift, rot, sq: 1 + (hyper ? Math.sin(t * 17) * 0.08 : 0) + wobble(t - 58.3, 3, 5) * 0.12,
          eyes: hyper ? 'spin' : t > 58.3 ? 'happy' : null, mouth: hyper ? 'grin' : t > 58.3 ? 'open' : 'smile',
          look: hyper ? { x: 0, y: 0 } : onChart > 0.5 ? { x: -0.7, y: 0.8 } : { x: 0, y: -0.6 }, blink: blinkAt(t, [53.8, 56.6]),
          sticker: star, antWob: hyper ? Math.sin(t * 20) * 0.4 : 0,
        });
        // outbursts
        for (const [w, t0, dx, dy] of OUTBURSTS) {
          const p = Ease.outBack(clamp((t - t0) / 0.25)), q = clamp((t - t0 - 0.7) / 0.2);
          if (p <= 0.001 || q >= 1) continue;
          ctx.save(); ctx.globalAlpha *= 1 - q; ctx.translate(540 + dx, 1230 + dy); ctx.rotate(dx > 0 ? 0.12 : -0.12); ctx.scale(p, p);
          text(ctx, w, 0, 0, 's9', 64, C.ink); ctx.restore();
        }
        ctx.restore();
      },
    });
    cue(50.55, 'swoosh', { dur: 0.5 });
    cue(51.05, 'hit', { v: 0.7 }); cue(51.33, 'chime', { v: 0.6 });
    OUTBURSTS.forEach(([, t0], i) => cue(t0, 'squeak', { n: i }));
    cue(51.75, 'hit', { v: 0.7 }); cue(52.15, 'wah');
    cue(53.0, 'boing', { v: 0.7 }); cue(53.05, 'whoosh', { dur: 0.3, v: 0.4 });
    THUMBS.forEach((th, i) => cue(th.t + 0.3, 'plop', { n: i, v: 0.5 }));
    cue(53.55, 'scribble', { dur: 0.4, v: 0.6 });
    cue(54.95, 'swoosh', { dur: 0.5 });
    for (let i = 0; i < 20; i++) cue(STAR0 + i * STEP + 0.02, 'star', { n: i });
    cue(57.3, 'whoosh', { dur: 0.3, v: 0.4 });
    cue(58.05, 'impact', { size: 1.0 }); cue(58.05, 'stamp');
    cue(58.3, 'sparkle'); cue(58.35, 'chime', { v: 0.6 });
  }

  /* ==========================================================================
     S9 · THINK (59 – 65) · lilac, thought bubble scratchpad
     ========================================================================== */
  {
    const LT = () => layout('The newest AIs\n{think|si,cobalt} before\nthey talk.', { size: 108, style: 's9', lh: 108 });
    const LA = () => layout('(still working on that one with the kids)', { size: 54, style: 'hd', maxW: 760 });
    const LP = () => layout('Plus, they can:', { size: 112, style: 's9' });
    const LINES = [
      { s: '3 kids × 2 cookies = 6', t: 60.85, c: C.ink },
      { s: 'wait… the dog ate one', t: 61.75, c: C.tomato },
      { s: '= 5 cookies', t: 62.6, c: C.ink },
    ];
    const CLD = { x: 620, y: 1160, w: 760, h: 440 };
    function cloud(ctx, p) {
      const bumps = 16, pts = [];
      for (let k = 0; k < bumps; k++) { const a = (k / bumps) * TAU; pts.push([CLD.x + Math.cos(a) * CLD.w * 0.43, CLD.y + Math.sin(a) * CLD.h * 0.4, (0.21 + 0.04 * Math.sin(k * 2.3)) * CLD.h]); }
      ctx.save(); ctx.translate(CLD.x, CLD.y); ctx.scale(p, p); ctx.translate(-CLD.x, -CLD.y);
      for (const pass of [0, 1]) {
        ctx.fillStyle = pass ? C.paper : C.ink; const e = pass ? 0 : 8;
        for (const [x, y, r] of pts) { circle(ctx, x, y, r + e); ctx.fill(); }
        ctx.beginPath(); ctx.ellipse(CLD.x, CLD.y, CLD.w * 0.43 + e, CLD.h * 0.4 + e, 0, 0, TAU); ctx.fill();
      }
      ctx.restore();
    }

    scene({
      id: 'think', start: 58.7, end: 65.02, clip: blinds(58.7, 0.4, 6),
      draw(ctx, t) {
        fill(ctx, C.lilac);
        // thinking waves from the antenna
        const ax = 225, ay = 1400;
        for (let k = 0; k < 5; k++) {
          const u = fract3((t - 60.3) * 0.5 + k / 5); if (t < 60.3) continue;
          ctx.strokeStyle = alpha(C.paper, 0.35 * (1 - u)); ctx.lineWidth = 6; circle(ctx, ax, ay, 60 + u * 700); ctx.stroke();
        }
        drawText(ctx, LT(), 540, 330, { T: t, at: 59.05, anim: 'rise', stagger: 0.06, out: { at: 63.5, dur: 0.3 } });
        drawText(ctx, LA(), 540, 700, { T: t, at: 59.95, anim: 'fade', stagger: 0.04, out: { at: 63.45, anim: 'fadeOut', dur: 0.25 } });
        drawText(ctx, LP(), 540, 380, { T: t, at: 63.65, anim: 'rise', stagger: 0.07 });

        // Bub thinking
        const bIn = spring(t - 59.3, 1.6, 0.5);
        const cOut = Ease.inBack(clamp((t - 63.45) / 0.3));
        const move = Ease.inOutCubic(clamp((t - 63.5) / 0.5));
        drawBot(ctx, {
          x: lerp(220, 540, move), y: lerp(2200, 1545, bIn) + move * 20, s: 0.75, t,
          antGlow: clamp((t - 60.2) / 0.3) * (0.7 + 0.3 * Math.sin(t * 8)) * (1 - move),
          look: t < 63.5 ? { x: 0.8, y: -0.9 } : { x: 0, y: -0.5 }, blink: blinkAt(t, [61.4, 64.2]),
          mouth: t > 62.6 && t < 63.5 ? 'open' : 'smile', eyes: t > 62.9 && t < 63.5 ? 'happy' : null,
          sq: 1 + wobble(t - 62.9, 3, 5) * 0.1,
        });
        // thought bubble + small puffs
        const cp = Ease.outBack(clamp((t - 60.35) / 0.5)) * (1 - cOut);
        if (cp > 0.001) {
          [[300, 1395, 16, 60.35], [345, 1352, 24, 60.42]].forEach(([x, y, r, t0]) => {
            const p = Ease.outBack(clamp((t - t0) / 0.3)) * (1 - cOut);
            fillCircle(ctx, x, y, (r + 7) * p, C.ink); fillCircle(ctx, x, y, r * p, C.paper);
          });
          cloud(ctx, cp);
          ctx.save(); ctx.translate(CLD.x, CLD.y); ctx.scale(cp, cp); ctx.translate(-CLD.x, -CLD.y);
          // cookies (one gets eaten by the dog)
          for (let k = 0; k < 3; k++) {
            const p = Ease.outBack(clamp((t - 61.05 - k * 0.1) / 0.3));
            icon(ctx, 'cookie', CLD.x - 100 + k * 100, CLD.y - 135, 0.62 * p, k * 0.4, k === 2 ? clamp((t - 61.95) / 0.25) : 0);
          }
          LINES.forEach((ln, i) => {
            const p = clamp((t - ln.t) / 0.7);
            if (p <= 0) return;
            const y = CLD.y - 30 + i * 84;
            setFont(ctx, STY.hd, 58); const w = ctx.measureText(ln.s).width;
            const x0 = CLD.x - w / 2 - (i === 2 ? 40 : 0);
            ctx.save(); ctx.beginPath(); ctx.rect(x0 - 10, y - 80, (w + 20) * p, 110); ctx.clip();
            ctx.fillStyle = ln.c; ctx.textAlign = 'left'; ctx.fillText(ln.s, x0, y); ctx.restore();
            if (p < 1) fillCircle(ctx, x0 + w * p, y - 10, 6, C.ink);
            if (i === 1 && p > 0.3) { // cross out the "6"
              setFont(ctx, STY.hd, 58); const w0 = ctx.measureText(LINES[0].s).width, xe = CLD.x + w0 / 2, y0 = CLD.y - 30;
              const k = Ease.outCubic(clamp((p - 0.3) / 0.3));
              ctx.save(); ctx.strokeStyle = C.tomato; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(xe - 44, y0 - 14); ctx.lineTo(xe - 44 + 58 * k, y0 - 30); ctx.stroke(); ctx.restore();
            }
            if (i === 2) { const ck = clamp((t - ln.t - 0.6) / 0.3); if (ck > 0) { ctx.save(); ctx.translate(x0 + w + 60, y - 22); ctx.scale(0.9, 0.9); Icon.check(ctx, Ease.outCubic(ck), C.mint, 18); ctx.restore(); } }
          });
          ctx.restore();
        }
        // poof when the bubble pops
        if (t > 63.45 && t < 64.1) for (let k = 0; k < 10; k++) {
          const a = (k / 10) * TAU, p = clamp((t - 63.45) / 0.6);
          fillCircle(ctx, CLD.x + Math.cos(a) * (200 + p * 260), CLD.y + Math.sin(a) * (130 + p * 170), 26 * (1 - p), C.paper);
        }
        // tools row
        const tools = [['magnifier', 'search'], ['photo', 'see'], ['wrench', 'use tools']];
        tools.forEach(([ic, lab], i) => {
          const p = Ease.outBackBig(clamp((t - 63.95 - i * 0.16) / 0.45));
          if (p <= 0.001) return;
          const x = 200 + i * 340, y = 830 + Math.sin(t * 4 + i) * 10;
          ctx.save(); ctx.translate(x, y); ctx.scale(p, p);
          fillCircle(ctx, 0, 0, 120, C.paper); ctx.lineWidth = 7; ctx.strokeStyle = C.ink; circle(ctx, 0, 0, 120); ctx.stroke();
          icon(ctx, ic, 0, 0, 1.3, Math.sin(t * 3 + i) * 0.08, ic === 'photo' ? C.paper : C.sun);
          text(ctx, lab, 0, 200, 's8', 58, C.ink);
          ctx.restore();
        });
      },
    });
    const fract3 = (x) => x - Math.floor(x);
    cue(58.7, 'swoosh', { dur: 0.45 });
    cue(59.05, 'whoosh', { dur: 0.3, v: 0.4 }); cue(59.3, 'boing', { v: 0.6 });
    cue(59.95, 'scribble', { dur: 0.5, v: 0.5 });
    cue(60.2, 'hum', { dur: 3.2 }); cue(60.35, 'pop', { n: 2 }); cue(60.42, 'pop', { n: 4 }); cue(60.45, 'bubble');
    LINES.forEach((ln) => cue(ln.t, 'scribble', { dur: 0.7 }));
    [0, 1, 2].forEach((k) => cue(61.05 + k * 0.1, 'pop', { n: k + 3, v: 0.6 }));
    cue(61.95, 'chomp'); cue(63.2, 'ding', { v: 0.8 });
    cue(63.45, 'poof');
    [0, 1, 2].forEach((i) => cue(63.95 + i * 0.16, 'pop', { n: i + 5 }));
  }

  /* ==========================================================================
     S10 · BUT… (65 – 73) · tomato: confident nonsense
     ========================================================================== */
  {
    const LB = () => layout('BUT.', { size: 360, style: 's9', color: C.paper });
    const L1 = () => layout('It predicts what\n{sounds|si,paper} right…', { size: 112, style: 's9', lh: 112 });
    const L2 = () => layout('not what {is|si,paper,u} right.', { size: 112, style: 's9' });
    const L3 = () => layout('So sometimes it\n{makes stuff up.|si,paper}', { size: 112, style: 's9', lh: 112 });
    const L4 = () => layout('With {total confidence.|si,paper}', { size: 80, style: 's8' });
    const L5 = () => layout('Like a 4-year-old\nexplaining where\n{babies come from.|si,paper}', { size: 100, style: 's9', lh: 104 });

    scene({
      id: 'careful', start: 65.0, end: 73.05,
      draw(ctx, t) {
        fill(ctx, C.tomato);
        halftone(ctx, 'rgba(0,0,0,0.08)', W / 2, H / 2, 1200, 44, 6);
        const sh = shake(t, [[65.0, 1.6], [69.25, 0.6]], 30);
        ctx.save(); ctx.translate(sh.x, sh.y);
        // BUT. with RGB split
        const bp = clamp((t - 65.0) / 0.18), bq = Ease.inBack(clamp((t - 65.72) / 0.3));
        if (bp > 0 && bq < 1) {
          const L = LB(); const k = lerp(1.8, 1, Ease.outExpo(bp)) * (1 - bq);
          const g = t < 65.35 ? 1 : 0.25 * Math.max(0, Math.sin(t * 40));
          ctx.save(); ctx.translate(540, 900); ctx.scale(k, k); ctx.rotate(-0.04);
          if (g > 0) {
            ctx.save(); ctx.globalAlpha *= 0.85 * g; ctx.globalCompositeOperation = 'multiply';
            drawText(ctx, L, -16 * g, -L.height / 2, { color: '#00C8FF' }); drawText(ctx, L, 16 * g, -L.height / 2 + 6, { color: '#FFE600' });
            ctx.restore();
          }
          drawText(ctx, L, 0, -L.height / 2, {});
          ctx.restore();
        }
        drawText(ctx, L1(), 540, 340, { T: t, at: 65.9, anim: 'rise', stagger: 0.06, out: { at: 67.85, dur: 0.3 } });
        drawText(ctx, L2(), 540, 620, { T: t, at: 66.85, anim: 'rise', stagger: 0.08, out: { at: 67.9, dur: 0.3 }, decoAt: 67.2, uColor: C.paper });
        drawText(ctx, L3(), 540, 340, { T: t, at: 68.0, anim: 'rise', stagger: 0.06, out: { at: 70.2, dur: 0.3 } });
        drawText(ctx, L4(), 540, 615, { T: t, at: 68.85, anim: 'rise', stagger: 0.08, out: { at: 70.22, dur: 0.3 } });
        drawText(ctx, L5(), 540, 330, { T: t, at: 70.35, anim: 'rise', stagger: 0.06 });

        // Bub, very sure of itself
        const bIn = spring(t - 68.2, 1.6, 0.5);
        const shades = Ease.outBounce(clamp((t - 69.0) / 0.4));
        const swag = t > 69.4 ? Math.sin((t - 69.4) * Math.PI * 2) * 0.06 : 0;
        drawBot(ctx, {
          x: 400, y: lerp(2250, 1300, bIn), s: 0.95, t, rot: swag, lift: t > 69.4 ? Math.abs(Math.sin((t - 69.4) * Math.PI * 2)) * 24 : 0,
          shades, mouth: t > 69.2 ? 'smirk' : 'smile', talk: talkAmt(t, [[68.45, 68.95], [70.4, 71.1]]),
          look: { x: 0.5, y: -0.4 }, blink: blinkAt(t, [68.8]), sq: 1 + wobble(t - 69.3, 3, 5) * 0.1,
        });
        const s1 = Ease.outBack(clamp((t - 68.45) / 0.35)) * (1 - Ease.inBack(clamp((t - 70.15) / 0.2)));
        speech(ctx, 690, 985, 'Fun fact: the Moon is made of cheese.', s1, { size: 54, maxW: 520, rot: 0.03, tail: -200 });
        const s2 = Ease.outBack(clamp((t - 70.4) / 0.35)) * (1 - Ease.inBack(clamp((t - 72.5) / 0.2)));
        speech(ctx, 690, 985, 'Babies come from the baby store. 100% sure.', s2, { size: 54, maxW: 540, rot: 0.03, tail: -200 });
        // double-check pill
        const dp = Ease.outBack(clamp((t - 71.75) / 0.4)) * (1 - Ease.inBack(clamp((t - 72.55) / 0.2)));
        if (dp > 0.001) {
          ctx.save(); ctx.translate(540, 1510); ctx.scale(dp, dp);
          const tw = measure('Double-check the important stuff.', STY.s8, 50) + 150;
          ctx.fillStyle = C.paper; rr(ctx, -tw / 2, -54, tw, 108, 54); ctx.fill(); ctx.lineWidth = 6; ctx.strokeStyle = C.ink; ctx.stroke();
          ctx.save(); ctx.translate(-tw / 2 + 64, 0); ctx.scale(0.55, 0.55); Icon.check(ctx, clamp((t - 71.95) / 0.3), C.mintD, 20); ctx.restore();
          text(ctx, 'Double-check the important stuff.', 30, 17, 's8', 50, C.ink);
          ctx.restore();
        }
        ctx.restore();
        // glitch slices on the cut in
        if (t < 65.16) {
          const R = rng(Math.floor(t * 60)), k = window.RENDER_SCALE || 1;
          for (let i = 0; i < 7; i++) {
            const y = R() * H, h = 30 + R() * 140, dx = (R() - 0.5) * 160;
            ctx.drawImage(ctx.canvas, 0, y * k, W * k, h * k, dx, y, W, h);
          }
        }
      },
    });
    cue(65.0, 'scratch'); cue(65.0, 'impact', { size: 1.3 }); cue(65.02, 'glitch', { dur: 0.3 });
    cue(65.72, 'whoosh', { dur: 0.3, v: 0.5 });
    cue(65.9, 'whoosh', { dur: 0.3, v: 0.3 }); cue(66.85, 'hit', { v: 0.6 }); cue(67.2, 'scribble', { dur: 0.4, v: 0.5 });
    cue(68.0, 'whoosh', { dur: 0.3, v: 0.3 }); cue(68.2, 'boing', { v: 0.6 }); cue(68.45, 'pop', { n: 3 });
    cue(69.0, 'whoosh', { dur: 0.35, v: 0.6, dir: 'down' }); cue(69.25, 'shades');
    cue(70.2, 'swoosh', { dur: 0.3 }); cue(70.4, 'pop', { n: 5 });
    cue(71.75, 'pop', { n: 2 }); cue(71.95, 'ding', { v: 0.6 });
  }

  /* ==========================================================================
     S11 · OUTRO (73 – 81) · cream: recap, share, loop
     ========================================================================== */
  {
    const LQ = () => layout('So… is it\n{magic?|si,cobalt}', { size: 140, style: 's9', lh: 136 });
    const LN = () => layout('Nope.', { size: 250, style: 's9', color: C.tomato });
    const E1 = () => layout('Autocomplete', { size: 104, style: 's9' });
    const E2 = () => layout('+ the {whole internet|si,cobalt}', { size: 96, style: 's9' });
    const E3 = () => layout('+ a {sticker chart|si,tomato}', { size: 96, style: 's9' });
    const E4 = () => layout('= today’s AI.', { size: 112, style: 's9' });
    const LSH = () => layout('Send this to a parent\nwho thinks it’s {magic.|si,cobalt}', { size: 94, style: 's9', lh: 100 });
    const LG1 = () => layout('Go brush', { size: 196, style: 's9' });
    const LG2 = () => layout('your', { size: 196, style: 's9' });
    const FAM = [
      { x: 205, h: 300, w: 130, hr: 70, skin: C.skin2, hair: '#2B1B12', hairStyle: 'bob', shirt: C.cobalt, t: 77.3 },
      { x: 395, h: 190, w: 116, hr: 64, skin: C.skin1, hair: '#6B3F1F', hairStyle: 'curly', shirt: C.sun, t: 77.45 },
      { x: 540, h: 150, w: 104, hr: 60, skin: C.skin2, hair: '#2B1B12', hairStyle: 'curly', shirt: C.pink, t: 77.55 },
      { x: 685, h: 220, w: 118, hr: 64, skin: C.skin1, hair: '#C7862E', hairStyle: 'bob', shirt: C.mint, t: 77.65 },
      { x: 875, h: 320, w: 136, hr: 72, skin: C.skin1, hair: '#6B3F1F', hairStyle: null, shirt: C.tomato, t: 77.8 },
    ];

    scene({
      id: 'outro', start: 72.55, end: 81.0, clip: iris(72.55, 0.5, 400, 1250, Ease.inCubic),
      draw(ctx, t) {
        fill(ctx, C.cream);
        const sh = shake(t, [[74.0, 1.0]], 24);
        ctx.save(); ctx.translate(sh.x, sh.y);
        drawText(ctx, LQ(), 540, 360, { T: t, at: 73.05, anim: 'rise', stagger: 0.08, out: { at: 74.5, dur: 0.3 } });
        drawText(ctx, LN(), 540, 760, { T: t, at: 74.0, anim: 'slam', dur: 0.22, out: { at: 74.55, anim: 'riseOut', dur: 0.3 } });
        // poof of fading magic sparkles
        if (t > 74.0 && t < 74.9) for (let k = 0; k < 9; k++) {
          const a = (k / 9) * TAU + 0.3, p = clamp((t - 74.0) / 0.8);
          sparkle(ctx, 540 + Math.cos(a) * (280 + p * 200), 860 + Math.sin(a) * (180 + p * 150), 30 * (1 - p), [C.sun, C.cobalt, C.tomato][k % 3], p * 4);
        }
        // equation
        const eOut = { at: 76.9, dur: 0.3 };
        drawText(ctx, E1(), 540, 350, { T: t, at: 74.6, anim: 'slam', dur: 0.24, out: eOut });
        drawText(ctx, E2(), 540, 500, { T: t, at: 75.1, anim: 'rise', stagger: 0.06, out: eOut });
        drawText(ctx, E3(), 540, 640, { T: t, at: 75.6, anim: 'rise', stagger: 0.06, out: eOut });
        const dl = Ease.inOutCubic(clamp((t - 76.0) / 0.3)) * (1 - clamp((t - 76.9) / 0.2));
        if (dl > 0) { ctx.fillStyle = C.ink; rr(ctx, 540 - 380 * dl, 790, 760 * dl, 10, 5); ctx.fill(); }
        drawText(ctx, E4(), 540, 830, { T: t, at: 76.15, anim: 'pop', per: 'char', stagger: 0.03, out: eOut });
        // share CTA
        drawText(ctx, LSH(), 540, 360, { T: t, at: 77.05, anim: 'rise', stagger: 0.06, out: { at: 79.0, dur: 0.3 } });
        const shp = Ease.outBack(clamp((t - 77.6) / 0.4)) * (1 - Ease.inBack(clamp((t - 79.0) / 0.25)));
        if (shp > 0.001) icon(ctx, 'share', 900, 690, 1.1 * shp, Math.sin(t * 6) * 0.15, C.sun);
        // family of five + Bub
        const famOut = Ease.inBack(clamp((t - 79.0) / 0.3));
        FAM.forEach((f, i) => {
          const p = Ease.outBack(clamp((t - f.t) / 0.4)) * (1 - famOut);
          if (p <= 0.001) return;
          const hop = Math.max(0, Math.sin((t - 77.9) * Math.PI * 2 + i * 0.9)) * 26 * clamp((t - 77.9) / 0.2);
          drawPerson(ctx, { x: f.x, y: 1585, s: p, h: f.h, w: f.w, hr: f.hr, skin: f.skin, hair: f.hair, hairStyle: f.hairStyle, shirt: f.shirt, lift: hop, wave: i === 0 || i === 4 ? Math.sin(t * 8 + i) * 0.5 + 0.6 : Math.sin(t * 6 + i) * 0.3 });
        });
        // Bub cameo: pops up during the recap, floats above the family
        const bp = Ease.outBack(clamp((t - 76.15) / 0.45)) * (1 - famOut);
        if (bp > 0.001) {
          const flo = Math.sin(t * 3) * 14;
          drawBot(ctx, {
            x: 540, y: lerp(1260, 1050, Ease.inOutCubic(clamp((t - 77.0) / 0.5))) + flo, s: 0.72 * bp, t, sticker: 1, glasses: 0,
            antGlow: 0.6 + 0.4 * Math.sin(t * 6), eyes: 'happy', mouth: 'open', shadow: false, rot: Math.sin(t * 2.5) * 0.06,
          });
        }
        // loop: "Now go brush your ▮"
        const np = Ease.outBack(clamp((t - 79.3) / 0.4)), nq = clamp((t - 80.55) / 0.2);
        if (np > 0.001 && nq < 1) { ctx.save(); ctx.globalAlpha *= 1 - nq; ctx.translate(540, 560); ctx.rotate(-0.05); ctx.scale(np, np); text(ctx, 'now, kids…', 0, 20, 'hd', 84, C.tomato); ctx.restore(); }
        drawText(ctx, LG1(), 540, 770 - 150, { T: t, at: 79.45, anim: 'slam', stagger: 0.16, dur: 0.24, out: { at: 80.6, dur: 0.25 } });
        drawText(ctx, LG2(), 540, 950 - 150, { T: t, at: 79.8, anim: 'slam', dur: 0.24, out: { at: 80.64, dur: 0.25 } });
        if (t < 80.7) blank(ctx, 540, 1130 - 64, measure('teeth.', STY.s9, 196) + 10, 150, t, { at: 80.0, squash: Ease.inQuad(clamp((t - 80.5) / 0.2)) });
        ctx.restore();
      },
    });
    cue(72.55, 'swoosh', { dur: 0.5 });
    cue(73.05, 'whoosh', { dur: 0.3, v: 0.4 }); cue(73.45, 'sparkle');
    cue(74.0, 'impact', { size: 0.9 }); cue(74.02, 'pfft');
    cue(74.6, 'hit'); cue(75.1, 'hit', { v: 0.7 }); cue(75.6, 'hit', { v: 0.7 }); cue(76.0, 'swipe'); cue(76.15, 'chime');
    cue(76.9, 'swoosh', { dur: 0.3 });
    cue(77.05, 'whoosh', { dur: 0.3, v: 0.4 });
    FAM.forEach((f, i) => cue(f.t, 'pop', { n: i }));
    cue(77.6, 'boing', { v: 0.6 });
    cue(79.0, 'swoosh', { dur: 0.3 });
    cue(79.3, 'scribble', { dur: 0.35, v: 0.5 }); cue(79.45, 'pop', { n: 0 }); cue(79.61, 'pop', { n: 1 }); cue(79.8, 'pop', { n: 2 }); cue(80.0, 'swipe');
    [80.5].forEach((x) => cue(x, 'tick'));
    cue(80.62, 'whoosh', { dur: 0.3, v: 0.4 });
  }

  /* expose */
  window.SCENES = SCENES; window.CUES = CUES; window.CHAPTERS = CHAPTERS; window.DURATION = DURATION; window.overlays = OVERLAYS;
  window.__cue = cue; window.__scene = scene;
})();

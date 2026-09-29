// S07 — LAYERS (32–36s): camera rises through a stack of transformer layers with pulses of data,
//        "U DAN JIĠRI… GĦEXIEREN TA' DRABI." → wall of parameter dials "B'BILJUNI TA' PARAMETRI." → white-out
(function (G) {
  const { W, H, C, TAU, clamp, lerp, prog, Ease, rgba, mix, noise1, noise2, rnd, rndr, fitSize, layout, drawGlyphs, shake, spring, text, kf, makeCam } = M;
  const XL = 72, XW = W - 144;
  const N = 32, GAP = 230, HALF = 360, GRID = 7;

  function slabs(ctx, lt) {
    const rise = Ease.inOutQuad(prog(lt, 0.0, 2.55));
    const cam = makeCam({ x: 0, y: lerp(260, -N * GAP + 400, rise), z: 0, yaw: 0.62 + lt * 0.12, pitch: -0.52, dist: 1500, fov: 1250, cy: 1010 });
    const order = [];
    for (let k = 0; k < N; k++) order.push(k);
    // draw from bottom (farthest when looking down) to top
    const slabY = (k) => -k * GAP;
    // vertical connections + pulses
    for (let k = 0; k < N - 1; k++) {
      for (let c = 0; c < 6; c++) {
        const i = Math.floor(rnd(k * 10 + c, 3) * GRID), j = Math.floor(rnd(k * 10 + c, 4) * GRID);
        const i2 = Math.floor(rnd(k * 10 + c, 5) * GRID), j2 = Math.floor(rnd(k * 10 + c, 6) * GRID);
        const gx = (u) => -HALF + (u + 0.5) * ((2 * HALF) / GRID);
        const a = cam(gx(i), slabY(k), gx(j)), b = cam(gx(i2), slabY(k + 1), gx(j2));
        if (a.z < 60 || b.z < 60) continue;
        ctx.strokeStyle = rgba(C.sky, 0.16);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
        const u = (lt * 1.6 + rnd(k * 10 + c, 7)) % 1;
        const px = lerp(a.x, b.x, u), py = lerp(a.y, b.y, u);
        M.glowDot(ctx, px, py, 16 * a.s, C.yellow, 0.9);
      }
    }
    for (let k = 0; k < N; k++) {
      const y = slabY(k);
      const corners = [[-HALF, -HALF], [HALF, -HALF], [HALF, HALF], [-HALF, HALF]].map(([x, z]) => cam(x, y, z));
      if (corners.some((q) => q.z < 60)) continue;
      const near = clamp(1 - Math.abs(corners[0].z - 1500) / 2200);
      ctx.beginPath();
      corners.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)));
      ctx.closePath();
      ctx.fillStyle = rgba(C.sky, 0.05 + 0.05 * near);
      ctx.fill();
      ctx.strokeStyle = rgba(C.sky, 0.25 + 0.5 * near);
      ctx.lineWidth = 2;
      ctx.stroke();
      // nodes
      for (let i = 0; i < GRID; i++) {
        for (let j = 0; j < GRID; j++) {
          const gx = -HALF + (i + 0.5) * ((2 * HALF) / GRID), gz = -HALF + (j + 0.5) * ((2 * HALF) / GRID);
          const q = cam(gx, y, gz);
          const act = noise2(i * 0.7 + lt * 2.2, j * 0.7 + k * 3.1, 9) * 0.5 + 0.5;
          const on = act > 0.72;
          const r = (on ? 7 : 4) * q.s;
          ctx.fillStyle = on ? rgba(C.yellow, 0.95) : rgba(C.paper, 0.35 + 0.3 * near);
          ctx.fillRect(q.x - r, q.y - r, r * 2, r * 2);
        }
      }
      // label
      const lq = corners[3];
      text(ctx, `SAFF ${String(k + 1).padStart(2, '0')}`, lq.x - 10, lq.y + 36 * lq.s, { f: 'JB', w: 700, s: clamp(26 * lq.s * 1.2, 12, 40), color: C.sky, alpha: 0.5 + 0.5 * near, align: 'right' });
    }
  }

  function dials(ctx, lt) {
    const k = lt - 2.25;
    const zoomOut = Ease.inOutCubic(prog(k, 0, 1.2));
    const sc = lerp(2.4, 0.75, zoomOut);
    const cell = 64;
    const conv = Ease.inExpo(prog(lt, 3.45, 3.9));
    ctx.save();
    ctx.translate(W / 2, 1000);
    ctx.scale(sc * (1 - conv * 0.9), sc * (1 - conv * 0.9));
    ctx.rotate(conv * 0.8);
    const cols = 26, rows = 40;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = (c - cols / 2 + 0.5) * cell, y = (r - rows / 2 + 0.5) * cell;
        const born = clamp((k * 3 - Math.hypot(x, y) / 600) * 1.5);
        if (born <= 0) continue;
        const ang = noise2(c * 0.35 + lt * 0.9, r * 0.35, 21) * Math.PI * 1.6 + lt * (rnd(r * 99 + c, 22) - 0.5) * 3;
        const hot = rnd(r * 99 + c, 23) > 0.9;
        const rad = 22 * born;
        ctx.strokeStyle = hot ? C.yellow : rgba(C.paper, 0.55);
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x, y, rad, 0, TAU);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(ang) * rad, y + Math.sin(ang) * rad);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  addScene({
    name: 'layers',
    t0: TL.S.layers[0],
    t1: TL.S.layers[1],
    draw(ctx, lt, t) {
      ctx.fillStyle = C.ink;
      ctx.fillRect(0, 0, W, H);
      L.bgGlow(ctx, W / 2, 1000, 1000, '#16306E', 0.45);
      const toDials = Ease.inOutCubic(prog(lt, 2.1, 2.4));
      if (toDials < 1) {
        ctx.save();
        ctx.globalAlpha = 1 - toDials;
        slabs(ctx, lt);
        ctx.restore();
      }
      if (lt > 2.1) dials(ctx, lt);

      // legibility gradient for text
      const g = ctx.createLinearGradient(0, 1150, 0, 1600);
      g.addColorStop(0, rgba(C.ink, 0));
      g.addColorStop(0.35, rgba(C.ink, 0.75));
      g.addColorStop(1, rgba(C.ink, 0.9));
      ctx.fillStyle = g;
      ctx.fillRect(0, 1150, W, 450);

      // text
      const conv = prog(lt, 3.45, 3.8);
      const p0 = Ease.snap(prog(lt, 0.05, 0.4));
      const out0 = Ease.inQuart(prog(lt, 1.15, 1.3));
      if (out0 < 1) {
        const s = fitSize(ctx, 'U DAN JIĠRI…', XW * 0.86, 'A', 900, 100);
        drawGlyphs(ctx, 'U DAN JIĠRI…', XL, 1360 + (1 - p0) * 60 - out0 * 60, { f: 'A', w: 900, s, wd: 100, color: C.paper }, (i) => ({ alpha: clamp((lt - i * 0.03) / 0.2) * (1 - out0) }));
      }
      const k1 = lt - 1.25;
      if (k1 > 0 && lt < 2.3) {
        const out = Ease.inQuart(prog(lt, 2.1, 2.25));
        const sA = fitSize(ctx, 'GĦEXIEREN', XW, 'A', 900, 80);
        drawGlyphs(ctx, 'GĦEXIEREN', XL, 1300, { f: 'A', w: 900, s: sA, wd: 80, color: C.yellow }, (i) => {
          const p = Ease.snap(clamp((k1 - i * 0.02) / 0.3));
          return { dy: (1 - p) * 70 - out * 80, alpha: p * (1 - out), sy: lerp(1.5, 1, p) };
        });
        text(ctx, "TA' DRABI.", XL, 1300 + 120, { f: 'A', w: 900, s: 110, wd: 125, color: C.paper, alpha: Ease.snap(clamp((k1 - 0.15) / 0.3)) * (1 - out) });
        // layer counter
        const cnt = Math.min(N, 1 + Math.floor(Ease.inOutQuad(prog(lt, 0, 2.55)) * N));
        text(ctx, `× ${cnt} saffi`, W - XL, 1300 + 120, { f: 'JB', w: 700, s: 40, color: C.sky, align: 'right', alpha: clamp(k1 * 4) * (1 - out) });
      }
      const k2 = lt - 2.25;
      if (k2 > 0) {
        const out = Ease.inQuart(conv);
        ctx.save();
        ctx.globalAlpha = 1 - out;
        text(ctx, "B'BILJUNI", XL, 1300, { f: 'A', w: 900, s: fitSize(ctx, "B'BILJUNI", XW, 'A', 900, 88), wd: 88, color: C.paper, alpha: Ease.snap(clamp(k2 / 0.3)) });
        text(ctx, "TA' PARAMETRI.", XL, 1420, { f: 'A', w: 900, s: fitSize(ctx, "TA' PARAMETRI.", XW, 'A', 900, 72), wd: 72, color: C.yellow, alpha: Ease.snap(clamp((k2 - 0.12) / 0.3)) });
        // spinning parameter odometer
        ctx.font = M.fontStr('JB', 700, 40);
        for (let d = 0; d < 12; d++) {
          const v = (k2 * (5 + (12 - d) * 4) + d * 0.3) % 10;
          const x = XL + d * 32 + Math.floor(d / 3) * 14, yb = 1130;
          ctx.save();
          ctx.beginPath();
          ctx.rect(x - 2, yb - 40, 30, 50);
          ctx.clip();
          for (let q = -1; q <= 1; q++) {
            ctx.fillStyle = rgba(C.paper, 0.8);
            ctx.fillText(String((Math.floor(v) + q + 10) % 10), x, yb - (q - (v % 1)) * 44);
          }
          ctx.restore();
        }
        text(ctx, 'parametri', XL + 12 * 32 + 4 * 14 + 10, 1130, { f: 'JB', w: 500, s: 28, color: C.sky });
        ctx.restore();
      }
      // white-out point → next scene (cream)
      const wo = prog(lt, 3.55, 4.0);
      if (wo > 0) {
        const r = lerp(0, 2300, Ease.inExpo(wo));
        M.glowDot(ctx, W / 2, 1000, 60 + r * 0.6, C.paper, clamp(wo * 3));
        M.circle(ctx, W / 2, 1000, r);
        ctx.fillStyle = C.paper;
        ctx.fill();
      }
    },
    fx(fx, lt) {
      fx.bloom = 0.4;
      fx.bloomThr = 0.5;
      fx.vig = 0.5;
      const conv = prog(lt, 3.45, 4.0);
      fx.ca += conv * 1.5;
    },
    mb(lt) {
      if (lt < 2.6) return 6;
      if (lt > 3.4) return 8;
      return 4;
    },
  });
})(window);

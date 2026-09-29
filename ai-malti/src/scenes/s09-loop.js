// S09 — LOOP (44–48s): the autoregressive loop. INBASSAR → NAGĦŻEL → INŻID, a comet orbits faster and faster
//        while "Bonġu! Kif nista' ngħinek illum?" is written token by token → "KELMA B'KELMA." stamp
(function (G) {
  const { W, H, C, TAU, clamp, lerp, prog, Ease, rgba, mix, noise1, rnd, rndr, fitSize, layout, drawGlyphs, shake, spring, text, kf } = M;
  const XL = 72, XW = W - 144;
  const CX = 540, CY = 820, R = 330;
  const NODES = [
    { a: -90, w: 'INBASSAR', col: C.sky },
    { a: 30, w: 'NAGĦŻEL', col: C.yellow },
    { a: 150, w: 'INŻID', col: C.green },
  ];
  const TOKS = ['Bon', 'ġu', '!', ' Kif', ' nista', "'", ' ngħ', 'inek', ' illum', '?'];
  const TT = [2.0, 2.3, 2.55, 2.76, 2.93, 3.07, 3.19, 3.29, 3.38, 3.46]; // local times tokens are appended
  // comet angle keyframes (degrees): one lap per token after 2.0s
  const KEYS = [[-0.3, -90], [0.0, 30, Ease.inOutCubic], [0.75, 150, Ease.inOutCubic], [1.5, 270, Ease.inOutCubic], [2.0, 510, Ease.inOutCubic]];
  for (let i = 1; i < TT.length; i++) KEYS.push([TT[i], 150 + 360 * (i + 1), Ease.lin]);
  KEYS.push([4.0, 150 + 360 * TT.length + 700, Ease.outCubic]);
  const LINES = [['NAGĦŻEL', 'WAĦDA.', 0.0], ['INŻIDHA.', '', 0.75], ["U NERĠA'", 'NIBDA.', 1.5]];

  addScene({
    name: 'loop',
    t0: TL.S.loop[0],
    t1: TL.S.loop[1],
    draw(ctx, lt, t) {
      ctx.fillStyle = C.ink;
      ctx.fillRect(0, 0, W, H);
      L.bgDots(ctx, t, { alpha: 0.06 });
      const ang = kf(lt, KEYS) * (Math.PI / 180);
      const speed = (kf(lt + 0.01, KEYS) - kf(lt, KEYS)) / 0.01; // deg/s
      const ent = Ease.snap(prog(lt, -0.05, 0.35));
      const sh = shake(lt, [[0, 0.8], [0.75, 0.6], [1.5, 0.6], [3.5, 1.2]], 14, 10);
      ctx.save();
      ctx.translate(sh.dx, sh.dy);

      // ring
      ctx.save();
      ctx.translate(CX, CY);
      ctx.strokeStyle = rgba(C.paper, 0.18);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, R, 0, TAU * ent);
      ctx.stroke();
      // arrow segments between nodes
      for (let i = 0; i < 3; i++) {
        const a0 = (NODES[i].a + 18) * (Math.PI / 180), a1 = (NODES[i].a + 102) * (Math.PI / 180);
        ctx.strokeStyle = rgba(C.paper, 0.55 * ent);
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(0, 0, R, a0, a1);
        ctx.stroke();
        const hx = Math.cos(a1) * R, hy = Math.sin(a1) * R, tan = a1 + Math.PI / 2;
        ctx.fillStyle = rgba(C.paper, 0.55 * ent);
        ctx.beginPath();
        ctx.moveTo(hx + Math.cos(tan) * 16, hy + Math.sin(tan) * 16);
        ctx.lineTo(hx + Math.cos(tan + 2.5) * 20, hy + Math.sin(tan + 2.5) * 20);
        ctx.lineTo(hx + Math.cos(tan - 2.5) * 20, hy + Math.sin(tan - 2.5) * 20);
        ctx.fill();
      }
      // comet with trail (drawn as fading arc segments; motion blur adds the rest)
      const trail = clamp(Math.abs(speed) / 1400, 0.15, 1.6);
      for (let k = 0; k < 24; k++) {
        const a = ang - (k / 24) * trail;
        ctx.fillStyle = rgba(C.yellow, (1 - k / 24) * 0.8);
        M.circle(ctx, Math.cos(a) * R, Math.sin(a) * R, 14 * (1 - k / 30));
        ctx.fill();
      }
      M.glowDot(ctx, Math.cos(ang) * R, Math.sin(ang) * R, 70, C.yellow, 0.9);
      // nodes
      for (let i = 0; i < 3; i++) {
        const n = NODES[i];
        const a = n.a * (Math.PI / 180);
        const x = Math.cos(a) * R, y = Math.sin(a) * R;
        let d = Math.abs(((ang - a) % TAU + TAU + Math.PI) % TAU - Math.PI);
        const hot = Math.exp(-d * 6);
        const p = spring(lt - 0.05 - i * 0.08, 3, 0.45);
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(p * (1 + 0.18 * hot), p * (1 + 0.18 * hot));
        ctx.fillStyle = mix(C.ink2, n.col, 0.25 + 0.75 * hot);
        M.circle(ctx, 0, 0, 62);
        ctx.fill();
        ctx.strokeStyle = n.col;
        ctx.lineWidth = 5;
        ctx.stroke();
        // icon glyphs
        ctx.fillStyle = hot > 0.5 ? C.ink : n.col;
        ctx.strokeStyle = hot > 0.5 ? C.ink : n.col;
        ctx.lineWidth = 7;
        ctx.lineCap = 'round';
        if (i === 0) { for (let b = 0; b < 3; b++) ctx.fillRect(-26 + b * 20, 14 - [16, 34, 24][b], 13, [16, 34, 24][b] + 8); }
        else if (i === 1) { ctx.beginPath(); ctx.moveTo(-22, 2); ctx.lineTo(-6, 18); ctx.lineTo(24, -16); ctx.stroke(); }
        else { ctx.beginPath(); ctx.moveTo(-22, 0); ctx.lineTo(22, 0); ctx.moveTo(0, -22); ctx.lineTo(0, 22); ctx.stroke(); }
        ctx.restore();
        const lx = Math.cos(a) * (R + 118), ly = Math.sin(a) * (R + 118);
        text(ctx, n.w, lx, ly + (i === 0 ? -8 : 36), { f: 'JB', w: 800, s: 32, color: n.col, align: 'center', alpha: p, track: 3 });
      }
      ctx.restore();

      // centre line text (slot swaps)
      const step = lt < 0.75 ? 0 : lt < 1.5 ? 1 : 2;
      const endC = Ease.inQuart(prog(lt, 1.95, 2.1));
      if (endC < 1) {
        const [a, b, at] = LINES[step];
        const p = Ease.snap(prog(lt, at, at + 0.22));
        ctx.save();
        ctx.globalAlpha = 1 - endC;
        const s = 92;
        ctx.beginPath();
        ctx.arc(CX, CY, R - 70, 0, TAU);
        ctx.clip();
        const yy = CY + (b ? -8 : 34);
        text(ctx, a, CX, yy + (1 - p) * 120, { f: 'A', w: 900, s, wd: 78, color: C.paper, align: 'center' });
        if (b) text(ctx, b, CX, yy + 92 + (1 - p) * 160, { f: 'A', w: 900, s, wd: 78, color: [C.yellow, C.green, C.sky][step], align: 'center' });
        ctx.restore();
      }
      // generated sentence in a chat bubble
      const bub = Ease.snap(prog(lt, 1.8, 2.1));
      if (bub > 0) {
        const n = TT.filter((x) => lt >= x).length;
        const s = Math.min(64, fitSize(ctx, TOKS.join(''), XW - 80, 'A', 800, 86));
        const bw = XW, bh = 150, bx = XL, by = 1300;
        ctx.save();
        ctx.globalAlpha = bub;
        ctx.translate(0, (1 - bub) * 60);
        ctx.fillStyle = C.paper;
        M.rrect(ctx, bx, by, bw, bh, 40);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(bx + 90, by);
        ctx.lineTo(bx + 120, by - 34);
        ctx.lineTo(bx + 150, by);
        ctx.fill();
        text(ctx, 'AI', bx + 34, by + 46, { f: 'JB', w: 800, s: 24, color: C.red, track: 3 });
        // draw tokens with alternating subtle underlines
        let x = bx + 34;
        TOKS.slice(0, n).forEach((tk, i) => {
          const age = lt - TT[i];
          const w = M.textWidth(ctx, tk, 'A', 800, s, 86);
          const pop = Ease.outBack(clamp(age / 0.12), 3);
          ctx.fillStyle = rgba([C.yellow, C.green, C.sky, C.pink][i % 4], 0.55);
          ctx.fillRect(x + (tk.startsWith(' ') ? M.textWidth(ctx, ' ', 'A', 800, s, 86) : 0), by + 116, w - (tk.startsWith(' ') ? M.textWidth(ctx, ' ', 'A', 800, s, 86) : 0) - 2, 7);
          ctx.save();
          ctx.translate(x, by + 104);
          ctx.scale(1, pop);
          text(ctx, tk, 0, 0, { f: 'A', w: 800, s, wd: 86, color: i === n - 1 && age < 0.15 ? C.red : C.ink });
          ctx.restore();
          x += w;
        });
        if (n < TOKS.length && Math.floor(lt * 8) % 2 === 0) {
          ctx.fillStyle = C.red;
          ctx.fillRect(x + 4, by + 56, 8, 56);
        }
        ctx.restore();
        // counter
        text(ctx, `tokens: ${String(n).padStart(2, '0')}`, W - XL, by - 30, { f: 'JB', w: 700, s: 28, color: C.paper, align: 'right', alpha: bub * 0.7 });
      }
      // flying token chips from the INŻID node to the bubble
      for (let i = 0; i < TT.length; i++) {
        const p = prog(lt, TT[i] - 0.14, TT[i]);
        if (p <= 0 || p >= 1) continue;
        const a = 150 * (Math.PI / 180);
        const x0 = CX + Math.cos(a) * R, y0 = CY + Math.sin(a) * R;
        const x1 = XL + 80 + i * 70, y1 = 1370;
        const e = Ease.inCubic(p);
        M.glowDot(ctx, lerp(x0, x1, e), lerp(y0, y1, e), 40, C.green, 1);
      }
      ctx.restore();

      // stamp
      const st = lt - 3.5;
      if (st > 0) {
        const p = Ease.outBack(clamp(st / 0.18), 2.4);
        const s = fitSize(ctx, "KELMA B'KELMA.", XW + 40, 'A', 900, 72);
        ctx.save();
        ctx.translate(W / 2, 1070);
        ctx.rotate(-0.06);
        ctx.scale(lerp(2.2, 1, p), lerp(2.2, 1, p));
        ctx.globalAlpha = clamp(st / 0.08);
        ctx.fillStyle = C.red;
        const tw = M.textWidth(ctx, "KELMA B'KELMA.", 'A', 900, s, 72);
        ctx.fillRect(-tw / 2 - 30, -s * 0.72 - 24, tw + 60, s * 0.72 + 48);
        text(ctx, "KELMA B'KELMA.", -tw / 2, 0 + 12, { f: 'A', w: 900, s, wd: 72, color: C.paper });
        ctx.restore();
      }
    },
    fx(fx, lt) {
      fx.bloom = 0.3;
      fx.bloomThr = 0.6;
      fx.vig = 0.45;
    },
    mb(lt) {
      if (lt > 1.9 && lt < 3.7) return 8;
      return 4;
    },
  });
})(window);

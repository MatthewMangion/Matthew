// S99 — COVER (rendered as a still at t = 100.5, outside the edit): the post thumbnail.
// Built for the 3:4 grid crop too: everything important sits inside y 240–1680.
(function (G) {
  const { W, H, C, TAU, clamp, lerp, prog, Ease, rgba, fitSize, text, drawGlyphs } = M;
  const XL = 72, XW = W - 144;
  addScene({
    name: 'cover',
    push: false,
    t0: 100,
    t1: 101,
    draw(ctx, lt, t) {
      ctx.fillStyle = C.blue;
      ctx.fillRect(0, 0, W, H);
      // hull stripes
      for (let k = 0; k < 5; k++) {
        ctx.strokeStyle = rgba(C.paper, 0.07 + k * 0.02);
        ctx.lineWidth = 6;
        ctx.beginPath();
        for (let x = 0; x <= W; x += 12) {
          const y = 1560 + k * 50 + Math.sin(x * 0.011 + k) * 18;
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      // halo + the luzzu eye
      L.bgGlow(ctx, W / 2, 560, 600, C.sky, 0.35);
      L.luzzuEye(ctx, W / 2, 560, 270, 1, [0.25, 0.35], { draw: 1, lw: 13, stroke: C.yellow, iris: C.red, pupil: C.ink });
      // headline
      text(ctx, 'KIF TAĦDEM', XL, 1000, { f: 'A', w: 900, s: fitSize(ctx, 'KIF TAĦDEM', XW, 'A', 900, 84), wd: 84, color: C.paper });
      const sAI = fitSize(ctx, 'L-AI?', XW, 'A', 900, 125);
      // offset-extruded "L-AI?"
      for (let k = 6; k >= 1; k--) text(ctx, 'L-AI?', XL + k * 8, 1000 + sAI * 0.78 + k * 8, { f: 'A', w: 900, s: sAI, wd: 125, color: [C.red, C.yellow, C.ink][k % 3] });
      text(ctx, 'L-AI?', XL, 1000 + sAI * 0.78, { f: 'A', w: 900, s: sAI, wd: 125, color: C.yellow });
      text(ctx, "f'60 sekonda, bil-Malti", XL + 4, 1000 + sAI * 0.78 + 120, { f: 'IS', s: 84, color: C.paper });
      // series chip
      const cy = 300;
      ctx.fillStyle = C.ink;
      M.rrect(ctx, XL, cy - 46, 470, 70, 35);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.fillRect(XL + 24, cy - 28, 14, 30);
      ctx.fillStyle = C.red;
      ctx.fillRect(XL + 38, cy - 28, 14, 30);
      text(ctx, 'AI BIL-MALTI · EP.01', XL + 70, cy + 1, { f: 'JB', w: 800, s: 28, color: C.paper, track: 2 });
      // corner sticker
      ctx.save();
      ctx.translate(W - 190, 1500);
      ctx.rotate(-0.12);
      ctx.fillStyle = C.yellow;
      ctx.beginPath();
      for (let j = 0; j < 24; j++) {
        const a = (j / 24) * TAU, r = j % 2 ? 150 : 124;
        j ? ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r) : ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fill();
      text(ctx, 'irkotta', 0, -18, { f: 'A', w: 900, s: 44, color: C.red, align: 'center' });
      text(ctx, 'jew', 0, 22, { f: 'IS', s: 40, color: C.ink, align: 'center' });
      text(ctx, 'piżelli?', 0, 64, { f: 'A', w: 900, s: 44, color: C.green, align: 'center' });
      ctx.restore();
    },
    fx(fx) {
      fx.vig = 0.35;
      fx.bloom = 0.15;
      fx.grain = 0.01;
      fx.ca = 0.1;
    },
    mb() {
      return 1;
    },
  });
})(window);

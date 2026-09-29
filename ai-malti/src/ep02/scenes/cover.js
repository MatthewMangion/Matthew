// EP02 COVER (rendered as a still at t = 100.5): the post thumbnail. Key content inside y 240–1680 for the 3:4 grid crop.
(function () {
  const { W, H, TAU, rgba, text, fitSize } = M;
  const { P, XL, XW, floor, glasses, lace, rr, tilePattern } = K;
  addScene({
    name: 'cover',
    t0: 100,
    t1: 101,
    push: false,
    draw(ctx) {
      floor(ctx, 'rosette', [P.teal, P.cream, P.ochre, P.terra], 180, 0, 0);
      const g = ctx.createRadialGradient(W / 2, 900, 100, W / 2, 900, 1100);
      g.addColorStop(0, rgba(P.ink, 0.8));
      g.addColorStop(1, rgba(P.ink, 0.95));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      lace(ctx, W / 2, 560, 420, { t: 0, alpha: 0.22, col: P.cream });
      glasses(ctx, W / 2, 560, 1.05, { t: 1.3, glint: 0.35, chain: 1 });
      const lines = [['IN-NANNA', 125, P.cream], ['KIENET TAF', 74, P.ochre], ['KIF TAĦDEM', 96, P.cream], ['L-AI?', 125, P.yellow, 560]];
      let y = 900;
      for (const [s, wd, col, width] of lines) {
        const size = fitSize(ctx, s, width || XW, 'A', 900, wd);
        y += size * 0.72;
        for (let d = 8; d >= 2; d -= 2) text(ctx, s, XL + d, y + d, { f: 'A', w: 900, s: size, wd, color: P.ink });
        text(ctx, s, XL, y, { f: 'A', w: 900, s: size, wd, color: col });
        y += 30;
      }
      // sticker: "7 QWIEL" filled with a tile pattern
      ctx.save();
      ctx.translate(860, 1450);
      ctx.rotate(-0.12);
      ctx.fillStyle = P.ink; rr(ctx, -150 + 8, -120 + 8, 300, 240, 30); ctx.fill();
      ctx.fillStyle = P.yellow; rr(ctx, -150, -120, 300, 240, 30); ctx.fill();
      ctx.font = M.fontStr('A', 900, 170, 100);
      ctx.textAlign = 'center';
      ctx.fillStyle = tilePattern(ctx, 'star', [P.cream, P.terra, P.teal, P.ochre], 90);
      ctx.fillText('7', -70, 55);
      ctx.lineWidth = 6; ctx.strokeStyle = P.ink; ctx.strokeText('7', -70, 55);
      text(ctx, 'QWIEL', 50, -8, { f: 'A', w: 900, s: 52, wd: 80, color: P.ink, align: 'center' });
      text(ctx, 'MALTIN', 50, 44, { f: 'A', w: 900, s: 44, wd: 70, color: P.terra, align: 'center' });
      ctx.restore();
      // series chip
      ctx.fillStyle = P.cream; rr(ctx, XL, 230, 470, 70, 35); ctx.fill();
      ctx.fillStyle = '#FFFFFF'; ctx.fillRect(XL + 24, 248, 14, 32);
      ctx.fillStyle = P.red; ctx.fillRect(XL + 38, 248, 14, 32);
      ctx.strokeStyle = P.ink; ctx.lineWidth = 2; ctx.strokeRect(XL + 24, 248, 28, 32);
      text(ctx, 'AI BIL-MALTI · EP.02', XL + 70, 276, { f: 'JB', w: 800, s: 28, color: P.ink, track: 2 });
    },
    fx(fx) {
      fx.vig = 0.3;
      fx.bloom = 0.12;
      fx.grain = 0.01;
      fx.ca = 0.1;
    },
    mb() {
      return 1;
    },
  });
})();

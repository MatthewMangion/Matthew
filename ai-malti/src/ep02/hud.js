// ep02/hud.js — series wordmark, 7-proverb tracker (fills as the countdown runs), time rail
(function (G) {
  const { W, clamp, prog, Ease, rgba, mix, text, spring } = M;
  const { P } = K;
  // light grounds need ink HUD
  const light = [[20.75, 27.5], [36.75, 43.5], [60, 63.5]];
  const lightness = (t) => {
    let v = 0;
    for (const [a, b] of light) v = Math.max(v, prog(t, a - 0.001, a) * (1 - prog(t, b - 0.001, b)));
    return v;
  };

  G.drawHUD = function (ctx, t) {
    if (t > 64) return;
    // hidden while a number card fills the frame
    let vis = 1;
    for (const g of TL.SEG) vis *= 1 - prog(t, g.T - 0.3, g.T - 0.1) * (1 - prog(t, g.T + 0.6, g.T + 0.8));
    vis *= 1 - prog(t, 59.5, 59.7) * (1 - prog(t, 59.9, 60.1));
    if (vis <= 0.001) return;
    const Lt = lightness(t);
    const col = mix(P.cream, P.ink, Lt);
    const y = 214;
    ctx.save();
    ctx.globalAlpha = vis;
    // wordmark + flag
    const fx = 72;
    ctx.fillStyle = Lt > 0.5 ? P.ink : '#FFFFFF';
    ctx.fillRect(fx, y - 22, 13, 26);
    ctx.fillStyle = P.red;
    ctx.fillRect(fx + 13, y - 22, 13, 26);
    ctx.strokeStyle = rgba(Lt > 0.5 ? P.ink : P.cream, 0.5);
    ctx.lineWidth = 1.5;
    ctx.strokeRect(fx + 0.75, y - 21.25, 24.5, 24.5);
    text(ctx, 'AI BIL-MALTI', fx + 44, y, { f: 'JB', w: 700, s: 25, color: col, track: 3 });
    text(ctx, '· 02', fx + 44 + 222, y, { f: 'JB', w: 400, s: 25, color: col, alpha: 0.55, track: 2 });
    // tracker: born with "7 QWIEL" (2.75 s), gone before the loop point
    const born = prog(t, 2.9, 3.3) * (1 - prog(t, 63.0, 63.4));
    if (born > 0) {
      const cur = TL.SEG.findIndex((g) => t >= g.T && t < g.T + 8);
      const x1 = W - 72, sz = 22, gap = 9;
      for (let i = 0; i < 7; i++) {
        const x = x1 - (6 - i) * (sz + gap) - sz;
        const pop = spring(t - 2.9 - i * 0.05, 3.2, 0.45);
        if (pop <= 0.001) continue;
        const done = cur >= 0 ? i < cur : t >= 60;
        const now = i === cur;
        ctx.save();
        ctx.globalAlpha *= born;
        ctx.translate(x + sz / 2, y - 9);
        ctx.scale(pop * (now ? 1 + 0.12 * Math.abs(Math.sin(t * Math.PI * 2)) : 1), pop);
        ctx.rotate(Math.PI / 4);
        ctx.fillStyle = now ? P.yellow : done ? col : 'rgba(0,0,0,0)';
        ctx.fillRect(-sz * 0.36, -sz * 0.36, sz * 0.72, sz * 0.72);
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = now ? P.yellow : col;
        ctx.strokeRect(-sz * 0.36, -sz * 0.36, sz * 0.72, sz * 0.72);
        ctx.restore();
      }
      const label = cur >= 0 ? `QAWL ${TL.SEG[cur].n}` : t < 4 ? '7 QWIEL' : '';
      if (label) text(ctx, label, x1 - 7 * (sz + gap) - 14, y, { f: 'JB', w: 700, s: 25, color: col, align: 'right', track: 2, alpha: born });
    }
    // time rail
    const rail = prog(t, 3.0, 3.6) * (1 - prog(t, 63.0, 63.4));
    if (rail > 0) {
      const x0 = 72, x1 = W - 72, yy = y + 26;
      const p = clamp((t - 4) / 56);
      ctx.fillStyle = rgba(Lt > 0.5 ? P.ink : P.cream, 0.16);
      ctx.fillRect(x0, yy, (x1 - x0) * Ease.outExpo(rail), 3);
      ctx.fillStyle = Lt > 0.5 ? P.red : P.yellow;
      ctx.fillRect(x0, yy, (x1 - x0) * p * Ease.outExpo(rail), 3);
    }
    ctx.restore();
  };
})(window);

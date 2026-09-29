// hud.js — persistent broadcast-style HUD: series wordmark, live countdown, progress rail
(function (G) {
  const { W, C, clamp, prog, lerp, Ease, rgba, mix, text, noise1 } = M;
  // light backgrounds need ink HUD
  const lightWins = [[3.5, 4], [12, 16], [36, 44]];
  function lightness(t) {
    let v = 0;
    for (const [a, b] of lightWins) v = Math.max(v, prog(t, a - 0.001, a) * (1 - prog(t, b - 0.001, b)));
    return v;
  }
  G.hudLight = lightness;

  G.drawHUD = function (ctx, t) {
    const L = lightness(t);
    const col = mix(C.paper, C.ink, L);
    const y = 214;
    // hide HUD during full-bleed moments
    let vis = 1;
    vis *= 1 - prog(t, 56.0, 56.2) * (1 - prog(t, 57.0, 57.4)); // "Mhux maġija" silence
    if (t > 62.6) vis *= 1 - prog(t, 62.6, 62.8) * (1 - prog(t, 63.3, 63.6));
    const endHide = 1 - prog(t, 62.6, 62.8);
    if (t > 64) vis = 0;
    if (vis <= 0.001) return;
    ctx.globalAlpha = vis;

    // wordmark + mini flag
    const fx = 72;
    ctx.fillStyle = L > 0.5 ? rgba(C.ink, 1) : '#fff';
    ctx.fillRect(fx, y - 22, 13, 26);
    ctx.fillStyle = C.red;
    ctx.fillRect(fx + 13, y - 22, 13, 26);
    ctx.strokeStyle = rgba(L > 0.5 ? C.ink : C.paper, 0.5);
    ctx.lineWidth = 1.5;
    ctx.strokeRect(fx + 0.75, y - 21.25, 24.5, 24.5);
    text(ctx, 'AI BIL-MALTI', fx + 44, y, { f: 'JB', w: 700, s: 25, color: col, track: 3 });
    text(ctx, '· 01', fx + 44 + 222, y, { f: 'JB', w: 400, s: 25, color: col, alpha: 0.55, track: 2 });

    // countdown (born at 6.5s when the "60" lands)
    const born = prog(t, 6.45, 6.75) * endHide;
    if (born > 0) {
      const remain = 60 * (1 - clamp((t - 6.75) / (62.6 - 6.75)));
      const s = Math.ceil(remain - 1e-6);
      const str = `${String(s).padStart(2, '0')}s`;
      ctx.save();
      ctx.globalAlpha *= born;
      text(ctx, str, W - 72, y, { f: 'JB', w: 700, s: 30, color: col, align: 'right', track: 1 });
      // rec dot
      const tw = M.textWidth(ctx, str, 'JB', 700, 30, 100, 1);
      const blink = 0.55 + 0.45 * Math.round((Math.sin(t * Math.PI * 2) + 1) / 2);
      ctx.fillStyle = rgba(C.red, blink);
      ctx.beginPath();
      ctx.arc(W - 72 - tw - 24, y - 10, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    // progress rail
    const p = clamp((t - 4) / 60);
    const rail = prog(t, 6.5, 7.2) * endHide;
    if (rail > 0) {
      const x0 = 72, x1 = W - 72, yy = y + 26;
      const ww = (x1 - x0) * Ease.outExpo(rail);
      ctx.fillStyle = rgba(L > 0.5 ? C.ink : C.paper, 0.16);
      ctx.fillRect(x0, yy, ww, 3);
      ctx.fillStyle = L > 0.5 ? C.red : C.yellow;
      ctx.fillRect(x0, yy, (x1 - x0) * p * Ease.outExpo(rail), 3);
    }
    ctx.globalAlpha = 1;
  };
})(window);

// EP02 #2 (44–52 s): “Il-giddieb għomru qasir.” → hallucinations: confident inventions don't survive a check.
// Gag: the AI claims "Il-Mosta għandha tliet qubbiet." — the check drains the lie's life bar, two domes vanish.
(function () {
  const { W, H, TAU, clamp, lerp, prog, Ease, rgba, text, spring, rnd, rndr, fitSize } = M;
  const { P, XL, XW, proverb, kicker, lineFit, label, dome, bubble, magnifier, stamp, toolTile, band, inked, rr } = K;
  const FACT = 'Il-Mosta għandha tliet qubbiet.';
  const DOMES = [{ x: 250, at: 1.25, poof: 5.2 }, { x: 540, at: 1.4 }, { x: 830, at: 1.55, poof: 5.35 }];
  const BY = 1170;

  function poof(ctx, x, y, k) {
    for (let i = 0; i < 26; i++) {
      const a = rndr(i, x, 0, TAU), v = rndr(i, x + 1, 200, 620);
      const px = x + Math.cos(a) * v * k, py = y + Math.sin(a) * v * k + 500 * k * k;
      ctx.beginPath(); ctx.arc(px, py, rndr(i, x + 2, 4, 12) * (1 - k), 0, TAU);
      ctx.fillStyle = i % 3 ? P.stone : P.cream; ctx.fill();
    }
  }

  addScene({
    name: 'p2',
    t0: TL.S.p2[0],
    t1: TL.S.p2[1],
    push: 0.02,
    draw(ctx, lt) {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, P.slateD);
      g.addColorStop(0.5, P.slate);
      g.addColorStop(0.85, '#B8604A');
      g.addColorStop(1, P.terra);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < 60; i++) {
        const tw = 0.4 + 0.6 * Math.abs(Math.sin(lt * 2 + i));
        ctx.fillStyle = rgba(P.cream, 0.5 * tw * (1 - (rnd(i, 3) * 900) / 900));
        ctx.fillRect(rnd(i, 1) * W, 250 + rnd(i, 2) * 700, 3, 3);
      }
      band(ctx, 'quatro', [P.slate, P.terra, P.cream, P.ochre], 180, 1600, lt * 30, 2);

      proverb(ctx, [{ s: 'Il-giddieb', at: 1.0 }, { s: 'għomru', at: 1.5 }, { s: 'qasir.', at: 2.0 }], lt, { y: 350, s: 108 });

      // AI speech bubble with the invented fact
      const bp = spring(lt - 0.95, 3, 0.45);
      if (bp > 0.001) {
        ctx.save();
        ctx.translate(540, 700);
        ctx.scale(bp, bp);
        ctx.translate(-540, -700);
        bubble(ctx, XL + 20, 630, XW - 20, 150, { fill: P.cream, tail: 'bl' });
        toolTile(ctx, XL + 100, 705, 92, 'ai', { bg: P.yellow });
        const s = Math.min(46, fitSize(ctx, FACT, XW - 210, 'A', 800, 88));
        text(ctx, FACT, XL + 170, 722, { f: 'A', w: 800, s, wd: 88, color: P.ink });
        ctx.restore();
      }
      // the lie's life bar
      const lb = Ease.snap(prog(lt, 1.6, 1.9));
      if (lb > 0) {
        const life = 1 - Ease.inQuad(prog(lt, 4.8, 5.1));
        ctx.save();
        ctx.globalAlpha = lb;
        label(ctx, 'ĦAJJA TAL-GIDBA', XL, 862, { s: 24, color: P.cream, w: 800 });
        ctx.fillStyle = rgba(P.ink, 0.6); rr(ctx, XL + 330, 838, XW - 330, 32, 16); ctx.fill();
        ctx.fillStyle = life > 0.5 ? P.green : life > 0.2 ? P.ochre : P.red;
        if (life > 0.01) { rr(ctx, XL + 334, 842, (XW - 338) * life, 24, 12); ctx.fill(); }
        ctx.restore();
      }
      // three domes (two of them invented)
      for (const d of DOMES) {
        const p = spring(lt - d.at, 3.2, 0.42);
        if (p <= 0.001) continue;
        if (d.poof && lt >= d.poof) {
          const k = lt - d.poof;
          if (k < 0.8) poof(ctx, d.x, BY - 120, k);
          continue;
        }
        dome(ctx, d.x, BY, 0.62 * p);
      }
      if (lt > 5.55) {
        const p = spring(lt - 5.55, 3, 0.45);
        ctx.save(); ctx.translate(540, BY + 62); ctx.scale(p, p);
        const w = 260;
        ctx.fillStyle = P.ink; rr(ctx, -w / 2, -30, w, 56, 28); ctx.fill();
        text(ctx, 'waħda biss!', 0, 9, { f: 'JB', w: 800, s: 28, color: P.yellow, align: 'center' });
        ctx.restore();
      }
      // the check
      const mg = prog(lt, 4.45, 5.1);
      if (mg > 0 && mg < 1) {
        const x = lerp(1150, 240, Ease.inOutCubic(mg)), y = 700 + Math.sin(mg * Math.PI) * -40;
        magnifier(ctx, x, y, 96, { lens: rgba(P.cream, 0.15), ring: P.yellow, ang: 0.9 });
        label(ctx, 'ĊEKK', x, y - 120, { s: 30, color: P.yellow, align: 'center', w: 800 });
      }
      stamp(ctx, 560, 712, 'MHUX VERU.', lt, 5.1, { rot: -0.1, s: 92 });

      kicker(ctx, XL, 1272, lt, 3.0);
      lineFit(ctx, 'Xi drabi tivvinta —', XL, 1352, lt, 3.25, XW, { s: 62, out: 5.5 });
      lineFit(ctx, "b'kunfidenza sħiħa.", XL, 1424, lt, 3.75, XW, { s: 62, out: 5.5 });
      lineFit(ctx, 'Jgħidulha ‘alluċinazzjoni’.', XL, 1352, lt, 5.7, XW, { s: 62 });
      lineFit(ctx, 'Iċċekkja dejjem.', XL, 1428, lt, 6.5, XW, { s: 70, color: P.yellow });
    },
    fx(fx, lt) {
      if (lt >= 5.1 && lt < 5.2) fx.ca += 1.5;
    },
    mb(lt) {
      return lt > 4.4 && lt < 5.5 ? 6 : 3;
    },
  });
})();

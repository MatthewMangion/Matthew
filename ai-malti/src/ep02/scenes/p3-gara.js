// EP02 #3 (36–44 s): “Il-ġara tgħallmek tgħammar.” → learning from examples: show it a pattern and it copies it.
// Demo with Maltese broken plurals: qattus → qtates · kelb → klieb · fenek → fniek
(function () {
  const { W, H, TAU, clamp, lerp, prog, Ease, rgba, text, spring } = M;
  const { P, XL, XW, proverb, kicker, lineFit, label, house, band, inked, rr, tick } = K;
  const GROUND = 1075;
  const ROWS = [
    { a: 'qattus', b: 'qtates', at: 3.75 },
    { a: 'kelb', b: 'klieb', at: 4.25 },
    { a: 'fenek', b: 'fniek', at: 4.75, ai: 5.25 },
  ];

  addScene({
    name: 'p3',
    t0: TL.S.p3[0],
    t1: TL.S.p3[1],
    push: 0.02,
    draw(ctx, lt) {
      // Maltese sky + sun
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#6FB2E3');
      g.addColorStop(0.55, P.sky);
      g.addColorStop(1, '#CFE6F5');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      M.glowDot(ctx, 930, 640, 220, '#FFF2B0', 0.6);
      ctx.beginPath(); ctx.arc(930, 640, 58, 0, TAU); ctx.fillStyle = '#FFE58A'; ctx.fill();
      // street
      ctx.fillStyle = P.stoneD;
      ctx.fillRect(0, GROUND, W, 20);
      band(ctx, 'star', [P.sky, P.cream, P.green, P.terra], 180, 1600, lt * 30, 2);

      proverb(ctx, [{ s: 'Il-ġara', at: 1.0 }, { s: 'tgħallmek', at: 1.5 }, { s: 'tgħammar.', at: 2.0 }], lt, { y: 350, s: 104, color: P.ink, quote: P.terra });

      // two houses: the neighbour's gallarija turns green, then yours copies it
      const rise = (d) => Ease.snap(prog(lt, 0.8 + d, 1.2 + d));
      const r1 = rise(0), r2 = rise(0.08);
      const paint1 = Ease.inOutCubic(prog(lt, 1.5, 1.9)), paint2 = Ease.inOutCubic(prog(lt, 2.1, 2.6));
      ctx.save(); ctx.translate(0, (1 - r1) * 500);
      house(ctx, 70, GROUND, 440, 440, { gal: P.green, door: P.brick, paint: paint1, pot: lt - 1.7 });
      ctx.restore();
      ctx.save(); ctx.translate(0, (1 - r2) * 500);
      house(ctx, 570, GROUND, 440, 440, { gal: P.green, door: P.slate, paint: paint2, pot: lt - 2.4 });
      ctx.restore();
      // paint sweep sparkle on yours
      if (lt > 2.1 && lt < 2.7) {
        const u = prog(lt, 2.1, 2.6);
        M.glowDot(ctx, lerp(640, 940, u), 780, 90, P.yellow, 0.8 * Math.sin(u * Math.PI));
      }
      const tag = (s, x, at) => {
        const p = spring(lt - at, 3, 0.45);
        if (p <= 0.001) return;
        ctx.save(); ctx.translate(x, 600); ctx.scale(p, p);
        const w = M.textWidth(ctx, s, 'JB', 800, 28, 100, 2) + 30;
        ctx.fillStyle = P.ink; rr(ctx, -w / 2, -26, w, 50, 25); ctx.fill();
        text(ctx, s, 0, 9, { f: 'JB', w: 800, s: 28, color: P.cream, align: 'center', track: 2 });
        ctx.restore();
      };
      tag('IL-ĠARA', 290, 1.2);
      tag('INTI', 790, 1.3);

      kicker(ctx, XL, 1150, lt, 3.0);
      lineFit(ctx, 'Uriha eżempju…', 330, 1168, lt, 3.25, W - XL - 330, { s: 54, color: P.ink, out: 5.0 });
      lineFit(ctx, '…u tagħmel bħalu.', 330, 1168, lt, 5.25, W - XL - 330, { s: 54, color: P.ink });
      // example panel
      const pp = Ease.snap(prog(lt, 3.5, 3.75));
      if (pp > 0) {
        ctx.save();
        ctx.globalAlpha = pp;
        inked(ctx, () => rr(ctx, XL, 1215, XW, 265, 26), P.cream, { sh: 8, lw: 6 });
        ROWS.forEach((r, i) => {
          const y = 1290 + i * 72;
          const typed = (str, at, cps = 22) => Array.from(str).slice(0, Math.floor(clamp((lt - at) * cps, 0, str.length))).join('');
          const a = typed(r.a, r.at);
          if (!a) return;
          text(ctx, a, XL + 40, y, { f: 'JB', w: 700, s: 44, color: P.ink });
          if (lt > r.at + 0.25) text(ctx, '→', XL + 330, y, { f: 'JB', w: 700, s: 44, color: P.terra });
          if (r.ai == null) {
            text(ctx, typed(r.b, r.at + 0.3), XL + 420, y, { f: 'JB', w: 700, s: 44, color: P.ink });
          } else {
            if (lt < r.ai) {
              if (Math.floor(lt * 4) % 2 === 0 && lt > r.at + 0.3) text(ctx, '?', XL + 420, y, { f: 'JB', w: 800, s: 44, color: P.terra });
            } else {
              const b = typed(r.b, r.ai, 14);
              const w = M.textWidth(ctx, 'fniek', 'JB', 800, 44) + 28;
              ctx.fillStyle = P.yellow; rr(ctx, XL + 406, y - 44, w, 60, 12); ctx.fill();
              text(ctx, b, XL + 420, y, { f: 'JB', w: 800, s: 44, color: P.ink });
              label(ctx, 'AI', XL + 420 + w + 10, y - 6, { s: 22, color: P.terra, w: 800 });
              if (lt > 5.75) tick(ctx, XL + XW - 70, y - 16, 44, P.greenD, 11, prog(lt, 5.75, 5.95));
            }
          }
        });
        ctx.restore();
      }
    },
    mb(lt) {
      return lt > 0.7 && lt < 1.3 ? 6 : 3;
    },
  });
})();

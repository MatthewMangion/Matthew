// EP02 #5 (20–28 s): “Qattusa għaġġelija frieħ għomja tagħmel.” → reasoning: hasty answers go wrong; the best models stop and think.
// Demo: "Kemm-il 'r' hemm f'Għargħur?" — hasty: 1 ✗ · thinking: GĦ A R GĦ U R → 2 ✓ (għ is one letter in Maltese)
(function () {
  const { W, H, TAU, clamp, lerp, prog, Ease, rgba, text, spring, rnd, noise1 } = M;
  const { P, XL, XW, proverb, kicker, lineFit, label, cat, kitten, band, inked, rr, tick, cross } = K;
  const Q = 'Kemm-il ‘r’ hemm f’ “Għargħur”?';
  const LET = ['GĦ', 'A', 'R', 'GĦ', 'U', 'R'];

  addScene({
    name: 'p5',
    t0: TL.S.p5[0],
    t1: TL.S.p5[1],
    push: 0.02,
    draw(ctx, lt) {
      ctx.fillStyle = P.ochre;
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = rgba(P.ink, 0.05);
      for (let y = 0; y < H; y += 44) for (let x = (y / 44) % 2 ? 22 : 0; x < W; x += 44) { ctx.beginPath(); ctx.arc(x, y, 4, 0, TAU); ctx.fill(); }
      band(ctx, 'quatro', [P.ochre, P.ink, P.cream, P.terra], 180, 1600, lt * 30, 2);

      proverb(ctx, [{ s: 'Qattusa għaġġelija', at: 1.0 }, { s: 'frieħ għomja', at: 1.75 }, { s: 'tagħmel.', at: 2.5 }], lt, { y: 350, s: 92, color: P.ink, quote: P.terra });

      // the hasty cat dashes through
      const dash = prog(lt, 0.7, 1.6);
      if (dash > 0 && dash < 1) {
        const x = M.kf(lt, [[0.7, -320], [0.95, 470, Ease.outCubic], [1.3, 560], [1.6, 1500, Ease.inCubic]]);
        ctx.save();
        ctx.strokeStyle = rgba(P.ink, 0.5); ctx.lineWidth = 8; ctx.lineCap = 'round';
        const fast = lt < 0.95 || lt > 1.3 ? 1 : 0;
        if (fast) for (let k = 0; k < 6; k++) { const yy = 770 + k * 34; ctx.beginPath(); ctx.moveTo(x - 180 - k * 30, yy); ctx.lineTo(x - 420 - k * 50, yy); ctx.stroke(); }
        ctx.translate(x, 820);
        ctx.rotate(fast ? 0.12 : 0);
        cat(ctx, 0, 0, 0.85, { col: P.ink, eye: P.yellow, tailWave: Math.sin(lt * 30) });
        ctx.restore();
      }
      // …leaving blind kittens
      [330, 540, 750].forEach((x, i) => {
        const at = 1.75 + i * 0.15;
        const p = spring(lt - at, 3.2, 0.4);
        if (p <= 0.001) return;
        ctx.save();
        ctx.translate(x, 845);
        ctx.scale(p * 1.3, p * 1.3);
        kitten(ctx, 0, 0, 1.0, { col: P.cream, open: 0 });
        const q = Ease.snap(prog(lt, at + 0.3, at + 0.6));
        if (q > 0) text(ctx, '?', 44, -70 - Math.sin(lt * 5 + i) * 6, { f: 'A', w: 900, s: 56, color: P.ink, alpha: q });
        ctx.restore();
      });

      kicker(ctx, XL, 985, lt, 3.0, { bg: P.ink, fg: P.yellow });
      // question card
      const qp = Ease.snap(prog(lt, 3.2, 3.45));
      if (qp > 0) {
        ctx.save();
        ctx.globalAlpha = qp;
        inked(ctx, () => rr(ctx, XL, 1030, XW, 90, 24), P.cream, { sh: 8, lw: 6 });
        const shown = Array.from(Q).slice(0, Math.floor(clamp((lt - 3.25) / 0.6) * Q.length)).join('');
        text(ctx, shown, XL + 28, 1090, { f: 'A', w: 800, s: 44, wd: 88, color: P.ink });
        ctx.restore();
      }
      // two answer panels
      const panel = (x, w, title, col, at) => {
        const p = Ease.snap(prog(lt, at, at + 0.25));
        if (p <= 0) return 0;
        ctx.save();
        ctx.globalAlpha = p;
        ctx.translate(0, (1 - p) * 40);
        inked(ctx, () => rr(ctx, x, 1150, w, 210, 26), P.cream, { sh: 8, lw: 6 });
        label(ctx, title, x + 24, 1196, { s: 26, color: col, w: 800 });
        ctx.restore();
        return p;
      };
      const L = panel(XL, 390, 'MGĦAĠĠEL', P.brick, 3.9);
      if (L > 0) {
        const a = spring(lt - 4.1, 3.4, 0.4);
        if (a > 0.001) {
          ctx.save(); ctx.translate(XL + 120, 1320); ctx.scale(a, a);
          text(ctx, '1', 0, 0, { f: 'A', w: 900, s: 130, color: P.ink, align: 'center' });
          ctx.restore();
        }
        if (lt > 4.4) cross(ctx, XL + 270, 1270, 90, P.brick, 16, prog(lt, 4.4, 4.62));
      }
      const R0 = XL + 410, RW = XW - 410;
      const Rp = panel(R0, RW, 'JAĦSEB…', P.greenD, 4.7);
      if (Rp > 0) {
        const tw = 58, gap = 6, x0 = R0 + 22;
        LET.forEach((ch, i) => {
          const at = 4.9 + i * 0.12;
          const p = spring(lt - at, 3.6, 0.45);
          if (p <= 0.001) return;
          const hot = ch === 'R' && lt >= (i === 2 ? 5.8 : 6.0);
          const x = x0 + i * (tw + gap);
          ctx.save();
          ctx.translate(x + tw / 2, 1245);
          ctx.scale(p, p);
          ctx.fillStyle = hot ? P.yellow : P.stone; rr(ctx, -tw / 2, -30, tw, 60, 12); ctx.fill();
          ctx.lineWidth = 4; ctx.strokeStyle = P.ink; ctx.stroke();
          text(ctx, ch, 0, 14, { f: 'A', w: 900, s: 34, wd: ch.length > 1 ? 74 : 100, color: P.ink, align: 'center' });
          ctx.restore();
        });
        const cnt = lt >= 6.0 ? 2 : lt >= 5.8 ? 1 : 0;
        if (lt >= 5.8) label(ctx, `'r' = ${cnt}`, x0, 1336, { s: 30, color: P.ink, w: 800 });
        const a = spring(lt - 6.25, 3.4, 0.4);
        if (a > 0.001) {
          ctx.save(); ctx.translate(R0 + RW - 150, 1344); ctx.scale(a, a);
          text(ctx, '2', 0, 0, { f: 'A', w: 900, s: 80, color: P.greenD, align: 'center' });
          ctx.restore();
          tick(ctx, R0 + RW - 70, 1318, 52, P.greenD, 12, prog(lt, 6.3, 6.55));
        }
      }
      lineFit(ctx, 'Tweġiba mgħaġġla? Spiss ħażina.', XL, 1452, lt, 4.5, XW, { s: 58, color: P.ink, out: 6.25 });
      lineFit(ctx, 'L-aqwa mudelli llum jieqfu u jaħsbu.', XL, 1452, lt, 6.45, XW, { s: 58, color: P.ink });
    },
    mb(lt) {
      return lt > 0.8 && lt < 1.6 ? 8 : 3;
    },
  });
})();

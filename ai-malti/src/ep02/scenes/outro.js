// EP02 OUTRO (60–64 s): "In-nanna kienet taf." → CTA "Liema qawl insejna? ikteb fil-kummenti" → lockup → flip back to frame 0.
(function () {
  const { W, H, TAU, clamp, lerp, prog, Ease, rgba, text, spring, fitSize } = M;
  const { P, XL, XW, glasses, lace, band, inked, rr } = K;

  addScene({
    name: 'outro',
    t0: TL.S.outro[0],
    t1: TL.S.outro[1],
    push: false,
    draw(ctx, lt) {
      ctx.fillStyle = P.cream;
      ctx.fillRect(0, 0, W, H);
      lace(ctx, W / 2, 520, 440, { t: lt, alpha: 0.13, col: P.terra });
      band(ctx, 'rosette', [P.terra, P.cream, P.ink, P.ochre], 180, 1600, lt * 30, 2);
      glasses(ctx, W / 2, 510 + Math.sin(lt * 2) * 5, 0.85, { t: lt, glint: prog(lt, 0.1, 0.6), chain: 0.9, frame: P.ochre });

      const a = Ease.snap(prog(lt, 0.05, 0.4));
      text(ctx, 'In-nanna kienet taf.', W / 2, 860 + (1 - a) * 40, { f: 'IS', s: 104, color: P.ink, align: 'center', alpha: a });

      const k = lt - 1.0;
      if (k > 0) {
        const s1 = fitSize(ctx, 'LIEMA QAWL', XW, 'A', 900, 92);
        const s2 = fitSize(ctx, 'INSEJNA?', XW, 'A', 900, 125);
        const p1 = spring(k, 3.2, 0.45), p2 = spring(k - 0.08, 3.2, 0.45);
        ctx.save(); ctx.translate(W / 2, 1040); ctx.scale(p1, p1);
        text(ctx, 'LIEMA QAWL', 0, 0, { f: 'A', w: 900, s: s1, wd: 92, color: P.ink, align: 'center' });
        ctx.restore();
        ctx.save(); ctx.translate(W / 2, 1040 + s2 * 0.82); ctx.scale(p2, p2);
        for (let d = 10; d >= 2; d -= 2) text(ctx, 'INSEJNA?', d, d, { f: 'A', w: 900, s: s2, wd: 125, color: P.ink, align: 'center' });
        text(ctx, 'INSEJNA?', 0, 0, { f: 'A', w: 900, s: s2, wd: 125, color: P.terra, align: 'center' });
        ctx.restore();
      }
      // comment pill with bouncing arrow
      const cp = Ease.snap(prog(lt, 1.4, 1.7));
      if (cp > 0) {
        const bw = 660, bh = 100, bx = W / 2 - bw / 2, by = 1320 + (1 - cp) * 50;
        ctx.save();
        ctx.globalAlpha = cp;
        inked(ctx, () => rr(ctx, bx, by, bw, bh, 50), P.ink, { sh: 8, lw: 0 });
        text(ctx, 'ikteb fil-kummenti', W / 2 - 40, by + 66, { f: 'A', w: 800, s: 52, wd: 86, color: P.cream, align: 'center' });
        const bounce = Math.abs(Math.sin((lt - 1.4) * 6)) * 12;
        ctx.translate(bx + bw - 64, by + bh / 2 + bounce * 0.5);
        ctx.beginPath(); ctx.arc(0, 0, 34, 0, TAU); ctx.fillStyle = P.red; ctx.fill();
        ctx.strokeStyle = P.cream; ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.beginPath(); ctx.moveTo(0, -14); ctx.lineTo(0, 14); ctx.moveTo(-12, 3); ctx.lineTo(0, 15); ctx.lineTo(12, 3); ctx.stroke();
        ctx.restore();
      }
      // lockup
      const lp = Ease.snap(prog(lt, 2.25, 2.55));
      if (lp > 0) {
        ctx.save();
        ctx.globalAlpha = lp;
        const y = 1500;
        ctx.fillStyle = '#FFFFFF'; ctx.fillRect(XL, y - 34, 22, 44);
        ctx.fillStyle = P.red; ctx.fillRect(XL + 22, y - 34, 22, 44);
        ctx.strokeStyle = P.ink; ctx.lineWidth = 3; ctx.strokeRect(XL + 1.5, y - 32.5, 41, 41);
        text(ctx, 'AI BIL-MALTI · EP. 02', XL + 64, y, { f: 'JB', w: 800, s: 32, color: P.ink, track: 2 });
        text(ctx, 'segwi għal EP. 03', W - XL, y, { f: 'JB', w: 600, s: 26, color: P.terra, align: 'right', track: 1 });
        ctx.restore();
      }
    },
    fx(fx) {
      fx.vig = 0.25;
      fx.bloom = 0.08;
    },
    mb() {
      return 3;
    },
  });
})();

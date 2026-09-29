// EP02 #6 (12–20 s): “Ir-ras meta tifliha tkun taf x'fiha.” → interpretability: scientists comb through the model's "brain".
(function () {
  const { W, H, TAU, clamp, lerp, prog, Ease, rgba, text, spring, rnd, rndr, kf } = M;
  const { P, XL, XW, proverb, kicker, line, lineFit, label, headPath, magnifier, network, drawNetwork, band, inked } = K;
  const HX = 230, HY = 640, HH = 620; // head box
  // skull region for the network (normalised head coords)
  const inSkull = (u, v) => ((u - 0.43) / 0.3) ** 2 + ((v - 0.34) / 0.26) ** 2 < 1;
  const NET = network(6, 46, (i, seed) => {
    let u, v, k = 0;
    do { u = rndr(i * 13 + k, seed, 0.14, 0.72); v = rndr(i * 17 + k, seed + 1, 0.08, 0.62); k++; } while (!inSkull(u, v) && k < 200);
    return [HX + u * HH, HY + v * HH];
  });
  // features the magnifier "finds" (node index, label, when)
  const FEAT = [
    { i: 5, s: 'Malta', at: 5.0, side: -1 },
    { i: 17, s: 'il-baħar', at: 5.5, side: -1 },
    { i: 31, s: 'kodiċi', at: 6.0, side: 1 },
  ];
  const lensPath = (lt) =>
    kf(lt, [
      [4.35, [1180, 1200]],
      [4.9, [NET.pts[5][0], NET.pts[5][1]], Ease.outCubic],
      [5.05, [NET.pts[5][0], NET.pts[5][1]]],
      [5.4, [NET.pts[17][0], NET.pts[17][1]], Ease.inOutCubic],
      [5.55, [NET.pts[17][0], NET.pts[17][1]]],
      [5.9, [NET.pts[31][0], NET.pts[31][1]], Ease.inOutCubic],
      [6.8, [NET.pts[31][0] + 40, NET.pts[31][1] + 30], Ease.inOutQuad],
    ]);

  addScene({
    name: 'p6',
    t0: TL.S.p6[0],
    t1: TL.S.p6[1],
    push: 0.02,
    draw(ctx, lt) {
      ctx.fillStyle = P.slate;
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = rgba(P.cream, 0.05);
      ctx.lineWidth = 2;
      for (let k = -20; k < 30; k++) { ctx.beginPath(); ctx.moveTo(k * 70, 0); ctx.lineTo(k * 70 + 900, H); ctx.stroke(); }
      band(ctx, 'star', [P.slate, P.cream, P.sky, P.ochre], 180, 1600, -lt * 30, 2);

      proverb(ctx, [{ s: 'Ir-ras', at: 1.0 }, { s: 'meta tifliha', at: 1.5 }, { s: 'tkun taf', at: 2.0 }, { s: "x'fiha.", at: 2.5 }], lt, { y: 350, s: 100 });

      // head
      const hp = Ease.snap(prog(lt, 0.6, 1.4));
      ctx.save();
      ctx.translate(HX + HH / 2, HY + HH);
      ctx.scale(lerp(0.9, 1, hp), lerp(0.9, 1, hp));
      ctx.translate(-(HX + HH / 2), -(HY + HH));
      inked(ctx, () => headPath(ctx, HX, HY, HH), P.slateD, { sh: 14, lw: 10 });
      ctx.save();
      ctx.beginPath(); headPath(ctx, HX, HY, HH); ctx.clip();
      drawNetwork(ctx, NET, { col: P.sky, alpha: 0.9, t: lt, grow: Ease.inOutQuad(prog(lt, 1.3, 3.2)), node: 6 });
      ctx.restore();
      ctx.restore();

      // magnifier: magnified network inside the lens, features light up
      const mv = prog(lt, 4.35, 4.5);
      if (mv > 0) {
        const [lx, ly] = lensPath(lt);
        const r = 118;
        ctx.save();
        ctx.beginPath(); ctx.arc(lx, ly, r, 0, TAU); ctx.clip();
        ctx.fillStyle = P.navy; ctx.fillRect(lx - r, ly - r, r * 2, r * 2);
        ctx.translate(lx, ly); ctx.scale(1.9, 1.9); ctx.translate(-lx, -ly);
        ctx.save(); ctx.beginPath(); headPath(ctx, HX, HY, HH); ctx.clip();
        drawNetwork(ctx, NET, { col: P.cream, alpha: 1, t: lt, grow: 1, node: 6 });
        ctx.restore();
        ctx.restore();
        magnifier(ctx, lx, ly, r, { lens: rgba(P.cream, 0.06), ring: P.ochre, ang: 0.75 });
      }
      // found features: glowing node + label pill with leader
      for (const f of FEAT) {
        const k = lt - f.at;
        if (k < 0) continue;
        const [nx, ny] = NET.pts[f.i];
        M.glowDot(ctx, nx, ny, 70, P.ochre, 0.9 * Math.exp(-k * 1.5) + 0.35);
        ctx.beginPath(); ctx.arc(nx, ny, 12, 0, TAU); ctx.fillStyle = P.yellow; ctx.fill();
        const p = spring(k, 3, 0.45);
        const tx = f.side < 0 ? XL + 10 : W - XL - 10, ty = ny - 60;
        ctx.save();
        ctx.strokeStyle = rgba(P.yellow, 0.9 * clamp(p)); ctx.lineWidth = 4; ctx.setLineDash([10, 8]);
        ctx.beginPath(); ctx.moveTo(nx, ny); ctx.lineTo(tx + (f.side < 0 ? 180 : -180), ty); ctx.stroke();
        ctx.restore();
        const w = M.textWidth(ctx, f.s, 'JB', 800, 32, 100, 1) + 36;
        const px = f.side < 0 ? tx : tx - w;
        ctx.save();
        ctx.translate(px + w / 2, ty);
        ctx.scale(p, p);
        ctx.fillStyle = P.ink; K.rr(ctx, -w / 2 + 6, -28, w, 58, 29); ctx.fill();
        ctx.fillStyle = P.yellow; K.rr(ctx, -w / 2, -34, w, 58, 29); ctx.fill();
        text(ctx, f.s, 0, 7, { f: 'JB', w: 800, s: 32, color: P.ink, align: 'center', track: 1 });
        ctx.restore();
      }

      kicker(ctx, XL, 1318, lt, 3.0);
      lineFit(ctx, 'Lanqas min jibniha', XL, 1400, lt, 3.25, XW, { s: 62, out: 5.0 });
      lineFit(ctx, "ma jaf eżatt x'hemm ġewwa.", XL, 1470, lt, 3.75, XW, { s: 62, out: 5.0 });
      lineFit(ctx, 'Għalhekk ix-xjenzjati', XL, 1400, lt, 5.25, XW, { s: 62 });
      lineFit(ctx, 'qed ‘jiflu’ moħħha.', XL, 1470, lt, 5.75, XW, { s: 66, color: P.yellow });
    },
    mb(lt) {
      return lt > 4.3 && lt < 6.2 ? 5 : 3;
    },
  });
})();

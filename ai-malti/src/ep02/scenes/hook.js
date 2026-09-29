// EP02 HOOK (0–4 s): "IN-NANNA KIENET TAF KIF TAĦDEM L-AI." — frame 0 is the thumbnail.
// Beats: glint (0.5) · KIENET TAF (1.0) · L-AI glitch (1.5) · aside (2.0) · "7 QWIEL MALTIN" (2.75) · flip (3.5)
(function () {
  const { W, H, clamp, lerp, prog, Ease, rgba, fitSize, text, spring, shake, rnd } = M;
  const { P, XL, XW, floor, glasses, lace } = K;
  const LINES = [
    { s: 'IN-NANNA', wd: 125, col: P.cream },
    { s: 'KIENET TAF', wd: 74, col: P.ochre },
    { s: 'KIF TAĦDEM', wd: 96, col: P.cream },
    { s: 'L-AI.', wd: 125, col: P.yellow, width: 600 },
  ];
  let geo = null;
  function layoutLines(ctx) {
    if (geo) return geo;
    const gap = 30;
    const out = LINES.map((L) => {
      const size = fitSize(ctx, L.s, L.width || XW, 'A', 900, L.wd);
      return { ...L, size, cap: size * 0.72 };
    });
    const total = out.reduce((a, o) => a + o.cap, 0) + gap * (out.length - 1);
    let y = 1200 - total / 2;
    for (const o of out) { y += o.cap; o.base = y; y += gap; }
    return (geo = out);
  }

  function bg(ctx, t) {
    floor(ctx, 'star', [P.ink, '#231A13', '#2E241B', '#1C1510'], 180, t * 10, t * 18);
    const g = ctx.createRadialGradient(W / 2, 700, 80, W / 2, 900, 1200);
    g.addColorStop(0, rgba(P.ink, 0.1));
    g.addColorStop(1, rgba(P.ink, 0.85));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  addScene({
    name: 'hook',
    t0: TL.S.hook[0],
    t1: TL.S.hook[1],
    push: false,
    draw(ctx, lt, t) {
      bg(ctx, lt);
      lace(ctx, W / 2, 560, 420, { t: lt, alpha: 0.2, col: P.cream });
      const sh = shake(lt, [[1.0, 0.6], [1.5, 0.9], [2.75, 1.1]], 16, 11);
      ctx.save();
      ctx.translate(sh.dx, sh.dy);
      // glasses
      const gy = 560 + Math.sin(lt * 2.2) * 6;
      glasses(ctx, W / 2, gy, 1.05, { t: lt, glint: prog(lt, 0.45, 0.95), chain: 1 });

      const G = layoutLines(ctx);
      const exit = (i) => Ease.inQuart(prog(lt, 2.55 + i * 0.05, 2.8 + i * 0.05));
      const settle = lerp(1.04, 1, Ease.outExpo(prog(lt, 0, 0.4)));
      ctx.save();
      ctx.translate(W / 2, 1200);
      ctx.scale(settle, settle);
      ctx.translate(-W / 2, -1200);
      G.forEach((o, i) => {
        const e = exit(i);
        if (e >= 1) return;
        let col = o.col, sc = 1;
        if (i === 1) {
          const k = prog(lt, 1.0, 1.22);
          if (k > 0 && k < 1) col = P.yellow;
          sc = 1 + 0.07 * Math.exp(-Math.max(0, lt - 1.0) * 10) * (lt >= 1.0 ? 1 : 0);
        }
        if (i === 3) sc = 1 + 0.1 * Math.exp(-Math.max(0, lt - 1.5) * 9) * (lt >= 1.5 ? 1 : 0);
        const x = XL - e * 1200;
        ctx.save();
        ctx.translate(x, o.base - o.cap / 2);
        ctx.scale(sc, sc);
        const base = o.cap / 2;
        if (i === 3 && lt >= 1.5 && lt < 1.72) {
          ctx.globalCompositeOperation = 'lighter';
          text(ctx, o.s, -22, base, { f: 'A', w: 900, s: o.size, wd: o.wd, color: '#FF0040' });
          text(ctx, o.s, 22, base, { f: 'A', w: 900, s: o.size, wd: o.wd, color: '#00E5FF' });
          ctx.globalCompositeOperation = 'source-over';
        }
        // ink extrusion for weight
        for (let d = 8; d >= 2; d -= 2) text(ctx, o.s, d, base + d, { f: 'A', w: 900, s: o.size, wd: o.wd, color: P.ink });
        text(ctx, o.s, 0, base, { f: 'A', w: 900, s: o.size, wd: o.wd, color: col });
        if (i === 3) {
          // red full stop
          const w0 = M.textWidth(ctx, 'L-AI', 'A', 900, o.size, o.wd);
          text(ctx, '.', w0, base, { f: 'A', w: 900, s: o.size, wd: o.wd, color: P.red });
        }
        ctx.restore();
      });
      ctx.restore();

      // aside
      const a = Ease.snap(prog(lt, 2.0, 2.3)) * (1 - Ease.inQuart(prog(lt, 2.6, 2.8)));
      if (a > 0) text(ctx, '(u qatt ma rat kompjuter)', W / 2, 850 + (1 - a) * 30, { f: 'IS', s: 58, color: P.cream, align: 'center', alpha: a });

      // "7 QWIEL MALTIN / li jispjegaw l-AI"
      const k = lt - 2.75;
      if (k > 0) {
        const p7 = spring(k, 3.0, 0.42);
        const s7 = 600;
        ctx.save();
        ctx.translate(XL + 150, 1260);
        ctx.scale(p7, p7);
        ctx.rotate(-0.04);
        for (let d = 18; d >= 2; d -= 2) text(ctx, '7', d - 150, d, { f: 'A', w: 900, s: s7, wd: 100, color: P.ink });
        text(ctx, '7', -150, 0, { f: 'A', w: 900, s: s7, wd: 100, color: P.yellow });
        ctx.restore();
        const x2 = XL + 390;
        const r1 = Ease.snap(prog(k, 0.05, 0.35)), r2 = Ease.snap(prog(k, 0.12, 0.42)), r3 = Ease.snap(prog(k, 0.3, 0.6));
        const sQ = fitSize(ctx, 'QWIEL', W - XL - x2, 'A', 900, 84);
        text(ctx, 'QWIEL', x2 + (1 - r1) * 200, 1010, { f: 'A', w: 900, s: sQ, wd: 84, color: P.cream, alpha: r1 });
        const sM = fitSize(ctx, 'MALTIN', W - XL - x2, 'A', 900, 70);
        text(ctx, 'MALTIN', x2 + (1 - r2) * 200, 1010 + sM * 0.82, { f: 'A', w: 900, s: sM, wd: 70, color: P.ochre, alpha: r2 });
        text(ctx, 'li jispjegaw l-AI', x2 + 4, 1010 + sM * 0.82 + 92 + (1 - r3) * 30, { f: 'IS', s: 70, color: P.cream, alpha: r3 });
      }
      ctx.restore();
    },
    fx(fx, lt) {
      fx.vig = 0.5;
      fx.bloom = 0.22;
    },
    mb(lt) {
      if (lt > 2.5 && lt < 3.2) return 6;
      if (lt < 0.35) return 4;
      return 3;
    },
  });
})();

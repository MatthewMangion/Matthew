// EP02 #4 (28–36 s): “Ix-xogħol agħtih lil min jaf jagħmlu.” → tool use: the AI hands each job to the right tool.
(function () {
  const { W, H, TAU, clamp, lerp, prog, Ease, rgba, text, spring } = M;
  const { P, XL, XW, proverb, kicker, line, lineFit, label, toolTile, band, inked, rr, tick } = K;
  const AI = [540, 790];
  const TOOLS = [
    { kind: 'calc', x: 225, name: 'KALKULATUR', at: 2.0 },
    { kind: 'web', x: 540, name: 'INTERNET', at: 2.25 },
    { kind: 'code', x: 855, name: 'KODIĊI', at: 2.5 },
  ];
  const TY = 1080;
  const TASKS = [
    { q: '37 × 12', a: '444', tool: 0, go: 3.75, hit: 4.1, res: 4.4 },
    { q: 'Temp għada?', a: '24°C', tool: 1, go: 4.5, hit: 4.85, res: 5.15, sun: true },
    { q: 'Logħba ġdida', a: 'lesta!', tool: 2, go: 5.25, hit: 5.6, res: 5.9, play: true },
  ];

  function card(ctx, x, y, str, sc = 1, fill = P.cream) {
    const w = M.textWidth(ctx, str, 'A', 800, 36, 88) + 44;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(sc, sc);
    inked(ctx, () => rr(ctx, -w / 2, -34, w, 68, 18), fill, { sh: 7, lw: 6 });
    text(ctx, str, 0, 13, { f: 'A', w: 800, s: 36, wd: 88, color: P.ink, align: 'center' });
    ctx.restore();
  }

  addScene({
    name: 'p4',
    t0: TL.S.p4[0],
    t1: TL.S.p4[1],
    push: 0.02,
    draw(ctx, lt) {
      ctx.fillStyle = P.terra;
      ctx.fillRect(0, 0, W, H);
      const g = ctx.createRadialGradient(AI[0], AI[1], 50, AI[0], AI[1], 900);
      g.addColorStop(0, rgba(P.ochre, 0.35));
      g.addColorStop(1, rgba(P.terraD, 0.4));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      band(ctx, 'rosette', [P.terra, P.cream, P.ink, P.ochre], 180, 1600, -lt * 30, 2);

      proverb(ctx, [{ s: 'Ix-xogħol', at: 1.0 }, { s: 'agħtih', at: 1.5 }, { s: 'lil min jaf', at: 2.0 }, { s: 'jagħmlu.', at: 2.5 }], lt, { y: 350, s: 100 });

      // dashed routes AI → tools
      TOOLS.forEach((tl, i) => {
        const p = prog(lt, tl.at, tl.at + 0.4);
        if (p <= 0) return;
        ctx.save();
        ctx.strokeStyle = rgba(P.cream, 0.55); ctx.lineWidth = 5; ctx.setLineDash([14, 12]);
        ctx.lineDashOffset = -lt * 40;
        ctx.beginPath(); ctx.moveTo(AI[0], AI[1] + 70);
        ctx.quadraticCurveTo(lerp(AI[0], tl.x, 0.5), AI[1] + 160, lerp(AI[0], tl.x, p), lerp(AI[1] + 70, TY - 80, p));
        ctx.stroke();
        ctx.restore();
      });
      // AI chip
      const ap = spring(lt - 0.9, 3, 0.45);
      if (ap > 0.001) {
        ctx.save(); ctx.translate(AI[0], AI[1]); ctx.scale(ap, ap);
        toolTile(ctx, 0, 0, 180, 'ai', { bg: P.yellow, glow: 0.4 + 0.2 * Math.sin(lt * 4) });
        ctx.restore();
        label(ctx, 'AI', AI[0], AI[1] - 112, { s: 28, color: P.cream, align: 'center', alpha: clamp(ap), w: 800 });
      }
      // tools
      TOOLS.forEach((tl, i) => {
        const p = spring(lt - tl.at, 3.2, 0.42);
        if (p <= 0.001) return;
        const busy = TASKS.filter((k) => k.tool === i).some((k) => lt > k.hit && lt < k.res + 0.25);
        ctx.save(); ctx.translate(tl.x, TY); ctx.scale(p, p);
        toolTile(ctx, 0, 0, 176, tl.kind, { bg: P.cream, glow: busy ? 1 : 0 });
        ctx.restore();
        label(ctx, tl.name, tl.x, TY + 132, { s: 24, color: P.cream, align: 'center', alpha: clamp(p), w: 800 });
      });
      // tasks fly AI → tool, answers pop above the tool
      for (const k of TASKS) {
        const tl = TOOLS[k.tool];
        if (lt >= k.go && lt < k.hit) {
          const u = Ease.inOutCubic(prog(lt, k.go, k.hit));
          const x = lerp(AI[0], tl.x, u), y = lerp(AI[1] + 40, TY - 30, u) - Math.sin(u * Math.PI) * 120;
          card(ctx, x, y, k.q, lerp(1, 0.55, u));
        }
        if (lt >= k.res) {
          const p = spring(lt - k.res, 3.4, 0.42);
          const y = TY - 150;
          ctx.save(); ctx.translate(tl.x, y); ctx.scale(p, p);
          card(ctx, 0, 0, k.a, 1, P.yellow);
          ctx.restore();
          if (k.sun && p > 0.5) {
            const sx = tl.x + 128, sy = y;
            ctx.save(); ctx.translate(sx, sy); ctx.rotate(lt * 1.5);
            ctx.strokeStyle = P.ink; ctx.lineWidth = 5; ctx.lineCap = 'round';
            for (let r = 0; r < 8; r++) { const a = (r * TAU) / 8; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 26, Math.sin(a) * 26); ctx.lineTo(Math.cos(a) * 38, Math.sin(a) * 38); ctx.stroke(); }
            ctx.beginPath(); ctx.arc(0, 0, 18, 0, TAU); ctx.fillStyle = P.yellow; ctx.fill(); ctx.stroke();
            ctx.restore();
          }
          if (lt > k.res + 0.15) tick(ctx, tl.x - 104, y, 34, P.greenD, 9, prog(lt, k.res + 0.15, k.res + 0.35));
        }
      }

      kicker(ctx, XL, 1300, lt, 3.0);
      line(ctx, 'L-AI tagħmel l-istess:', XL, 1382, lt, 3.25, { s: 62 });
      lineFit(ctx, 'kull xogħol lill-għodda t-tajba.', XL, 1455, lt, 6.25, XW, { s: 64, color: P.yellow });
    },
    mb(lt) {
      return lt > 3.7 && lt < 6.0 ? 5 : 3;
    },
  });
})();

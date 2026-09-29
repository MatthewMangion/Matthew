// EP02 #7 (4–12 s): “Bil-qatra l-qatra timtela l-ġarra.” → training: word by word, trillions of times.
(function () {
  const { W, H, clamp, lerp, prog, Ease, rgba, text, spring, rnd, rndr, fitSize } = M;
  const { P, XL, XW, proverb, kicker, line, label, jar, drop, band } = K;
  const WORDS = ['ħobż', 'baħar', 'il-', "ta'", 'Malta', 'kelma', 'qalb', 'xemx', 'festa', 'nanna', 'ġarra', 'ilma', 'dar', 'triq', 'ħajja', 'sabiħ', 'ktieb', 'Għawdex', 'bonġu', 'grazzi', 'saħħa', 'ejja', 'mela', 'dejjem', 'kafè', 'luzzu', 'ftira', 'ġobon', 'kappillan', 'banda'];
  const JX = 400, JTOP = 672, JS = 0.9;
  const BOTTOM = JTOP + 525 * JS, SURF_MAX = JTOP + 62 * JS, Y0 = 628, FALL = 0.42;

  // impacts: proverb beats, labelled drops, then an accelerating stream
  const DROPS = [];
  [1.0, 1.5, 2.0, 2.5].forEach((ti, i) => DROPS.push({ ti, r: 20, w: null, k: i }));
  [3.75, 4.0, 4.25, 4.5].forEach((ti, i) => DROPS.push({ ti, r: 17, w: WORDS[i * 3], k: 10 + i }));
  for (let ti = 4.75, i = 0; ti < 6.65; i++) {
    const u = (ti - 4.75) / 1.9;
    DROPS.push({ ti, r: lerp(13, 8, u), w: i % 3 === 0 ? WORDS[(i * 7) % WORDS.length] : null, k: 100 + i });
    ti += lerp(0.11, 0.022, Math.pow(u, 0.6));
  }
  function level(lt) {
    let v = 0.06;
    for (const d of DROPS) if (lt >= d.ti && d.k < 100) v += d.k < 10 ? 0.018 : 0.025;
    v += Ease.inQuad(prog(lt, 4.75, 6.7)) * (1 - 0.06 - 4 * 0.018 - 4 * 0.025);
    return clamp(v, 0, 1);
  }
  const surfY = (lv) => lerp(BOTTOM, SURF_MAX, lv);
  function count(lt) {
    let n = 0;
    for (const d of DROPS) if (d.k >= 10 && d.k < 100 && lt >= d.ti) n++;
    if (lt < 4.75) return n;
    const u = Ease.inQuad(prog(lt, 4.75, 6.65));
    return Math.round(Math.pow(10, lerp(Math.log10(5), 13, u)));
  }
  const group = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

  addScene({
    name: 'p7',
    t0: TL.S.p7[0],
    t1: TL.S.p7[1],
    push: 0.02,
    draw(ctx, lt) {
      ctx.fillStyle = P.teal;
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = rgba(P.cream, 0.06);
      ctx.lineWidth = 3;
      for (let k = 0; k < 14; k++) {
        ctx.beginPath();
        for (let x = 0; x <= W; x += 20) {
          const y = 300 + k * 110 + Math.sin(x * 0.01 + lt * 1.3 + k) * 10;
          x ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.stroke();
      }
      band(ctx, 'rosette', [P.teal, P.cream, P.ochre, P.terra], 180, 1600, lt * 30, 2);

      proverb(ctx, [{ s: 'Bil-qatra', at: 1.0 }, { s: 'l-qatra', at: 1.5 }, { s: 'timtela', at: 2.0 }, { s: 'l-ġarra.', at: 2.5 }], lt, { y: 360, s: 100 });

      // drops (behind the jar mouth), splash rings on impact
      const lv = level(lt);
      for (const d of DROPS) {
        const rel = d.ti - FALL;
        if (lt < rel || lt > d.ti + 0.5) continue;
        const x = JX + (d.k >= 10 ? rndr(d.k, 3, -14, 14) : 0);
        if (lt < d.ti) {
          const D = surfY(lv) - Y0;
          const g = (2 * D) / (FALL * FALL);
          const tt = lt - rel;
          const y = Y0 + 0.5 * g * tt * tt;
          if (y < JTOP + 30) drop(ctx, x, y, d.r, P.sky);
          else {
            ctx.save();
            ctx.globalAlpha = 0.9;
            drop(ctx, x, y, d.r, P.sky);
            ctx.restore();
          }
          if (d.w) label(ctx, d.w, x - d.r - 16, y + 8, { s: d.k < 100 ? 30 : 22, color: P.cream, align: 'right', alpha: d.k < 100 ? 1 : 0.7, track: 1 });
        }
      }
      jar(ctx, JX, JTOP, JS, { draw: 1, level: lv, t: lt, words: WORDS });
      // splash rings on the surface
      for (const d of DROPS) {
        const k = lt - d.ti;
        if (k < 0 || k > 0.45) continue;
        const y = surfY(level(d.ti + 0.001));
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(JX, y, 20 + k * 260 * (d.k < 100 ? 1 : 0.5), 5 + k * 40, 0, 0, Math.PI * 2);
        ctx.strokeStyle = rgba('#FFFFFF', (1 - k / 0.45) * 0.8);
        ctx.lineWidth = 4;
        ctx.stroke();
        ctx.restore();
      }
      // full: glow burst
      const full = prog(lt, 6.7, 7.2);
      if (full > 0 && full < 1) M.glowDot(ctx, JX, JTOP + 60, 300 * full + 60, P.cream, 0.6 * (1 - full));

      // counter
      const cp = Ease.snap(prog(lt, 3.6, 3.9));
      if (cp > 0) {
        const cx = 660;
        label(ctx, 'KELMIET', cx, 790, { s: 26, color: P.cream, alpha: 0.75 * cp });
        const n = count(lt);
        const str = group(n) + (lt > 6.65 ? '+' : '');
        text(ctx, str, cx, 846, { f: 'JB', w: 800, s: 30, color: P.yellow, alpha: cp });
        if (lt > 6.7) {
          const tp = spring(lt - 6.7, 3, 0.45);
          ctx.save();
          ctx.translate(cx, 950);
          ctx.scale(tp, tp);
          text(ctx, 'TRILJUNI', 0, 0, { f: 'A', w: 900, s: fitSize(ctx, 'TRILJUNI', W - XL - cx, 'A', 900, 80), wd: 80, color: P.cream });
          ctx.restore();
        }
      }

      kicker(ctx, XL, 1235, lt, 3.0);
      line(ctx, 'Hekk titgħallem l-AI:', XL, 1325, lt, 3.25, { s: 62 });
      line(ctx, "kelma b'kelma,", XL, 1398, lt, 3.75, { s: 62, color: P.cream });
      line(ctx, "triljuni ta' drabi.", XL, 1476, lt, 5.25, { s: 70, color: P.yellow });
    },
    mb(lt) {
      return lt > 4.6 && lt < 6.8 ? 5 : 3;
    },
  });
})();

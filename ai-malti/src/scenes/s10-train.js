// S10 — TRAINING (48–52s): "KIF TGĦALLIMT?" → Bassart. Żbaljajt. Irranġajt. (Il-baħar huwa… aħmar ✗ → blu ✓)
//        → accelerating montage of guesses, loss curve diving, odometer → "TRILJUNI TA' DRABI."
(function (G) {
  const { W, H, C, TAU, clamp, lerp, prog, Ease, rgba, mix, noise1, rnd, rndr, fitSize, layout, drawGlyphs, shake, spring, text, kf } = M;
  const XL = 72, XW = W - 144;
  const MINI = [
    ["Il-Milied jaħbat f'", 'Diċembru', 'Frar'],
    ['Bonġu, kif', 'int?', 'ħobż'],
    ['Tlieta u tlieta', 'sitta', 'tnejn'],
    ["Ix-xemx titla' mil-", 'lvant', 'punent'],
    ['Nixtieq kafè', 'sħun', 'belt'],
    ['Il-baħar huwa', 'blu', 'aħmar'],
  ];

  function stamp(ctx, x, y, s, ok, a = 1) {
    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha *= a;
    ctx.strokeStyle = ok ? C.green : C.red;
    ctx.lineWidth = s * 0.22;
    ctx.lineCap = 'round';
    ctx.beginPath();
    if (ok) { ctx.moveTo(-s * 0.5, 0); ctx.lineTo(-s * 0.12, s * 0.38); ctx.lineTo(s * 0.55, -s * 0.42); }
    else { ctx.moveTo(-s * 0.45, -s * 0.45); ctx.lineTo(s * 0.45, s * 0.45); ctx.moveTo(s * 0.45, -s * 0.45); ctx.lineTo(-s * 0.45, s * 0.45); }
    ctx.stroke();
    ctx.restore();
  }

  addScene({
    name: 'train',
    t0: TL.S.train[0],
    t1: TL.S.train[1],
    draw(ctx, lt, t) {
      ctx.fillStyle = C.ink;
      ctx.fillRect(0, 0, W, H);
      L.bgDots(ctx, t, { alpha: 0.06 });
      const sh = shake(lt, [[0, 1.2], [0.75, 0.5], [1.25, 1.0], [1.75, 0.6], [3.25, 1.4]], 16, 10);
      ctx.save();
      ctx.translate(sh.dx, sh.dy);

      // 1) KIF TGĦALLIMT?
      if (lt < 0.8) {
        const out = Ease.inQuart(prog(lt, 0.62, 0.78));
        const s1 = fitSize(ctx, 'KIF', 600, 'A', 900, 125), s2 = fitSize(ctx, 'TGĦALLIMT?', XW, 'A', 900, 70);
        ctx.save();
        ctx.globalAlpha = 1 - out;
        ctx.translate(0, -out * 200);
        drawGlyphs(ctx, 'KIF', XL, 860, { f: 'A', w: 900, s: s1, wd: 125, color: C.paper }, (i) => ({ dy: (1 - Ease.snap(clamp((lt - i * 0.03) / 0.25))) * -300 }));
        drawGlyphs(ctx, 'TGĦALLIMT?', XL, 860 + s2 * 0.95, { f: 'A', w: 900, s: s2, wd: 70, color: C.yellow }, (i, g, n) => ({
          dy: (1 - Ease.snap(clamp((lt - 0.08 - i * 0.02) / 0.25))) * 300, color: i === n - 1 ? C.red : undefined,
        }));
        ctx.restore();
      }

      // 2) the three-beat cycle
      const cyc = lt >= 0.75 && lt < 2.0;
      const hdY = 520;
      if (lt >= 0.75) {
        // headline word: beats at .75/1.25/1.75, then flickers faster during the montage
        let idx;
        if (lt < 2.0) idx = lt < 1.25 ? 0 : lt < 1.75 ? 1 : 2;
        else {
          const f = Math.floor(Math.pow((lt - 2.0) * 4.2, 1.35) * 2.2);
          idx = f % 3;
        }
        const words = [['Bassart.', C.paper], ['Żbaljajt.', C.red], ['Irranġajt.', C.green]];
        const [wd, col] = words[idx];
        const s = fitSize(ctx, 'Irranġajt.', XW * 0.92, 'A', 900, 88);
        const out = Ease.inQuart(prog(lt, 3.2, 3.3));
        const beatT = lt < 2.0 ? [0.75, 1.25, 1.75][idx] : lt;
        const pop = lt < 2.0 ? Ease.outBack(clamp((lt - beatT) / 0.14), 2.5) : 1;
        ctx.save();
        ctx.globalAlpha = 1 - out;
        ctx.translate(XL, hdY);
        ctx.scale(1, pop);
        text(ctx, wd, 0, 0, { f: 'A', w: 900, s, wd: 88, color: col });
        ctx.restore();
      }
      if (cyc) {
        const out = Ease.inQuart(prog(lt, 1.9, 2.02));
        const cin = Ease.snap(prog(lt, 0.75, 1.0));
        ctx.save();
        ctx.globalAlpha = cin * (1 - out);
        ctx.translate(0, (1 - cin) * 60);
        // prompt card
        const x = XL, y = 700, w = XW, h = 260;
        ctx.fillStyle = C.ink2;
        M.rrect(ctx, x, y, w, h, 34);
        ctx.fill();
        ctx.strokeStyle = rgba(C.paper, 0.25);
        ctx.lineWidth = 3;
        ctx.stroke();
        text(ctx, 'Il-baħar huwa', x + 40, y + 110, { f: 'A', w: 800, s: 72, wd: 90, color: C.paper });
        const gx = x + 40 + M.textWidth(ctx, 'Il-baħar huwa ', 'A', 800, 72, 90);
        const fixed = lt >= 1.75;
        const guess = fixed ? 'blu' : 'aħmar';
        const gcol = fixed ? C.green : lt >= 1.25 ? C.red : C.yellow;
        const gp = Ease.outBack(clamp((lt - (fixed ? 1.75 : 0.8)) / 0.18), 2.4);
        ctx.save();
        ctx.translate(gx, y + 110);
        ctx.scale(gp, gp);
        const gw = M.textWidth(ctx, guess, 'A', 900, 72, 90);
        ctx.fillStyle = rgba(gcol, 0.2);
        M.rrect(ctx, -14, -66, gw + 28, 86, 16);
        ctx.fill();
        text(ctx, guess, 0, 0, { f: 'A', w: 900, s: 72, wd: 90, color: gcol });
        ctx.restore();
        if (lt >= 1.25 && lt < 1.75) {
          const sp = Ease.outBack(clamp((lt - 1.25) / 0.12), 3);
          stamp(ctx, gx + gw / 2, y + 86, 120 * sp, false);
          text(ctx, 'it-tajba: blu', x + 40, y + 210, { f: 'JB', w: 700, s: 36, color: C.green, alpha: clamp((lt - 1.3) / 0.1) });
        }
        if (fixed) {
          stamp(ctx, x + w - 90, y + 86, 90 * Ease.outBack(clamp((lt - 1.75) / 0.14), 3), true);
          text(ctx, 'piżijiet aġġornati', x + 40, y + 210, { f: 'JB', w: 700, s: 36, color: C.green, alpha: clamp((lt - 1.8) / 0.1) });
        }
        // dials (the weights being nudged)
        for (let k = 0; k < 5; k++) {
          const dx = XL + 90 + k * 190, dy = 1150;
          const base = rnd(k, 3) * TAU;
          const turn = lt >= 1.75 ? Ease.outBack(clamp((lt - 1.75 - k * 0.03) / 0.2)) * (rnd(k, 4) - 0.5) * 2.2 : 0;
          const a = base + turn;
          ctx.strokeStyle = rgba(C.paper, 0.7);
          ctx.lineWidth = 5;
          M.circle(ctx, dx, dy, 58);
          ctx.stroke();
          ctx.strokeStyle = lt >= 1.75 ? C.green : C.yellow;
          ctx.lineWidth = 8;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(dx, dy);
          ctx.lineTo(dx + Math.cos(a) * 44, dy + Math.sin(a) * 44);
          ctx.stroke();
          text(ctx, `w${k + 1}`, dx, dy + 100, { f: 'JB', w: 600, s: 26, color: C.grey, align: 'center' });
        }
        ctx.restore();
      }

      // 3) montage
      if (lt >= 1.95) {
        const mp = Ease.snap(prog(lt, 1.95, 2.2));
        const dim = 1 - 0.7 * prog(lt, 3.2, 3.3);
        ctx.save();
        ctx.globalAlpha = mp * dim;
        const cw = 440, ch = 150;
        MINI.forEach((m, i) => {
          const col = i % 2, row = Math.floor(i / 2);
          const x = XL + col * (cw + 56), y = 660 + row * (ch + 26);
          const period = lerp(0.42, 0.14, prog(lt, 2.0, 3.2));
          const ph = ((lt - 2.0 + i * 0.07) / period) % 2;
          const ok = ph > 1;
          ctx.fillStyle = C.ink2;
          M.rrect(ctx, x, y, cw, ch, 24);
          ctx.fill();
          ctx.strokeStyle = ok ? rgba(C.green, 0.8) : rgba(C.red, 0.8);
          ctx.lineWidth = 3;
          ctx.stroke();
          text(ctx, m[0], x + 24, y + 58, { f: 'A', w: 700, s: 32, wd: 86, color: C.paper });
          text(ctx, ok ? m[1] : m[2], x + 24, y + 116, { f: 'A', w: 900, s: 40, wd: 86, color: ok ? C.green : C.red });
          stamp(ctx, x + cw - 50, y + 100, 44, ok);
        });
        // loss curve
        const lx = XL, ly = 1210, lw = XW, lh = 240;
        ctx.strokeStyle = rgba(C.paper, 0.4);
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(lx, ly);
        ctx.lineTo(lx, ly + lh);
        ctx.lineTo(lx + lw, ly + lh);
        ctx.stroke();
        text(ctx, 'żbalji', lx + 14, ly + 28, { f: 'JB', w: 600, s: 26, color: C.grey });
        text(ctx, 'taħriġ →', lx + lw, ly + lh + 38, { f: 'JB', w: 600, s: 26, color: C.grey, align: 'right' });
        const dp = Ease.inOutQuad(prog(lt, 2.0, 3.25));
        ctx.lineJoin = 'round';
        for (const [lwid, a] of [[14, 0.2], [5, 1]]) {
          ctx.strokeStyle = rgba(C.yellow, a);
          ctx.lineWidth = lwid;
          ctx.beginPath();
          for (let u = 0; u <= dp; u += 0.004) {
            const v = 0.92 * Math.exp(-u * 3.4) + 0.06 + noise1(u * 60, 5) * 0.05 * (1 - u * 0.7);
            const px = lx + u * lw, py = ly + lh - v * lh;
            u === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
          }
          ctx.stroke();
        }
        ctx.restore();
        // odometer
        const op = Ease.snap(prog(lt, 2.1, 2.3)) * dim;
        if (op > 0) {
          ctx.save();
          ctx.globalAlpha = op;
          text(ctx, '×', XL, 630 - 50, { f: 'JB', w: 800, s: 44, color: C.yellow });
          ctx.font = M.fontStr('JB', 800, 44);
          const digits = 13;
          for (let d = 0; d < digits; d++) {
            const v = ((lt - 2.0) * (4 + (digits - d) * 3.6) + d * 0.41) % 10;
            const x = XL + 44 + d * 30 + Math.floor((d + 2) / 3) * 12, yb = 630 - 50;
            ctx.save();
            ctx.beginPath();
            ctx.rect(x - 2, yb - 42, 30, 52);
            ctx.clip();
            for (let q = -1; q <= 1; q++) {
              ctx.fillStyle = C.paper;
              ctx.fillText(String((Math.floor(v) + q + 10) % 10), x, yb - (q - (v % 1)) * 46);
            }
            ctx.restore();
          }
          text(ctx, 'drabi', XL + 44 + digits * 30 + 5 * 12 + 12, 630 - 50, { f: 'JB', w: 600, s: 30, color: C.grey });
          ctx.restore();
        }
      }
      ctx.restore();
      // 4) TRILJUNI TA' DRABI.
      const k = lt - 3.25;
      if (k > 0) {
        ctx.fillStyle = rgba(C.ink, 0.55 * clamp(k / 0.1));
        ctx.fillRect(0, 0, W, H);
        const s1 = fitSize(ctx, 'TRILJUNI', XW, 'A', 900, 70);
        const s2 = fitSize(ctx, "TA' DRABI.", XW, 'A', 900, 125);
        const slam = Ease.outExpo(clamp(k / 0.2));
        ctx.save();
        ctx.translate(W / 2, 960);
        ctx.scale(lerp(1.5, 1, slam), lerp(1.5, 1, slam));
        text(ctx, 'TRILJUNI', -W / 2 + XL, -10, { f: 'A', w: 900, s: s1, wd: 70, color: C.paper });
        text(ctx, "TA' DRABI.", -W / 2 + XL, s2 * 0.9, { f: 'A', w: 900, s: s2, wd: 125, color: C.yellow });
        ctx.restore();
      }
    },
    fx(fx, lt) {
      fx.vig = 0.45;
      if (lt < 0.1) fx.glitch = Math.max(fx.glitch, 0.9);
      if (lt >= 1.25 && lt < 1.3) fx.ca += 2;
      if (lt > 3.92) fx.glitch = Math.max(fx.glitch, 0.8);
    },
    mb(lt) {
      if (lt < 0.8) return 6;
      if (lt > 1.9) return 5;
      return 4;
    },
  });
})(window);

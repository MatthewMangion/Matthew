// S08 — PREDICT (36–44s) on limestone cream: "U FL-AĦĦAR? INBASSAR IL-KELMA LI JMISS." →
//        "L-aħjar pastizzi huma tal-…" irkotta vs piżelli photo-finish → "Lanqas jien ma nista' niddeċiedi." →
//        "It-traffiku f'Malta huwa…" → kaos 99.9% (BIP BIP!) → swipe up
(function (G) {
  const { W, H, C, TAU, clamp, lerp, prog, Ease, rgba, mix, noise1, rnd, rndr, fitSize, layout, drawGlyphs, shake, spring, text, kf } = M;
  const XL = 72, XW = W - 144;
  const BROWN = '#6B3A1E';

  const CARD = { x: XL, y: 450, w: XW, h: 210 };
  const ROWS_Y = [860, 1010, 1160];

  function card(ctx, lt, prompt, typedT, cps, slotFn) {
    const { x, y, w, h } = CARD;
    ctx.fillStyle = rgba(C.ink, 0.12);
    M.rrect(ctx, x + 8, y + 12, w, h, 34);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    M.rrect(ctx, x, y, w, h, 34);
    ctx.fill();
    ctx.strokeStyle = rgba(C.ink, 0.9);
    ctx.lineWidth = 4;
    ctx.stroke();
    text(ctx, 'PROMPT', x + 36, y + 52, { f: 'JB', w: 700, s: 22, color: C.grey, track: 4 });
    const shown = L.typed(prompt, lt - typedT, cps);
    const s = 60;
    text(ctx, shown, x + 36, y + 140, { f: 'A', w: 800, s, wd: 90, color: C.ink });
    const tw = M.textWidth(ctx, shown, 'A', 800, s, 90);
    const done = shown.length >= Array.from(prompt).length;
    // next-token slot
    const sx = x + 36 + tw + 10;
    if (slotFn && done) slotFn(sx, y + 140, s);
    else if (Math.floor(lt * 3) % 2 === 0) {
      ctx.fillStyle = C.red;
      ctx.fillRect(sx, y + 140 - s * 0.75, 8, s * 0.85);
    }
  }

  function bars(ctx, lt, rows, t0, vals, alphaAll = 1) {
    const grow = Ease.outExpo(prog(lt, t0, t0 + 0.35));
    text(ctx, 'IL-KELMA LI JMISS', XL, ROWS_Y[0] - 110, { f: 'JB', w: 700, s: 24, color: C.grey, track: 4, alpha: grow * alphaAll });
    text(ctx, 'PROBABBILTÀ', W - XL, ROWS_Y[0] - 110, { f: 'JB', w: 700, s: 24, color: C.grey, track: 4, align: 'right', alpha: grow * alphaAll });
    rows.forEach((r, i) => {
      const y = ROWS_Y[i];
      const a = clamp((lt - t0 - i * 0.06) / 0.2) * alphaAll;
      if (a <= 0) return;
      text(ctx, r.w, XL, y + 22, { f: 'A', w: 900, s: 64, wd: 90, color: C.ink, alpha: a });
      const bx = 410, bw = W - XL - bx;
      ctx.fillStyle = rgba(C.ink, 0.08 * a);
      M.rrect(ctx, bx, y - 34, bw, 68, 16);
      ctx.fill();
      const v = clamp(vals[i]);
      const ww = Math.max(10, bw * Math.min(1.12, vals[i]) * grow);
      ctx.fillStyle = r.col;
      M.rrect(ctx, bx, y - 34, ww, 68, 16);
      ctx.fill();
      const pct = (Math.min(v, 0.999) * 100).toFixed(1) + '%';
      const inside = ww > 260;
      text(ctx, pct, inside ? bx + ww - 18 : bx + ww + 16, y + 16, { f: 'JB', w: 800, s: 44, color: inside ? '#FFFFFF' : C.ink, align: inside ? 'right' : 'left', alpha: a });
    });
  }

  addScene({
    name: 'predict',
    t0: TL.S.predict[0],
    t1: TL.S.predict[1],
    draw(ctx, lt, t) {
      ctx.fillStyle = C.paper;
      ctx.fillRect(0, 0, W, H);
      // limestone speckle
      for (let i = 0; i < 260; i++) {
        ctx.fillStyle = rgba(C.stone, 0.5);
        ctx.fillRect(rnd(i, 1) * W, rnd(i, 2) * H, 3 + rnd(i, 3) * 4, 3 + rnd(i, 3) * 4);
      }
      const swipe = Ease.inExpo(prog(lt, 7.55, 8.0));
      const sh = shake(lt, [[0, 1.2], [0.75, 0.6], [1.0, 0.6], [1.25, 0.8], [6.6, 1.6]], 16, 10);
      ctx.save();
      ctx.translate(sh.dx, sh.dy - swipe * H);

      // ── headline ──
      const head = lt < 2.0;
      const shrink = Ease.swift(prog(lt, 1.7, 2.0));
      if (lt < 2.05) {
        ctx.save();
        ctx.globalAlpha = 1 - prog(lt, 1.85, 2.0);
        ctx.translate(0, -shrink * 300);
        const s1 = fitSize(ctx, 'U FL-AĦĦAR?', XW, 'A', 900, 88);
        const slam = Ease.outExpo(prog(lt, 0, 0.22));
        ctx.save();
        ctx.translate(W / 2, 700);
        ctx.scale(lerp(1.35, 1, slam), lerp(1.35, 1, slam));
        text(ctx, 'U FL-AĦĦAR?', -W / 2 + XL, 0, { f: 'A', w: 900, s: s1, wd: 88, color: C.ink });
        ctx.restore();
        const lines = [['INBASSAR', C.ink, 0.75, 70], ['IL-KELMA', C.red, 1.0, 100], ['LI JMISS.', C.red, 1.25, 100]];
        lines.forEach(([str, col, at, wd], i) => {
          const p = Ease.snap(prog(lt, at, at + 0.2));
          if (p <= 0) return;
          const s = fitSize(ctx, str, XW, 'A', 900, wd);
          const y = 900 + i * (s * 0.78 + 20);
          ctx.save();
          ctx.beginPath();
          ctx.rect(0, y - s * 0.76, W, s * 0.8);
          ctx.clip();
          text(ctx, str, XL, y + (1 - p) * s, { f: 'A', w: 900, s, wd, color: col });
          ctx.restore();
        });
        ctx.restore();
      }
      // section tag
      const tagP = Ease.snap(prog(lt, 1.95, 2.25));
      if (tagP > 0) text(ctx, 'INBASSAR IL-KELMA LI JMISS', XL, 360, { f: 'JB', w: 800, s: 30, color: C.red, track: 3, alpha: tagP });

      // ── pastizzi ──
      const P1 = lt >= 2.0 && lt < 6.0;
      if (P1) {
        const out = Ease.inQuart(prog(lt, 5.8, 6.0));
        ctx.save();
        ctx.globalAlpha = 1 - out;
        const cin = Ease.snap(prog(lt, 2.0, 2.3));
        ctx.translate(0, (1 - cin) * 80);
        // race values
        const d = kf(lt, [[2.9, 0], [3.15, 0.34, Ease.inOutCubic], [3.45, -0.28, Ease.inOutCubic], [3.75, 0.22, Ease.inOutCubic], [4.05, -0.14, Ease.inOutCubic], [4.3, 0.06, Ease.inOutCubic], [4.5, 0.0035, Ease.inOutCubic]]);
        const frozen = lt >= 5.0;
        const nut = kf(lt, [[2.9, 0.06], [4.5, 0.001, Ease.outCubic]]);
        const jit = lt < 4.5 ? noise1(lt * 30, 3) * 0.01 : 0;
        const irk = (0.999 - nut + d) / 2 + jit, piz = (0.999 - nut - d) / 2 - jit;
        card(ctx, lt, 'L-aħjar pastizzi huma tal-', 2.0, 36, (sx, sy, s) => {
          // flicker between the two candidates — it can't decide
          const opts = ['irkotta', 'piżelli'];
          const k = lt < 4.5 ? (irk > piz ? 0 : 1) : Math.floor(lt * 10) % 2;
          const undecided = lt >= 5.0;
          const word = opts[k];
          const col = undecided ? C.grey : k === 0 ? C.red : C.green;
          const w = undecided ? M.textWidth(ctx, 'piżelli?', 'A', 800, s * 0.48, 90) : M.textWidth(ctx, word, 'A', 800, s, 90);
          ctx.setLineDash([10, 8]);
          ctx.strokeStyle = col;
          ctx.lineWidth = 3;
          M.rrect(ctx, sx - 6, sy - s * 0.82, w + 16, s * 1.04, 12);
          ctx.stroke();
          ctx.setLineDash([]);
          if (undecided) {
            text(ctx, 'irkotta?', sx + 2, sy - s * 0.42, { f: 'A', w: 800, s: s * 0.48, wd: 90, color: C.red });
            text(ctx, 'piżelli?', sx + 2, sy + s * 0.08, { f: 'A', w: 800, s: s * 0.48, wd: 90, color: C.green });
          } else text(ctx, word, sx + 2, sy, { f: 'A', w: 800, s, wd: 90, color: col, alpha: lt < 2.9 ? 0 : 0.9 });
        });
        bars(ctx, lt, [{ w: 'irkotta', col: C.red }, { w: 'piżelli', col: C.green }, { w: 'Nutella', col: BROWN }], 2.9, [irk, piz, nut]);
        // photo-finish line
        const pf = prog(lt, 4.5, 4.7);
        if (pf > 0) {
          const bx = 410 + (W - XL - 410) * 0.5;
          ctx.strokeStyle = rgba(C.ink, 0.7 * pf);
          ctx.setLineDash([6, 8]);
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(bx, ROWS_Y[0] - 70);
          ctx.lineTo(bx, ROWS_Y[1] + 60);
          ctx.stroke();
          ctx.setLineDash([]);
          text(ctx, '50%', bx, ROWS_Y[0] - 76, { f: 'JB', w: 700, s: 24, color: C.ink, align: 'center', alpha: pf });
        }
        // punchline
        const pl = lt - 5.0;
        if (pl > 0) {
          const p = spring(pl, 2.6, 0.5);
          ctx.save();
          ctx.translate(XL, 1380);
          ctx.rotate(-0.035 * clamp(p));
          ctx.scale(clamp(p, 0, 1.2), clamp(p, 0, 1.2));
          text(ctx, 'Lanqas jien', 0, 0, { f: 'IS', s: 104, color: C.ink });
          text(ctx, "ma nista' niddeċiedi.", 0, 100, { f: 'IS', s: 104, color: C.ink });
          // sweat drop
          const dx = M.textWidth(ctx, "ma nista' niddeċiedi.", 'IS', 400, 104) + 30;
          ctx.fillStyle = C.sky;
          ctx.beginPath();
          ctx.moveTo(dx, -40);
          ctx.bezierCurveTo(dx + 26, 0, dx + 30, 20, dx, 30);
          ctx.bezierCurveTo(dx - 30, 20, dx - 26, 0, dx, -40);
          ctx.fill();
          ctx.restore();
        }
        ctx.restore();
      }

      // ── traffic ──
      if (lt >= 6.0) {
        const cin = Ease.snap(prog(lt, 6.0, 6.2));
        ctx.save();
        ctx.translate(0, (1 - cin) * 80);
        ctx.globalAlpha = cin;
        const slam = spring(lt - 6.6, 3.4, 0.28);
        const kaos = lt < 6.6 ? 0 : 0.999 * slam;
        card(ctx, lt, "It-traffiku f'Malta huwa", 6.0, 44, (sx, sy, s) => {
          if (lt < 6.6) {
            if (Math.floor(lt * 6) % 2 === 0) { ctx.fillStyle = C.red; ctx.fillRect(sx, sy - s * 0.75, 8, s * 0.85); }
            return;
          }
          const p = Ease.outBack(prog(lt, 6.6, 6.8), 3);
          ctx.save();
          ctx.translate(sx, sy - s * 0.3);
          ctx.scale(p, p);
          text(ctx, 'kaos.', 0, s * 0.3, { f: 'A', w: 900, s, wd: 90, color: C.red });
          ctx.restore();
        });
        bars(ctx, lt, [{ w: 'kaos', col: C.red }, { w: 'tajjeb', col: C.green }, { w: 'ħafif', col: C.sky }], 6.25, [kaos, 0.001, 0.0]);
        // BIP BIP!
        const bp = lt - 6.62;
        if (bp > 0) {
          for (let k = 0; k < 2; k++) {
            const p = spring(bp - k * 0.16, 3.8, 0.35);
            if (p <= 0) continue;
            ctx.save();
            ctx.translate(k ? 760 : 560, k ? 1330 : 1420);
            ctx.rotate(k ? 0.12 : -0.1);
            ctx.scale(p, p);
            // comic burst
            ctx.fillStyle = C.yellow;
            ctx.beginPath();
            for (let j = 0; j < 22; j++) {
              const a = (j / 22) * TAU, r = j % 2 ? 150 : 110;
              j ? ctx.lineTo(Math.cos(a) * r * 1.3, Math.sin(a) * r * 0.8) : ctx.moveTo(Math.cos(a) * r * 1.3, Math.sin(a) * r * 0.8);
            }
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = C.ink;
            ctx.lineWidth = 5;
            ctx.stroke();
            text(ctx, 'BIP!', 0, 30, { f: 'A', w: 900, s: 96, wd: 110, color: C.red, align: 'center' });
            ctx.restore();
          }
        }
        ctx.restore();
      }
      ctx.restore();
      // swipe-up reveals the ink stage of the next scene
      if (swipe > 0) {
        ctx.fillStyle = C.ink;
        ctx.fillRect(0, H - swipe * H, W, H);
      }
    },
    fx(fx, lt) {
      fx.vig = 0.2;
      fx.bloom = 0.06;
      fx.grain = 0.013;
      // tape-stop: desaturate + slight darkening during the punchline freeze
      const f = prog(lt, 5.0, 5.12) * (1 - prog(lt, 5.8, 6.0));
      fx.sat = lerp(fx.sat, 0.35, f);
      fx.expo = lerp(1, 0.92, f);
      if (lt >= 6.6 && lt < 6.7) fx.ca += 2.0;
    },
    mb(lt) {
      if (lt < 0.3 || (lt > 0.7 && lt < 1.5)) return 6;
      if (lt > 1.6 && lt < 2.3) return 6;
      if (lt > 6.55 && lt < 7.0) return 6;
      if (lt > 7.5) return 10;
      return 3;
    },
  });
})(window);

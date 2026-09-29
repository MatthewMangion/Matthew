// S04 — TOKENS (12–16s) on luzzu yellow: "IMMA MA NARAX KLIEM." → "NARA TOKENS." → laser-slice "Ħobż biż-żejt"
//        → pieces fly into a vertical stack of chips → each maps to its ID → "Kull biċċa ssir numru." → iris
(function (G) {
  const { W, H, C, TAU, clamp, lerp, prog, Ease, rgba, mix, noise1, rnd, rndr, fitSize, layout, drawGlyphs, shake, spring, text } = M;
  const XL = 72, XW = W - 144;

  const TOK = ['Ħ', 'obż', ' biż', '-ż', 'ejt'];
  const IDS = ['14203', '88157', '3690', '12', '120431'];
  const COLS = [C.blue, C.red, C.green, C.ink, C.pink];
  const CUTS = [1.2, 1.35, 1.5, 1.65];
  const PHRASE = TOK.join('');
  const PY = 760; // phrase baseline
  const STACK_Y = 800, STEP = 128, CH = 108, CS = 82; // stack geometry, chip text size

  function slot(ctx, a, b, x, y, s, wd, lt, t0, colA, colB) {
    const p = Ease.snap(prog(lt, t0, t0 + 0.2));
    ctx.save();
    ctx.beginPath();
    ctx.rect(-40, y - s * 0.76, W, s * 0.82);
    ctx.clip();
    if (p < 1) text(ctx, a, x, y - p * s * 0.85, { f: 'A', w: 900, s, wd, color: colA });
    if (p > 0) text(ctx, b, x, y + (1 - p) * s * 0.85, { f: 'A', w: 900, s, wd, color: colB });
    ctx.restore();
  }

  function tokText(ctx, str, x, y, s, col, alpha = 1) {
    // leading space shown as a dim middle dot (how tokenizers keep the space)
    if (str.startsWith(' ')) {
      const sw = M.textWidth(ctx, ' ', 'A', 900, s, 88);
      text(ctx, '·', x, y, { f: 'A', w: 900, s, wd: 88, color: col, alpha: 0.45 * alpha });
      text(ctx, str.slice(1), x + sw, y, { f: 'A', w: 900, s, wd: 88, color: col, alpha });
    } else text(ctx, str, x, y, { f: 'A', w: 900, s, wd: 88, color: col, alpha });
  }

  addScene({
    name: 'tokens',
    t0: TL.S.tokens[0],
    t1: TL.S.tokens[1],
    draw(ctx, lt, t) {
      ctx.fillStyle = C.yellow;
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = rgba(C.ink, 0.07);
      for (let y = 0; y < H; y += 36) for (let x = (y / 36) % 2 ? 18 : 0; x < W; x += 36) ctx.fillRect(x, y, 4, 4);

      const sh = shake(lt, [[0, 0.6], [0.75, 0.7], ...CUTS.map((c) => [c, 0.45])], 14, 12);
      ctx.save();
      ctx.translate(sh.dx, sh.dy);

      // ── headline ──
      const up = Ease.swift(prog(lt, 0.9, 1.2));
      ctx.save();
      ctx.translate(XL, lerp(520, 400, up));
      const hs = lerp(1, 0.72, up);
      ctx.scale(hs, hs);
      const sA = fitSize(ctx, 'IMMA MA NARAX', XW, 'A', 900, 70);
      const sB = fitSize(ctx, 'KLIEM.', 560, 'A', 900, 125);
      const inA = Ease.snap(prog(lt, 0, 0.28));
      ctx.save();
      ctx.beginPath();
      ctx.rect(-40, -sA * 0.76, W * 1.5, sA * 0.82);
      ctx.clip();
      ctx.translate(0, (1 - inA) * sA);
      slot(ctx, 'IMMA MA NARAX', 'NARA', 0, 0, sA, 70, lt, 0.75, C.ink, C.ink);
      ctx.restore();
      const yB = sB * 0.86 + 10;
      const inB = Ease.snap(prog(lt, 0.08, 0.36));
      ctx.save();
      ctx.translate(0, (1 - inB) * 60);
      ctx.globalAlpha = inB;
      slot(ctx, 'KLIEM.', 'TOKENS.', 0, yB, sB, 125, lt, 0.75, C.ink, C.red);
      const strike = Ease.outExpo(prog(lt, 0.42, 0.6)) * (1 - prog(lt, 0.75, 0.8));
      if (strike > 0) {
        const wK = M.textWidth(ctx, 'KLIEM.', 'A', 900, sB, 125);
        ctx.fillStyle = C.red;
        ctx.save();
        ctx.translate(-10, yB - sB * 0.36);
        ctx.rotate(-0.06);
        ctx.fillRect(0, -12, (wK + 20) * strike, 24);
        ctx.restore();
      }
      ctx.restore();
      ctx.restore();

      // ── phrase → chips ──
      const pl = lt - 1.0;
      const sP = fitSize(ctx, PHRASE, XW, 'A', 900, 88);
      const Lp = layout(ctx, PHRASE, 'A', 900, sP, 88);
      const toDots = Ease.inBack(prog(lt, 3.42, 3.72), 1.6);
      if (pl > 0) {
        const bounds = [];
        let gi = 0;
        for (const tk of TOK) { bounds.push([gi, gi + Array.from(tk).length]); gi += Array.from(tk).length; }
        const x0 = W / 2 - Lp.width / 2;
        const enter = Ease.snap(prog(pl, 0, 0.3));
        const gapOf = (k) => {
          let g = 0;
          for (let c = 0; c < CUTS.length; c++) if (c < k) g += 18 * Ease.outBack(prog(lt, CUTS[c], CUTS[c] + 0.25), 2.2);
          return g;
        };
        const totalGap = gapOf(TOK.length - 1);
        for (let k = 0; k < TOK.length; k++) {
          const [a, b] = bounds[k];
          const gx0 = Lp.glyphs[a].x, gx1 = Lp.glyphs[b - 1].x + Lp.glyphs[b - 1].w;
          // phrase-state geometry
          const px = x0 + gapOf(k) - totalGap / 2 + gx0;
          // stack-state geometry
          const cs = CS;
          const tw = M.textWidth(ctx, TOK[k], 'A', 900, cs, 88);
          const cw = tw + 44;
          const sx = XL, sy = STACK_Y + k * STEP;
          const fly = Ease.inOutCubic(prog(lt, 1.8 + k * 0.07, 2.25 + k * 0.07));
          const chip = Ease.snap(prog(lt, 1.8 + k * 0.07, 2.05 + k * 0.07));
          const s = lerp(sP, cs, fly);
          const tx = lerp(px, sx + 22, fly) + Math.sin(fly * Math.PI) * 60 * (k - 2);
          const by = lerp(PY + (1 - enter) * 90, sy + cs * 0.36, fly);
          const dsc = 1 - toDots;
          ctx.save();
          ctx.translate(tx, by - s * 0.36);
          ctx.scale(dsc, dsc);
          ctx.translate(-tx, -(by - s * 0.36));
          if (chip > 0) {
            const w = lerp(gx1 - gx0, tw, fly) + 44 * chip;
            const h = lerp(sP * 0.9, CH, fly) * chip;
            M.rrect(ctx, tx - 22 * chip, by - s * 0.36 - h / 2, w, h, 22);
            ctx.fillStyle = COLS[k];
            ctx.fill();
          }
          tokText(ctx, TOK[k], tx, by, s, mix(C.ink, C.paper, chip));
          ctx.restore();
          // arrow + ID
          const ap = Ease.outExpo(prog(lt, 2.3 + k * 0.08, 2.6 + k * 0.08)) * (1 - toDots);
          if (ap > 0) {
            const ax0 = sx + cw + 26, ax1 = 590, ay = sy;
            ctx.strokeStyle = rgba(C.ink, 0.85);
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.moveTo(ax0, ay);
            ctx.lineTo(lerp(ax0, ax1, ap), ay);
            ctx.stroke();
            if (ap > 0.9) {
              ctx.fillStyle = C.ink;
              ctx.beginPath();
              ctx.moveTo(ax1 + 8, ay); ctx.lineTo(ax1 - 12, ay - 12); ctx.lineTo(ax1 - 12, ay + 12);
              ctx.fill();
            }
            // ID digits roll in
            const idp = prog(lt, 2.4 + k * 0.08, 2.75 + k * 0.08);
            const str = IDS[k];
            const shown = str.split('').map((ch, j) => (idp * (str.length + 2) > j + 1 ? ch : String(Math.floor(rnd(j + k * 10, Math.floor(lt * 30)) * 10)))).join('');
            text(ctx, shown, W - XL, ay + 26, { f: 'JB', w: 800, s: 76, color: C.ink, align: 'right', alpha: clamp(idp * 3) });
          }
          if (toDots > 0.55) {
            const r = 14 * (1 - prog(lt, 3.72, 3.9));
            M.circle(ctx, tx + 8, sy, r);
            ctx.fillStyle = COLS[k];
            ctx.fill();
          }
        }
        // laser cuts
        for (let c = 0; c < CUTS.length; c++) {
          const cl = lt - CUTS[c];
          if (cl < -0.06 || cl > 0.22) continue;
          const [a] = bounds[c + 1];
          const cx = x0 + Lp.glyphs[a].x + gapOf(c + 1) - totalGap / 2 - 9 * Ease.outBack(prog(lt, CUTS[c], CUTS[c] + 0.25), 2.2);
          const sweep = Ease.outExpo(clamp((cl + 0.06) / 0.1));
          const fade = 1 - clamp(cl / 0.22);
          const y0 = PY - sP * 1.2, y1 = y0 + sP * 1.55 * sweep;
          ctx.strokeStyle = rgba(C.red, 0.35 * fade);
          ctx.lineWidth = 26;
          ctx.beginPath(); ctx.moveTo(cx, y0); ctx.lineTo(cx, y1); ctx.stroke();
          ctx.strokeStyle = rgba('#FFFFFF', fade);
          ctx.lineWidth = 6;
          ctx.beginPath(); ctx.moveTo(cx, y0); ctx.lineTo(cx, y1); ctx.stroke();
          for (let s2 = 0; s2 < 16; s2++) {
            const an = rndr(s2, c * 7 + 1, -Math.PI, Math.PI);
            const v = rndr(s2, c * 7 + 2, 200, 900);
            const tt = clamp(cl, 0, 0.3);
            const qx = cx + Math.cos(an) * v * tt, qy = y1 + Math.sin(an) * v * tt + 900 * tt * tt;
            ctx.fillStyle = rgba(s2 % 3 ? C.red : C.paper, fade);
            ctx.fillRect(qx - 3, qy - 3, 6, 6);
          }
        }
        // column labels
        const hp = Ease.snap(prog(lt, 2.3, 2.6)) * (1 - toDots);
        if (hp > 0) {
          text(ctx, 'TOKEN', XL, STACK_Y - 78, { f: 'JB', w: 700, s: 24, color: C.ink, alpha: 0.6 * hp, track: 4 });
          text(ctx, 'ID', W - XL, STACK_Y - 78, { f: 'JB', w: 700, s: 24, color: C.ink, alpha: 0.6 * hp, track: 4, align: 'right' });
        }
      }
      ctx.restore();

      // captions
      const c1 = lt - 3.0;
      if (c1 > 0) {
        const p = Ease.snap(clamp(c1 / 0.35));
        const a = 1 - prog(lt, 3.4, 3.55);
        const cy = STACK_Y + 4 * STEP + 130;
        text(ctx, 'Kull biċċa ssir numru.', XL, cy + (1 - p) * 40, { f: 'IS', s: 90, color: C.ink, alpha: p * a });
        const p2 = Ease.snap(clamp((c1 - 0.2) / 0.35));
        text(ctx, "* bil-Malti, il-kliem jinqasam f'aktar biċċiet", XL + 4, cy + 58 + (1 - p2) * 30, { f: 'JB', w: 500, s: 26, color: C.ink, alpha: p2 * 0.7 * a });
      }
      // iris into navy embedding space
      const ir = Ease.inExpo(prog(lt, 3.62, 3.98));
      if (ir > 0) {
        M.circle(ctx, W / 2, 1100, ir * 2300);
        ctx.fillStyle = C.navy;
        ctx.fill();
      }
    },
    fx(fx, lt) {
      fx.vig = 0.22;
      fx.bloom = 0.1;
      fx.grain = 0.014;
      for (const c of CUTS) fx.ca += lt >= c ? 1.0 * Math.exp(-(lt - c) * 20) : 0;
    },
    mb(lt) {
      if (lt < 0.4 || (lt > 0.7 && lt < 1.1)) return 6;
      if (lt > 1.15 && lt < 2.6) return 6;
      if (lt > 3.4) return 6;
      return 3;
    },
  });
})(window);

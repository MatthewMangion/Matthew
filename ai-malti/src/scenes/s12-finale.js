// S12 — FINALE (56–64s): "MHUX MAĠIJA." (silence) → "MATEMATIKA." + festa fireworks made of maths →
//        CTA "Irkotta jew piżelli? ikteb fil-kummenti" → end card "SEGWI GĦAL AKTAR · AI BIL-MALTI" → seamless loop
(function (G) {
  const { W, H, C, TAU, clamp, lerp, prog, Ease, rgba, mix, noise1, rnd, rndr, fitSize, layout, drawGlyphs, shake, spring, text, kf } = M;
  const XL = 72, XW = W - 144;
  const GLYPHS = '0123456789+−×÷=∑π√∞∫λ%'.split('');
  const PAL = [C.yellow, C.red, C.green, C.sky, C.pink, C.paper];
  const BURSTS = [
    [1.04, 540, 700, 0], [1.3, 250, 1120, 1], [1.52, 830, 930, 2], [1.78, 560, 1300, 3], [2.05, 230, 560, 4], [2.3, 860, 1360, 0], [2.6, 520, 520, 1],
  ];

  function fireworks(ctx, lt) {
    for (let b = 0; b < BURSTS.length; b++) {
      const [bt, bx, by, ci] = BURSTS[b];
      const tau = lt - bt;
      if (tau < 0 || tau > 2.4) continue;
      const col = PAL[ci];
      // flash ring
      if (tau < 0.35) {
        const r = Ease.outExpo(tau / 0.35) * 260;
        ctx.strokeStyle = rgba(col, 1 - tau / 0.35);
        ctx.lineWidth = 10 * (1 - tau / 0.35) + 1;
        M.circle(ctx, bx, by, r);
        ctx.stroke();
        M.glowDot(ctx, bx, by, 200 * (1 - tau / 0.35) + 40, col, 0.8 * (1 - tau / 0.35));
      }
      const n = 64;
      for (let i = 0; i < n; i++) {
        const life = rndr(i, b * 13 + 1, 1.3, 2.2);
        if (tau > life) continue;
        const a = (i / n) * TAU + rndr(i, b * 13 + 2, -0.08, 0.08);
        const v = rndr(i, b * 13 + 3, 520, 1250);
        const k = 2.4;
        const e = (1 - Math.exp(-k * tau)) / k;
        const x = bx + Math.cos(a) * v * e;
        const y = by + Math.sin(a) * v * e + 520 * tau * tau * 0.5;
        const u = tau / life;
        const al = 1 - u * u;
        const tw = u > 0.6 ? (rnd(i + Math.floor(tau * 20) * 97, b) > 0.5 ? 1 : 0.2) : 1;
        const s = rndr(i, b * 13 + 4, 26, 44) * (1 - u * 0.5);
        const pc = i % 7 === 0 ? C.paper : col;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(tau * rndr(i, b * 13 + 5, -6, 6));
        text(ctx, GLYPHS[(i + b * 5) % GLYPHS.length], 0, s * 0.35, { f: 'A', w: 900, s, color: pc, align: 'center', alpha: al * tw });
        ctx.restore();
      }
    }
  }

  function layered(ctx, str, x, y, s, wd, cols, depth) {
    // offset-extrusion type (luzzu stripes)
    for (let k = depth; k >= 1; k--) {
      text(ctx, str, x + k * 7, y + k * 7, { f: 'A', w: 900, s, wd, color: cols[k % cols.length] });
    }
    text(ctx, str, x, y, { f: 'A', w: 900, s, wd, color: C.paper });
  }

  addScene({
    name: 'finale',
    push: false,
    t0: TL.S.finale[0],
    t1: TL.S.finale[1],
    draw(ctx, lt, t) {
      ctx.fillStyle = lt < 1.0 ? '#050507' : C.ink;
      ctx.fillRect(0, 0, W, H);
      if (lt >= 1.0 && lt < 6.6) L.bgDots(ctx, t, { alpha: 0.06 });
      const sh = shake(lt, [[1.0, 2.2], [1.3, 0.6], [1.52, 0.6], [1.78, 0.6], [3.0, 0.8], [5.0, 0.8]], 20, 7);
      ctx.save();
      ctx.translate(sh.dx, sh.dy);

      // 1) MHUX MAĠIJA.
      if (lt < 1.0) {
        const s = 104;
        drawGlyphs(ctx, 'MHUX MAĠIJA.', W / 2, 990, { f: 'A', w: 800, s, wd: 100, color: C.paper, align: 'center' }, (i) => {
          const p = Ease.outCubic(clamp((lt - 0.08 - i * 0.035) / 0.4));
          const flick = lt > 0.8 && rnd(i + Math.floor(lt * 30) * 17, 3) > 0.7 ? 0.4 : 1;
          return { alpha: p * flick, dy: (1 - p) * 20, sx: lerp(1.2, 1, p), sy: lerp(1.2, 1, p) };
        });
      }
      // 2) MATEMATIKA. + fireworks
      if (lt >= 1.0 && lt < 3.2) {
        fireworks(ctx, lt);
        const k = lt - 1.0;
        const up = Ease.swift(prog(lt, 2.75, 3.05));
        const s = fitSize(ctx, 'MATEMATIKA.', XW, 'A', 900, 70);
        const slam = Ease.outExpo(clamp(k / 0.22));
        const sc = lerp(1.6, 1, slam) * lerp(1, 0.55, up) * (1 + 0.03 * Math.sin(k * 3));
        ctx.save();
        ctx.translate(W / 2, lerp(1000, 520, up));
        ctx.scale(sc, sc);
        ctx.globalAlpha = 1 - prog(lt, 3.0, 3.18);
        layered(ctx, 'MATEMATIKA.', -W / 2 + XL, s * 0.36, s, 70, [C.red, C.yellow, C.sky], Math.round(lerp(0, 5, Ease.outBack(clamp((k - 0.05) / 0.3)))));
        ctx.restore();
      }
      // 3) CTA — Irkotta jew piżelli?
      const c = lt - 3.0;
      const toEnd = Ease.inExpo(prog(lt, 4.85, 5.1));
      if (c > 0 && toEnd < 1) {
        ctx.save();
        ctx.translate(-toEnd * W * 1.2, 0);
        const s1 = fitSize(ctx, 'Irkotta', 700, 'A', 900, 92);
        const p1 = spring(c, 2.8, 0.42), p2 = spring(c - 0.12, 2.8, 0.42), p3 = spring(c - 0.22, 2.8, 0.42);
        ctx.save();
        ctx.translate(XL, 760);
        ctx.rotate(-0.04);
        ctx.scale(p1, p1);
        text(ctx, 'Irkotta', 0, 0, { f: 'A', w: 900, s: s1, wd: 92, color: C.red });
        ctx.restore();
        ctx.save();
        ctx.translate(W / 2 + 60, 900);
        ctx.scale(p2, p2);
        text(ctx, 'jew', 0, 0, { f: 'IS', s: 150, color: C.paper, align: 'center' });
        ctx.restore();
        const s3 = fitSize(ctx, 'piżelli?', 760, 'A', 900, 92);
        ctx.save();
        ctx.translate(W - XL, 1110);
        ctx.rotate(0.03);
        ctx.scale(p3, p3);
        text(ctx, 'piżelli?', 0, 0, { f: 'A', w: 900, s: s3, wd: 92, color: C.green, align: 'right' });
        ctx.restore();
        // comment prompt + bouncing arrow
        const cp = Ease.snap(prog(c, 0.5, 0.8));
        if (cp > 0) {
          ctx.fillStyle = C.paper;
          const bw = 700, bh = 110, bx = W / 2 - bw / 2, by = 1250 + (1 - cp) * 60;
          M.rrect(ctx, bx, by, bw, bh, 55);
          ctx.globalAlpha = cp;
          ctx.fill();
          text(ctx, 'ikteb fil-kummenti', W / 2 - 40, by + 74, { f: 'A', w: 800, s: 58, wd: 86, color: C.ink, align: 'center' });
          const bounce = Math.abs(Math.sin(c * 6)) * 22;
          ctx.save();
          ctx.translate(bx + bw - 70, by + bh / 2 + 4 + bounce * 0.4);
          ctx.fillStyle = C.red;
          M.circle(ctx, 0, 0, 38);
          ctx.fill();
          ctx.strokeStyle = C.paper;
          ctx.lineWidth = 9;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.beginPath();
          ctx.moveTo(0, -16); ctx.lineTo(0, 16);
          ctx.moveTo(-14, 3); ctx.lineTo(0, 17); ctx.lineTo(14, 3);
          ctx.stroke();
          ctx.restore();
          ctx.globalAlpha = 1;
        }
        ctx.restore();
      }
      // 4) end card
      const e = lt - 5.0;
      const glitchOut = prog(lt, 6.6, 7.1);
      if (e > 0 && lt < 7.1) {
        ctx.save();
        ctx.translate((1 - Ease.outExpo(clamp(e / 0.35))) * W * 1.2, 0);
        ctx.globalAlpha = 1 - glitchOut;
        text(ctx, 'SEGWI GĦAL AKTAR', XL, 640, { f: 'A', w: 900, s: 74, wd: 96, color: C.paper });
        // lockup: flag + AI BIL-MALTI
        const s = fitSize(ctx, 'AI BIL-MALTI', XW - 150, 'A', 900, 78);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(XL, 700, 58, 140 + s * 0.36);
        ctx.fillStyle = C.red;
        ctx.fillRect(XL + 58, 700, 58, 140 + s * 0.36);
        L.georgeCross(ctx, XL + 20, 724, 22);
        const words = ['AI', 'BIL-MALTI'];
        text(ctx, 'AI', XL + 150, 700 + s * 0.72, { f: 'A', w: 900, s, wd: 78, color: C.yellow });
        text(ctx, 'BIL-MALTI', XL + 150 + M.textWidth(ctx, 'AI ', 'A', 900, s, 78), 700 + s * 0.72, { f: 'A', w: 900, s, wd: 78, color: C.paper });
        text(ctx, 'EP. 01 — KIF NAĦDEM', XL, 700 + s * 0.72 + 100, { f: 'JB', w: 700, s: 32, color: C.paper, alpha: 0.8, track: 3 });
        text(ctx, 'jiġi dalwaqt: EP. 02', XL, 700 + s * 0.72 + 150, { f: 'JB', w: 500, s: 28, color: C.sky, alpha: 0.8, track: 2 });
        // credit
        const cr = Ease.snap(prog(e, 0.4, 0.8));
        text(ctx, 'Kull pixel. Kull nota. Kull kelma.', XL, 1310, { f: 'IS', s: 62, color: C.paper, alpha: cr });
        text(ctx, 'Claude · AI', XL, 1385, { f: 'JB', w: 800, s: 34, color: C.yellow, alpha: cr, track: 4 });
        ctx.restore();
      }
      ctx.restore();

      // 5) loop return: DAN / IL-FILMAT typed back into the exact opening layout
      if (lt >= 7.15) {
        const k = lt - 7.15;
        const s1 = fitSize(ctx, 'DAN', XW, 'A', 900, 125);
        const s2 = fitSize(ctx, 'IL-FILMAT', XW, 'A', 900, 64);
        const cap1 = s1 * 0.72, cap2 = s2 * 0.72, gap = 34;
        const top = 960 - (cap1 + gap + cap2) / 2;
        const all = Array.from('DANIL-FILMAT');
        const shown = Math.floor(k / 0.055);
        ctx.save();
        ctx.translate(W / 2, 960);
        const sc = 1.045 + 0.02 * (1 - prog(k, 0, 0.8));
        ctx.scale(sc, sc);
        ctx.translate(-W / 2, -960);
        drawGlyphs(ctx, 'DAN', XL, top + cap1, { f: 'A', w: 900, s: s1, wd: 125, color: C.paper }, (i) => (i >= shown ? { skip: true } : null));
        drawGlyphs(ctx, 'IL-FILMAT', XL, top + cap1 + gap + cap2, { f: 'A', w: 900, s: s2, wd: 64, color: C.paper }, (i) => (i + 3 >= shown ? { skip: true } : null));
        ctx.restore();
        M.text(ctx, '▶ REC  001', XL, top - 40, { f: 'JB', w: 600, s: 26, color: C.red, track: 3, alpha: 0.9 * clamp(k * 4) });
        // viewfinder brackets, identical to frame 0, so the loop point is seamless
        const len = 46, x0 = 44, y0 = 300, x1 = W - 44, y1 = 1560;
        ctx.save();
        ctx.strokeStyle = rgba(C.paper, 0.55 * clamp(k * 3));
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(x0, y0 + len); ctx.lineTo(x0, y0); ctx.lineTo(x0 + len, y0);
        ctx.moveTo(x1 - len, y0); ctx.lineTo(x1, y0); ctx.lineTo(x1, y0 + len);
        ctx.moveTo(x0, y1 - len); ctx.lineTo(x0, y1); ctx.lineTo(x0 + len, y1);
        ctx.moveTo(x1 - len, y1); ctx.lineTo(x1, y1); ctx.lineTo(x1, y1 - len);
        ctx.stroke();
        ctx.restore();
      }
    },
    fx(fx, lt) {
      fx.vig = 0.5;
      if (lt < 1.0) { fx.grain = 0.018; fx.bloom = 0.1; }
      else if (lt < 3.2) { fx.bloom = 0.36; fx.bloomThr = 0.58; fx.flash = Math.max(fx.flash, 0.4 * Math.exp(-(lt - 1.0) * 14)); }
      if (lt > 6.6 && lt < 7.15) fx.glitch = Math.max(fx.glitch, 0.9 * Math.sin(prog(lt, 6.6, 7.15) * Math.PI));
    },
    mb(lt) {
      if (lt > 0.95 && lt < 3.2) return 6;
      if (lt > 4.8 && lt < 5.4) return 8;
      return 3;
    },
  });
})(window);

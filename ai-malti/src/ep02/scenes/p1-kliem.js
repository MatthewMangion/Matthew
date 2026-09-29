// EP02 #1 (52–60 s): “Bil-kliem u s-sliem tasal kullimkien.” → words now drive machines; so talk to it in Maltese.
(function () {
  const { W, H, TAU, clamp, lerp, prog, Ease, rgba, text, spring, rnd, rndr, fitSize } = M;
  const { P, XL, XW, proverb, kicker, lineFit, label, lace, band, inked, rr } = K;
  const PROMPT = 'Agħmilli poster għall-festa.';
  const BOX = { x: XL, y: 700, w: XW, h: 104 };
  // the “sliem”: kind words pop up while the proverb reads, then pour into the prompt box
  const GREET = [
    { s: 'Bonġu!', x: 290, y: 880, at: 1.0, tail: 'bl', rot: -0.05, fill: P.cream },
    { s: 'Jekk jogħġbok…', x: 640, y: 1035, at: 1.5, tail: 'br', rot: 0.04, fill: P.yellow },
    { s: 'Grazzi!', x: 340, y: 1190, at: 2.0, tail: 'bl', rot: -0.03, fill: P.pink },
  ];
  const DEST = [
    { x: 170, y: 1060, kind: 'poster', at: 4.8 },
    { x: 355, y: 1140, kind: 'music', at: 4.9 },
    { x: 540, y: 1170, kind: 'code', at: 5.0 },
    { x: 725, y: 1140, kind: 'video', at: 5.1 },
    { x: 910, y: 1060, kind: 'lang', at: 5.2 },
  ];

  function icon(ctx, d, s) {
    ctx.save();
    ctx.translate(d.x, d.y);
    ctx.scale(s, s);
    inked(ctx, () => rr(ctx, -62, -62, 124, 124, 28), P.cream, { sh: 8, lw: 7 });
    ctx.strokeStyle = P.ink; ctx.fillStyle = P.ink; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (d.kind === 'poster') {
      rr(ctx, -34, -42, 68, 84, 6); ctx.stroke();
      ctx.fillStyle = P.red; ctx.beginPath(); ctx.moveTo(-24, 28); ctx.lineTo(-4, -2); ctx.lineTo(10, 14); ctx.lineTo(24, -6); ctx.lineTo(24, 28); ctx.closePath(); ctx.fill();
      ctx.fillStyle = P.ochre; ctx.beginPath(); ctx.arc(12, -24, 9, 0, TAU); ctx.fill();
    } else if (d.kind === 'music') {
      ctx.beginPath(); ctx.moveTo(-12, 30); ctx.lineTo(-12, -34); ctx.lineTo(26, -44); ctx.lineTo(26, 20); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(-22, 30, 13, 10, -0.4, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.ellipse(16, 20, 13, 10, -0.4, 0, TAU); ctx.fill();
    } else if (d.kind === 'code') {
      text(ctx, '</>', 0, 16, { f: 'JB', w: 800, s: 46, color: P.ink, align: 'center' });
    } else if (d.kind === 'video') {
      ctx.fillStyle = P.red; ctx.beginPath(); ctx.moveTo(-16, -26); ctx.lineTo(28, 0); ctx.lineTo(-16, 26); ctx.closePath(); ctx.fill();
    } else {
      text(ctx, 'MT', 0, -6, { f: 'JB', w: 800, s: 30, color: P.ink, align: 'center' });
      text(ctx, '→EN', 0, 30, { f: 'JB', w: 800, s: 26, color: P.terra, align: 'center' });
    }
    ctx.restore();
  }

  addScene({
    name: 'p1',
    t0: TL.S.p1[0],
    t1: TL.S.p1[1],
    push: 0.02,
    draw(ctx, lt) {
      ctx.fillStyle = P.ink;
      ctx.fillRect(0, 0, W, H);
      lace(ctx, W / 2, 1040, 560, { t: lt, alpha: 0.1, col: P.ochre });
      band(ctx, 'rosette', [P.ink, P.ochre, P.cream, P.red], 180, 1600, -lt * 30, 2);

      proverb(ctx, [{ s: 'Bil-kliem', at: 1.0 }, { s: 'u s-sliem', at: 1.5 }, { s: 'tasal', at: 2.0 }, { s: 'kullimkien.', at: 2.5 }], lt, { y: 350, s: 100 });

      GREET.forEach((g, i) => {
        const p = spring(lt - g.at, 3.2, 0.45);
        const suck = Ease.inCubic(prog(lt, 2.5 + i * 0.06, 2.85 + i * 0.06));
        if (p < 0.001 || suck >= 1) return;
        const s = 60, bw = M.textWidth(ctx, g.s, 'A', 800, s, 90) + 84, bh = 118;
        const x = lerp(g.x, 540, suck), y = lerp(g.y + Math.sin(lt * 2.2 + i * 1.7) * 7, BOX.y + BOX.h / 2, suck);
        const k = p * (1 - 0.8 * suck);
        ctx.save();
        ctx.globalAlpha = 1 - suck * suck;
        ctx.translate(x, y); ctx.rotate(g.rot * (1 - suck)); ctx.scale(k, k);
        K.bubble(ctx, -bw / 2, -bh / 2, bw, bh, { fill: g.fill, tail: g.tail, sh: 12, shadow: P.terraD });
        text(ctx, g.s, 0, 22, { f: 'A', w: 800, s, wd: 90, color: P.ink, align: 'center' });
        ctx.restore();
      });

      // prompt box
      const bp = Ease.snap(prog(lt, 2.7, 3.0));
      if (bp > 0) {
        const send = lt >= 4.0 ? Math.exp(-(lt - 4.0) * 6) : 0;
        ctx.save();
        ctx.globalAlpha = bp;
        ctx.translate(0, (1 - bp) * 40);
        inked(ctx, () => rr(ctx, BOX.x, BOX.y, BOX.w, BOX.h, 52), P.cream, { sh: 10, lw: 7 });
        const shown = Array.from(PROMPT).slice(0, Math.floor(clamp((lt - 3.25) / 0.72) * PROMPT.length)).join('');
        const s = 44;
        text(ctx, shown, BOX.x + 40, BOX.y + 67, { f: 'A', w: 700, s, wd: 88, color: P.ink });
        if (shown.length < PROMPT.length && Math.floor(lt * 4) % 2 === 0) {
          const cw = M.textWidth(ctx, shown, 'A', 700, s, 88);
          ctx.fillStyle = P.terra; ctx.fillRect(BOX.x + 44 + cw, BOX.y + 28, 6, 50);
        }
        // send button
        const bx = BOX.x + BOX.w - 56, by = BOX.y + BOX.h / 2;
        ctx.beginPath(); ctx.arc(bx, by, 36 * (1 + 0.25 * send), 0, TAU); ctx.fillStyle = lt >= 4.0 ? P.red : P.ink; ctx.fill();
        ctx.strokeStyle = P.cream; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.beginPath(); ctx.moveTo(bx, by + 16); ctx.lineTo(bx, by - 16); ctx.moveTo(bx - 13, by - 3); ctx.lineTo(bx, by - 16); ctx.lineTo(bx + 13, by - 3); ctx.stroke();
        ctx.restore();
      }
      // words fly out to everything
      for (const d of DEST) {
        const u = prog(lt, 4.0, d.at);
        if (u > 0) {
          const sx = 540, sy = BOX.y + BOX.h;
          const cx = lerp(sx, d.x, 0.5), cy = sy + 60;
          const e = Ease.inOutCubic(u);
          ctx.save();
          const grd = ctx.createLinearGradient(sx, sy, d.x, d.y);
          grd.addColorStop(0, rgba(P.yellow, 0.9)); grd.addColorStop(1, rgba(P.ochre, 0.9));
          ctx.strokeStyle = grd; ctx.lineWidth = 6; ctx.lineCap = 'round';
          ctx.beginPath();
          for (let k = 0; k <= 30; k++) {
            const v = (k / 30) * e;
            const x = (1 - v) * (1 - v) * sx + 2 * (1 - v) * v * cx + v * v * d.x;
            const y = (1 - v) * (1 - v) * sy + 2 * (1 - v) * v * cy + v * v * d.y;
            k ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
          }
          ctx.stroke();
          if (u < 1) {
            const v = e;
            M.glowDot(ctx, (1 - v) * (1 - v) * sx + 2 * (1 - v) * v * cx + v * v * d.x, (1 - v) * (1 - v) * sy + 2 * (1 - v) * v * cy + v * v * d.y, 50, P.yellow, 1);
          }
          ctx.restore();
        }
        const p = spring(lt - d.at, 3.4, 0.4);
        if (p > 0.001) icon(ctx, d, p);
      }

      kicker(ctx, XL, 1285, lt, 3.0);
      lineFit(ctx, 'Illum, bil-kliem', XL, 1365, lt, 4.25, XW, { s: 64, out: 5.4 });
      lineFit(ctx, 'tikkmanda l-magni.', XL, 1437, lt, 4.75, XW, { s: 64, color: P.yellow, out: 5.4 });
      lineFit(ctx, 'U l-Malti?', XL, 1365, lt, 5.5, XW, { s: 64 });
      lineFit(ctx, 'Kliem ukoll.', XL, 1437, lt, 5.75, XW, { s: 64, color: P.yellow });

      // finale slam: KELLIMHA BIL-MALTI. over a flag wipe
      const k = lt - 6.25;
      if (k > 0) {
        const wp = Ease.outExpo(clamp(k / 0.3));
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(W / 2 - (W / 2) * wp, 0, (W / 2) * wp, H);
        ctx.fillStyle = P.red;
        ctx.fillRect(W / 2, 0, (W / 2) * wp, H);
        const gp = spring(k - 0.1, 2.6, 0.4);
        if (gp > 0.001) { ctx.save(); ctx.translate(170, 480); ctx.scale(gp, gp); L.georgeCross(ctx, 0, 0, 150); ctx.restore(); }
        const s1 = fitSize(ctx, 'KELLIMHA', XW, 'A', 900, 100);
        const s2 = fitSize(ctx, 'BIL-MALTI.', XW, 'A', 900, 88);
        const sp = Ease.snap(clamp(k / 0.3));
        const drawTxt = (col1, col2) => {
          text(ctx, 'KELLIMHA', XL, 1000 + (1 - sp) * 120, { f: 'A', w: 900, s: s1, wd: 100, color: col1 });
          text(ctx, 'BIL-MALTI.', XL, 1000 + s2 * 0.86 + 20 + (1 - sp) * 160, { f: 'A', w: 900, s: s2, wd: 88, color: col2 });
        };
        ctx.save(); ctx.beginPath(); ctx.rect(W / 2 - (W / 2) * wp, 0, (W / 2) * wp, H); ctx.clip(); drawTxt(P.ink, P.red); ctx.restore();
        ctx.save(); ctx.beginPath(); ctx.rect(W / 2, 0, (W / 2) * wp, H); ctx.clip(); drawTxt('#FFFFFF', P.ink); ctx.restore();
      }
    },
    mb(lt) {
      if (lt > 3.95 && lt < 5.3) return 5;
      if (lt > 6.2 && lt < 6.6) return 8;
      return 3;
    },
  });
})();

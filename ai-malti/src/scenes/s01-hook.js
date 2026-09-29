// S01 — HOOK (0–4s): "DAN IL-FILMAT / GĦAMILTU / JIEN. / L-AI. — KULL PIXEL. KULL NOTA. KULL KELMA. BIL-MALTI."
(function () {
  const { W, H, C, clamp, lerp, prog, Ease, rgba, mix, noise1, rnd, fitSize, layout, drawGlyphs, shake, spring, buf } = M;
  const XL = 72, XW = W - 144;

  function wordFit(ctx, str, wd, w = 900, target = XW) {
    return fitSize(ctx, str, target, 'A', w, wd);
  }

  // viewfinder corner brackets
  function corners(ctx, lt, col) {
    const a = 0.55, len = 46, x0 = 44, y0 = 300, x1 = W - 44, y1 = 1560;
    ctx.save();
    ctx.strokeStyle = rgba(col, a);
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x0, y0 + len); ctx.lineTo(x0, y0); ctx.lineTo(x0 + len, y0);
    ctx.moveTo(x1 - len, y0); ctx.lineTo(x1, y0); ctx.lineTo(x1, y0 + len);
    ctx.moveTo(x0, y1 - len); ctx.lineTo(x0, y1); ctx.lineTo(x0 + len, y1);
    ctx.moveTo(x1 - len, y1); ctx.lineTo(x1, y1); ctx.lineTo(x1, y1 - len);
    ctx.stroke();
    ctx.restore();
  }

  // Beat 0 — DAN / IL-FILMAT (frame 0 = thumbnail, fully legible)
  function beat0(ctx, lt) {
    const s1 = wordFit(ctx, 'DAN', 125);
    const s2 = wordFit(ctx, 'IL-FILMAT', 64);
    const cap1 = s1 * 0.72, cap2 = s2 * 0.72, gap = 34;
    const top = 960 - (cap1 + gap + cap2) / 2;
    const k = Ease.outExpo(prog(lt, 0, 0.4));
    const sc = lerp(1.045, 1, k);
    ctx.save();
    ctx.translate(W / 2, 960);
    ctx.scale(sc, sc);
    ctx.translate(-W / 2, -960);
    drawGlyphs(ctx, 'DAN', XL, top + cap1, { f: 'A', w: 900, s: s1, wd: 125, color: C.paper }, (i) => ({ dx: (1 - k) * (i - 1) * 14 }));
    drawGlyphs(ctx, 'IL-FILMAT', XL, top + cap1 + gap + cap2, { f: 'A', w: 900, s: s2, wd: 64, color: C.paper }, (i) => ({ dx: (1 - k) * (i - 4) * 6 }));
    // red rule drawing on
    const rp = Ease.outQuart(prog(lt, 0.04, 0.34));
    ctx.fillStyle = C.red;
    ctx.fillRect(XL, top + cap1 + gap + cap2 + 34, XW * rp, 14);
    ctx.restore();
    // small mono slug
    M.text(ctx, '▶ REC  001', XL, top - 40, { f: 'JB', w: 600, s: 26, color: C.red, track: 3, alpha: 0.9 });
  }

  // Beat 1 — GĦAMILTU with a variable-width spring open
  function beat1(ctx, lt) {
    const p = Ease.snap(prog(lt, 0, 0.32));
    const wd = lerp(62, 125, p);
    const s = wordFit(ctx, 'GĦAMILTU', 125);
    const sy = 1 + 0.28 * (1 - Ease.outCubic(prog(lt, 0, 0.3)));
    ctx.save();
    ctx.translate(W / 2, 1010);
    ctx.scale(1, sy);
    drawGlyphs(ctx, 'GĦAMILTU', 0, 0 + s * 0.36, { f: 'A', w: 900, s, wd, color: C.paper, align: 'center' });
    ctx.restore();
    // accent: speed lines
    ctx.fillStyle = rgba(C.paper, 0.14 * (1 - p));
    for (let i = 0; i < 9; i++) ctx.fillRect(0, 760 + i * 58, W, 4);
  }

  // Beat 2 — JIEN. (letters drop, red full stop)
  function beat2(ctx, lt) {
    const s = wordFit(ctx, 'JIEN.', 100);
    const base = 960 + s * 0.36;
    drawGlyphs(ctx, 'JIEN.', XL, base, { f: 'A', w: 900, s, wd: 100, color: C.paper }, (i, g, n) => {
      if (i === n - 1) {
        const sp = spring(lt - 0.14, 3.6, 0.35);
        return { sx: sp, sy: sp, color: C.ink };
      }
      const p = clamp((lt - i * 0.035) / 0.26);
      const e = Ease.outBack(p, 2.1);
      return { dy: (1 - e) * -700, alpha: p > 0 ? 1 : 0 };
    });
  }

  // Beat 3 — L-AI. (glitch entrance) + (iva, veru)
  function beat3(ctx, lt) {
    const s = wordFit(ctx, 'L-AI.', 112);
    const base = 900 + s * 0.36;
    const g = lt < 0.16 ? 1 - lt / 0.16 : 0;
    if (g > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      M.text(ctx, 'L-AI.', XL - 26 * g, base, { f: 'A', w: 900, s, wd: 112, color: '#FF0040' });
      M.text(ctx, 'L-AI.', XL + 26 * g, base, { f: 'A', w: 900, s, wd: 112, color: '#00E5FF' });
      ctx.restore();
      // slice displacement
      for (let k = 0; k < 7; k++) {
        const y0 = base - s * 0.8 + rnd(k, Math.floor(lt * 60)) * s;
        const hh = 10 + rnd(k + 9, Math.floor(lt * 60)) * 60;
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, y0, W, hh);
        ctx.clip();
        M.text(ctx, 'L-AI.', XL + (rnd(k + 3, Math.floor(lt * 60)) - 0.5) * 160 * g, base, { f: 'A', w: 900, s, wd: 112, color: C.yellow });
        ctx.restore();
      }
    } else {
      drawGlyphs(ctx, 'L-AI.', XL, base, { f: 'A', w: 900, s, wd: 112, color: C.yellow }, (i, gg, n) => (i === n - 1 ? { color: C.red } : null));
    }
    // (iva, veru)
    const p = Ease.snap(prog(lt, 0.12, 0.4));
    if (p > 0) M.text(ctx, '(iva, veru)', XL + 6, base + 140 - 30 * (1 - p), { f: 'IS', s: 96, color: C.paper, alpha: p * 0.92 });
  }

  // Beats 4–7 — KULL + slot word
  const SLOT = ['PIXEL.', 'NOTA.', 'KELMA.'];
  function kull(ctx, lt, t) {
    const beat = Math.floor(lt / 0.5); // 0..3
    const bt = lt - beat * 0.5;
    const flag = beat === 3;
    // flag background wipe
    if (flag) {
      const wp = Ease.outExpo(prog(bt, 0, 0.22));
      ctx.fillStyle = C.paper;
      ctx.fillRect(W / 2 - (W / 2) * wp, 0, (W / 2) * wp, H);
      ctx.fillStyle = C.red;
      ctx.fillRect(W / 2, 0, (W / 2) * wp, H);
      const gp = spring(bt - 0.08, 2.6, 0.4);
      if (gp > 0) {
        ctx.save();
        ctx.translate(170, 470);
        ctx.scale(gp, gp);
        L.georgeCross(ctx, 0, 0, 150);
        ctx.restore();
      }
    }
    // KULL (outlined), exits upward on the flag beat
    const kS = wordFit(ctx, 'KULL', 62, 900, 560);
    const kOut = flag ? Ease.inQuart(prog(bt, 0, 0.16)) : 0;
    const punch = 1 + 0.05 * Math.exp(-bt * 14);
    if (kOut < 1) {
      ctx.save();
      ctx.translate(XL, 800 - kOut * 900);
      ctx.scale(punch, punch);
      drawGlyphs(ctx, 'KULL', 0, 0, { f: 'A', w: 900, s: kS, wd: 62, color: C.paper }, (i) => ({
        stroke: 5, strokeColor: C.paper, fill: false, dy: -Math.exp(-lt * 9) * 200 * (1 - clamp(lt * 4)) * (i + 1) * 0.3,
      }));
      ctx.restore();
      // tiny index counter
      M.text(ctx, `0${beat + 1}/04`, W - XL, 800 - kS * 0.62 - kOut * 900, { f: 'JB', w: 600, s: 30, color: C.red, align: 'right', track: 2 });
    }
    const base = 1190;
    if (!flag) {
      const word = SLOT[beat];
      const s = wordFit(ctx, word, 100);
      // slot push: old word up, new from below (mask)
      const inP = Ease.snap(prog(bt, 0, 0.16));
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, base - s * 0.76, W, s * 0.8);
      ctx.clip();
      if (beat > 0 && inP < 1) {
        const prev = SLOT[beat - 1];
        const ps = wordFit(ctx, prev, 100);
        M.text(ctx, prev, XL, base - inP * ps * 0.85, { f: 'A', w: 900, s: ps, color: C.paper });
      }
      const dy = (1 - inP) * s * 0.85;
      if (beat === 0) pixelWord(ctx, word, XL, base + dy, s, bt);
      else if (beat === 1) waveWord(ctx, word, XL, base + dy, s, bt);
      else typeWord(ctx, word, XL, base + dy, s, bt);
      ctx.restore();
      if (beat === 1) scope(ctx, bt);
      const note = ['1080×1920 px · 30 fps', '120 BPM · Re minuri', '100% bil-Malti'][beat];
      const np = Ease.snap(prog(bt, 0.1, 0.3));
      M.text(ctx, note, W - XL, base + 64, { f: 'JB', w: 500, s: 28, color: C.paper, align: 'right', alpha: np * 0.7, track: 1 });
    } else {
      // BIL-MALTI. — split colours across the flag halves
      const s = wordFit(ctx, 'BIL-MALTI.', 88);
      const wp = Ease.outExpo(prog(bt, 0, 0.22));
      const y = base - 60;
      const sp = Ease.snap(prog(bt, 0, 0.25));
      const drawIt = (col) => drawGlyphs(ctx, 'BIL-MALTI.', XL, y + (1 - sp) * 120, { f: 'A', w: 900, s, wd: 88, color: col }, (i) => ({ alpha: clamp((bt - i * 0.012) / 0.08) }));
      drawIt(C.paper);
      ctx.save();
      ctx.beginPath();
      ctx.rect(W / 2 - (W / 2) * wp, 0, (W / 2) * wp, H);
      ctx.clip();
      drawIt(C.red);
      ctx.restore();
      ctx.save();
      ctx.beginPath();
      ctx.rect(W / 2, 0, (W / 2) * wp, H);
      ctx.clip();
      drawIt('#FFFFFF');
      ctx.restore();
    }
  }

  // "PIXEL." resolving from chunky blocks
  const STEPS = [72, 56, 40, 30, 22, 16, 12, 9, 6, 4, 3, 2, 1];
  function pixelWord(ctx, word, x, y, s, bt) {
    const idx = Math.min(STEPS.length - 1, Math.floor(prog(bt, 0.02, 0.36) * STEPS.length));
    const px = STEPS[idx];
    if (px <= 1) return M.text(ctx, word, x, y, { f: 'A', w: 900, s, color: C.paper });
    const b = buf('pix', Math.ceil(W / px), Math.ceil(H / px));
    M.text(b.x, word, x / px, y / px, { f: 'A', w: 900, s: s / px, color: C.paper });
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(b.c, 0, 0, b.c.width * px, b.c.height * px);
    ctx.restore();
    // grid lines between blocks
    if (px >= 9) {
      ctx.strokeStyle = rgba(C.ink, 0.55);
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let gx = 0; gx < W; gx += px) { ctx.moveTo(gx, y - s); ctx.lineTo(gx, y + 20); }
      for (let gy = Math.floor((y - s) / px) * px; gy < y + 20; gy += px) { ctx.moveTo(0, gy); ctx.lineTo(W, gy); }
      ctx.stroke();
    }
  }
  // "NOTA." riding a wave
  function waveWord(ctx, word, x, y, s, bt) {
    const amp = 46 * Math.exp(-bt * 3.2);
    drawGlyphs(ctx, word, x, y, { f: 'A', w: 900, s, color: C.green }, (i) => ({ dy: Math.sin(bt * 22 - i * 1.2) * amp }));
  }
  function scope(ctx, bt) {
    const y0 = 1330, amp = 70 * Math.exp(-bt * 2.5) + 6;
    ctx.save();
    ctx.lineCap = 'round';
    for (const [lw, a] of [[16, 0.18], [5, 1]]) {
      ctx.beginPath();
      for (let x = XL; x <= W - XL; x += 6) {
        const u = (x - XL) / XW;
        const env = Math.sin(u * Math.PI);
        const v = Math.sin(u * 38 - bt * 30) * 0.6 + Math.sin(u * 91 + bt * 17) * 0.3 + Math.sin(u * 13 - bt * 9) * 0.4;
        const yy = y0 + v * amp * env;
        x === XL ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy);
      }
      ctx.strokeStyle = rgba(C.green, a);
      ctx.lineWidth = lw;
      ctx.stroke();
    }
    ctx.restore();
  }
  // "KELMA." typed with a block cursor
  function typeWord(ctx, word, x, y, s, bt) {
    const n = Array.from(word).length;
    const vis = clamp(Math.floor(bt / 0.045) + 1, 0, n);
    const Lw = drawGlyphs(ctx, word, x, y, { f: 'A', w: 900, s, color: C.paper }, (i) => (i >= vis ? { skip: true } : i === vis - 1 ? { color: C.yellow } : null));
    const g = Lw.glyphs[Math.min(vis, n) - 1];
    const cx = x + g.x + g.w + 10;
    if (Math.floor(bt * 8) % 2 === 0 || vis < n) {
      ctx.fillStyle = C.red;
      ctx.fillRect(cx, y - s * 0.74, s * 0.16, s * 0.74);
    }
  }

  addScene({
    name: 'hook',
    t0: TL.S.hook[0],
    t1: TL.S.hook[1],
    draw(ctx, lt, t) {
      ctx.fillStyle = C.ink;
      ctx.fillRect(0, 0, W, H);
      L.bgDots(ctx, t, { alpha: 0.075 });
      const sh = shake(lt, [[0.5, 0.8], [1.0, 1.4], [1.5, 1.1], [2, 0.5], [2.5, 0.5], [3, 0.5], [3.5, 1.2]], 18, 11);
      ctx.translate(W / 2 + sh.dx, H / 2 + sh.dy);
      ctx.rotate(sh.r);
      ctx.translate(-W / 2, -H / 2);
      if (lt >= 0.5 && lt < 1.5) {
        ctx.fillStyle = lt < 1.0 ? C.blue : C.red;
        ctx.fillRect(-200, -200, W + 400, H + 400);
        L.bgDots(ctx, t, { alpha: 0.12, color: C.paper });
      }
      corners(ctx, lt, lt >= 3.5 ? C.ink : C.paper);
      if (lt < 0.5) beat0(ctx, lt);
      else if (lt < 1.0) beat1(ctx, lt - 0.5);
      else if (lt < 1.5) beat2(ctx, lt - 1.0);
      else if (lt < 2.0) beat3(ctx, lt - 1.5);
      else kull(ctx, lt - 2.0, t);
    },
    fx(fx, lt) {
      if (lt >= 1.5 && lt < 1.64) fx.glitch = Math.max(fx.glitch, 1);
      
      fx.vig = 0.45;
    },
    mb(lt) {
      // heavier blur on the snappy entrances
      const b = lt % 0.5;
      return b < 0.2 ? 8 : 3;
    },
  });
})();

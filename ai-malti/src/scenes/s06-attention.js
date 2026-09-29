// S06 — ATTENTION (24–32s) on luzzu blue: the luzzu eye opens → "IMBAGĦAD: ATTENZJONI." →
//        "bank" attends to the other words: money-bank vs garden-bench → "IL-KUNTEST JIBDEL KOLLOX." → dive into the pupil
(function (G) {
  const { W, H, C, TAU, clamp, lerp, prog, Ease, rgba, mix, noise1, rnd, rndr, fitSize, layout, drawGlyphs, shake, spring, text, kf } = M;
  const XL = 72, XW = W - 144;

  const SA = { segs: [['Poġġejt ', 0.14], ['il-', 0.04], ['flus', 0.62], [' fil-', 0.12], ['bank', -1], ['.', 0]], t0: 2.0, arcs: [2.2, 2.35, 2.5, 2.65], label: 'tal-flus', icon: 'bank' };
  const SB = { segs: [['Qgħadt ', 0.31], ['fuq ', 0.17], ['il-', 0.03], ['bank', -1], [' fil-', 0.07], ['ġnien', 0.36], ['.', 0]], t0: 4.0, arcs: [4.2, 4.35, 4.5, 4.65], label: 'tal-ġnien', icon: 'bench' };
  const SY = 1010; // sentence baseline

  function sentenceGeom(ctx, S) {
    const full = S.segs.map((s) => s[0]).join('');
    const s = fitSize(ctx, full, XW, 'A', 800, 84);
    const Lf = layout(ctx, full, 'A', 800, s, 84);
    let ci = 0;
    const segs = S.segs.map(([str, w]) => {
      const n = Array.from(str).length;
      const g0 = Lf.glyphs[ci], g1 = Lf.glyphs[ci + n - 1];
      // anchor on the visible (non-space) part
      let a = ci, b = ci + n - 1;
      while (a <= b && Lf.glyphs[a].c === ' ') a++;
      while (b >= a && Lf.glyphs[b].c === ' ') b--;
      const x0 = Lf.glyphs[a] ? Lf.glyphs[a].x : g0.x, x1 = Lf.glyphs[b] ? Lf.glyphs[b].x + Lf.glyphs[b].w : g1.x + g1.w;
      ci += n;
      return { str, w, x0, x1, cx: (x0 + x1) / 2 };
    });
    return { full, s, width: Lf.width, segs };
  }

  function bankIcon(ctx, x, y, S, col) {
    ctx.fillStyle = col;
    // pediment
    ctx.beginPath();
    ctx.moveTo(x - S, y - S * 0.45);
    ctx.lineTo(x, y - S * 0.95);
    ctx.lineTo(x + S, y - S * 0.45);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(x - S * 0.95, y - S * 0.42, S * 1.9, S * 0.12);
    for (let i = 0; i < 4; i++) ctx.fillRect(x - S * 0.78 + i * S * 0.46, y - S * 0.25, S * 0.2, S * 0.78);
    ctx.fillRect(x - S, y + S * 0.56, S * 2, S * 0.14);
    ctx.fillRect(x - S * 1.1, y + S * 0.72, S * 2.2, S * 0.12);
    // euro coin
    ctx.fillStyle = C.yellow;
    M.circle(ctx, x, y - S * 0.62, S * 0.16);
    ctx.fill();
  }
  function benchIcon(ctx, x, y, S, col) {
    ctx.fillStyle = col;
    const r = (x0, y0, w, h) => { M.rrect(ctx, x0, y0, w, h, Math.min(w, h) * 0.3); ctx.fill(); };
    r(x - S * 1.1, y - S * 0.62, S * 2.2, S * 0.16); // backrest top plank
    r(x - S * 1.1, y - S * 0.36, S * 2.2, S * 0.16);
    r(x - S * 1.2, y + S * 0.02, S * 2.4, S * 0.2); // seat
    r(x - S * 0.95, y - S * 0.62, S * 0.12, S * 1.3); // posts
    r(x + S * 0.83, y - S * 0.62, S * 0.12, S * 1.3);
    r(x - S * 1.0, y + S * 0.2, S * 0.14, S * 0.55); // legs
    r(x + S * 0.86, y + S * 0.2, S * 0.14, S * 0.55);
    // little tree
    ctx.fillStyle = C.green;
    M.circle(ctx, x + S * 1.55, y - S * 0.45, S * 0.42);
    ctx.fill();
    ctx.fillStyle = col;
    ctx.fillRect(x + S * 1.5, y - S * 0.1, S * 0.1, S * 0.85);
  }

  function drawSentence(ctx, lt, S, geo, shiftX, alpha) {
    const x0 = W / 2 - geo.width / 2 + shiftX;
    const ent = lt - S.t0;
    const focus = geo.segs.find((s) => s.w === -1);
    // arcs
    const arcs = geo.segs.filter((s) => s.w > 0).sort((a, b) => a.x0 - b.x0);
    ctx.save();
    ctx.globalAlpha = alpha;
    arcs.forEach((sg, k) => {
      const at = S.arcs[Math.min(k, S.arcs.length - 1)] + (k >= S.arcs.length ? 0.1 : 0);
      const p = Ease.outCubic(prog(lt, at, at + 0.35));
      if (p <= 0) return;
      const ax = x0 + focus.cx, ay = SY - geo.s * 0.82;
      const bx = x0 + sg.cx, by = SY - geo.s * 0.82;
      const hgt = 90 + Math.abs(ax - bx) * 0.55;
      const cx = (ax + bx) / 2, cy = Math.min(ay, by) - hgt;
      // partial quadratic (de Casteljau) from bank → word
      const qx = (u) => (1 - u) * (1 - u) * ax + 2 * (1 - u) * u * cx + u * u * bx;
      const qy = (u) => (1 - u) * (1 - u) * ay + 2 * (1 - u) * u * cy + u * u * by;
      ctx.lineCap = 'round';
      const lw = 3 + 30 * sg.w;
      ctx.strokeStyle = rgba(C.yellow, 0.3 + 0.7 * sg.w + 0.15);
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      for (let u = 0; u <= p + 1e-6; u += 0.02) ctx.lineTo(qx(u), qy(u));
      ctx.stroke();
      // travelling pulses (word → bank)
      if (p >= 1) {
        for (let j = 0; j < 3; j++) {
          const u = 1 - (((lt - at) * (0.9 + sg.w) + j / 3) % 1);
          M.circle(ctx, qx(u), qy(u), 5 + lw * 0.3);
          ctx.fillStyle = rgba(C.paper, 0.9);
          ctx.fill();
        }
      }
      // weight: heat bar + number under each attended word; the winner also gets a label on its arc
      if (p > 0.6) {
        const k2 = prog(p, 0.6, 1);
        const bw = (sg.x1 - sg.x0) * k2;
        ctx.fillStyle = rgba(C.yellow, 0.35 + 0.65 * sg.w * 1.4);
        ctx.fillRect(bx - bw / 2, SY + 24, bw, 6 + 16 * sg.w);
        text(ctx, sg.w.toFixed(2), bx, SY + 80 + 16 * sg.w, { f: 'JB', w: 700, s: 26, color: C.paper, align: 'center', alpha: k2 * (0.5 + sg.w) });
        if (sg.w > 0.3) text(ctx, sg.w.toFixed(2), qx(0.5), qy(0.5) - 22, { f: 'JB', w: 800, s: 34, color: C.yellow, align: 'center', alpha: k2 });
      }
    });
    // words
    const segs = geo.segs;
    let gi = 0;
    segs.forEach((sg, k) => {
      const p = Ease.snap(clamp((ent - k * 0.05) / 0.3));
      if (sg.w === -1) {
        const hp = Ease.snap(prog(lt, S.t0 + 0.12, S.t0 + 0.35));
        const pad = 12;
        ctx.fillStyle = C.yellow;
        M.rrect(ctx, x0 + sg.x0 - pad, SY - geo.s * 0.8 - 6, (sg.x1 - sg.x0 + pad * 2) * hp, geo.s * 0.98, 14);
        ctx.fill();
      }
      const col = sg.w === -1 ? C.ink : sg.w > 0.3 ? C.paper : rgba(C.paper, 0.72);
      text(ctx, sg.str, x0 + sg.x0 - (sg.str.startsWith(' ') ? M.textWidth(ctx, ' ', 'A', 800, geo.s, 84) : 0), SY + (1 - p) * 60, { f: 'A', w: 800, s: geo.s, wd: 84, color: col, alpha: p });
    });
    ctx.restore();
  }

  function iconCard(ctx, lt, S, alpha, flipFrom) {
    const t0 = S.t0 + 1.2;
    const sp = spring(lt - t0, 2.8, 0.45);
    if (sp <= 0.001) return;
    const cx = W / 2, cy = 1330;
    const cw = 470, ch = 300;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(cx, cy);
    ctx.scale(sp, sp);
    ctx.rotate((1 - clamp(sp)) * -0.15);
    ctx.fillStyle = rgba(C.ink, 0.25);
    M.rrect(ctx, -cw / 2 + 10, -ch / 2 + 14, cw, ch, 36);
    ctx.fill();
    ctx.fillStyle = C.paper;
    M.rrect(ctx, -cw / 2, -ch / 2, cw, ch, 36);
    ctx.fill();
    if (S.icon === 'bank') bankIcon(ctx, -110, -8, 70, C.blue);
    else benchIcon(ctx, -130, 0, 64, C.blue);
    text(ctx, 'bank', 30, -30, { f: 'A', w: 900, s: 64, wd: 84, color: C.ink });
    text(ctx, S.label, 30, 40, { f: 'IS', s: 58, color: C.red });
    ctx.restore();
  }

  addScene({
    name: 'attn',
    t0: TL.S.attn[0],
    t1: TL.S.attn[1],
    draw(ctx, lt, t) {
      ctx.fillStyle = C.blue;
      ctx.fillRect(0, 0, W, H);
      // wave pattern (luzzu hull stripes) at the bottom
      ctx.save();
      for (let k = 0; k < 4; k++) {
        ctx.strokeStyle = rgba(C.paper, 0.06 + k * 0.015);
        ctx.lineWidth = 5;
        ctx.beginPath();
        for (let x = 0; x <= W; x += 12) {
          const y = 1640 + k * 44 + Math.sin(x * 0.012 + lt * 1.6 + k) * 16;
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      ctx.restore();

      // entry: slide down from the whip
      const ent = 1 - Ease.outExpo(prog(lt, 0, 0.45));
      const dive = Ease.inExpo(prog(lt, 7.25, 7.98));
      ctx.save();
      ctx.translate(0, -ent * 700);

      // ── eye ──
      const eyePos = kf(lt, [[0, [540, 700, 250]], [1.85, [540, 700, 250]], [2.2, [540, 470, 120], Ease.swift], [5.9, [540, 470, 120]], [6.25, [540, 560, 190], Ease.swift], [7.2, [540, 560, 200]]]);
      const draw = Ease.inOutCubic(prog(lt, 0.05, 0.7));
      const open = Ease.outBack(prog(lt, 0.45, 0.85), 2.2) * (1 - 0.95 * Math.max(0, Math.sin(prog(lt, 6.9, 7.05) * Math.PI)));
      // where the eye looks
      const lookX = kf(lt, [[0.8, 0], [1.2, -0.8, Ease.inOutCubic], [1.6, 0.8, Ease.inOutCubic], [2.0, 0, Ease.inOutCubic], [2.4, 0.3], [4.0, 0.3], [4.4, -0.05], [6.0, -0.05], [6.4, 0]]);
      const lookY = kf(lt, [[2.0, 0], [2.3, 0.9, Ease.inOutCubic], [5.8, 0.9], [6.2, 0, Ease.inOutCubic]]);
      // dive into the pupil: scale around the pupil centre
      if (dive > 0) {
        const z = Math.exp(Math.log(60) * dive);
        ctx.translate(eyePos[0], eyePos[1]);
        ctx.scale(z, z);
        ctx.translate(-eyePos[0], -eyePos[1]);
      }
      L.luzzuEye(ctx, eyePos[0], eyePos[1], eyePos[2], open, [lookX, lookY], { draw, lw: Math.max(6, eyePos[2] * 0.045), stroke: C.yellow, iris: C.red, pupil: C.ink });

      // ── title ──
      const tOut = Ease.inQuart(prog(lt, 1.85, 2.1));
      if (lt > 0.7 && tOut < 1) {
        ctx.save();
        ctx.globalAlpha = 1 - tOut;
        ctx.translate(0, -tOut * 120);
        const p1 = Ease.snap(prog(lt, 0.75, 1.0));
        text(ctx, 'IMBAGĦAD:', XL, 1110 + (1 - p1) * 40, { f: 'A', w: 900, s: 72, wd: 100, color: C.yellow, alpha: p1 });
        const sT = fitSize(ctx, 'ATTENZJONI.', XW, 'A', 900, 76);
        drawGlyphs(ctx, 'ATTENZJONI.', XL, 1110 + sT * 0.82, { f: 'A', w: 900, s: sT, wd: 76, color: C.paper }, (i) => {
          const p = Ease.snap(clamp((lt - 0.8 - i * 0.025) / 0.3));
          return { dy: (1 - p) * 80, alpha: p };
        });
        const p3 = Ease.snap(prog(lt, 1.5, 1.8));
        text(ctx, "Kull kelma tħares lejn l-oħrajn.", XL + 4, 1110 + sT * 0.82 + 110 + (1 - p3) * 30, { f: 'IS', s: 64, color: C.paper, alpha: p3 });
        ctx.restore();
      }

      // ── sentences ──
      const gA = sentenceGeom(ctx, SA), gB = sentenceGeom(ctx, SB);
      const swap = Ease.whip(prog(lt, 3.85, 4.1));
      const endS = Ease.inQuart(prog(lt, 5.85, 6.1));
      if (lt > SA.t0 && swap < 1) {
        drawSentence(ctx, lt, SA, gA, -swap * 1300, 1);
        iconCard(ctx, lt, SA, 1 - swap);
      }
      if (lt > SB.t0 - 0.2 && endS < 1) {
        drawSentence(ctx, lt, SB, gB, (1 - swap) * 1300, 1 - endS);
        if (lt > SB.t0) iconCard(ctx, lt, SB, 1 - endS);
      }
      // the bench card replaces the bank card with a flip
      // ── conclusion ──
      const k = lt - 6.0;
      if (k > 0) {
        const s1 = fitSize(ctx, 'IL-KUNTEST', XW, 'A', 900, 88);
        const s2 = fitSize(ctx, 'JIBDEL KOLLOX.', XW, 'A', 900, 70);
        const y1 = 1010;
        drawGlyphs(ctx, 'IL-KUNTEST', XL, y1, { f: 'A', w: 900, s: s1, wd: 88, color: C.yellow }, (i) => {
          const p = spring(k - i * 0.02, 3.2, 0.5);
          return { sy: p, alpha: clamp(p * 3) };
        });
        drawGlyphs(ctx, 'JIBDEL KOLLOX.', XL, y1 + s2 * 0.95, { f: 'A', w: 900, s: s2, wd: 70, color: C.paper }, (i, g, n) => {
          const p = spring(k - 0.15 - i * 0.015, 3.2, 0.5);
          return { sy: p, alpha: clamp(p * 3), color: i === n - 1 ? C.red : undefined };
        });
      }
      ctx.restore();
      if (dive > 0.85) {
        ctx.fillStyle = rgba(C.ink, prog(dive, 0.85, 1));
        ctx.fillRect(0, 0, W, H);
      }
    },
    fx(fx, lt) {
      fx.vig = 0.3;
      fx.bloom = 0.16;
      const dive = prog(lt, 7.25, 7.98);
      fx.warp = dive * 0.5;
      fx.ca += dive * 1.6;
    },
    mb(lt) {
      if (lt < 0.5) return 6;
      if (lt > 3.8 && lt < 4.2) return 8;
      if (lt > 7.2) return 8;
      return 3;
    },
  });
})(window);

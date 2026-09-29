// S05 — EMBEDDINGS (16–24s): 3D "map of meaning" with Maltese word clusters, orbiting camera + depth of field,
//        RE − RAĠEL + MARA ≈ REĠINA, then axes multiply into thousands of dimensions → whip-pan up
(function (G) {
  const { W, H, C, TAU, clamp, lerp, prog, Ease, rgba, mix, noise1, rnd, rndr, fitSize, layout, drawGlyphs, shake, spring, text, kf, makeCam } = M;
  const XL = 72, XW = W - 144;

  // ── world ──
  const P0 = [40, 170, 360], GV = [240, 0, 0], RV = [0, -230, 0];
  const add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
  const CL = [
    { name: 'ikel', col: C.yellow, c: [-420, -220, -120], words: ['pastizz', 'qassata', 'ftira', 'ħobż', 'imqarrun', 'stuffat', 'ġbejna'] },
    { name: 'postijiet', col: C.sky, c: [380, -300, -260], words: ['Valletta', 'l-Imdina', 'Għawdex', 'Marsaxlokk', 'is-Slima', 'il-Birgu'] },
    { name: 'annimali', col: C.green, c: [-330, 330, -330], words: ['qattus', 'kelb', 'għasfur', 'ħuta', 'żiemel'] },
    { name: 'emozzjonijiet', col: C.pink, c: [560, 330, -80], words: ['ferħ', 'imħabba', 'rabja', "biża'", 'tama'] },
  ];
  const pts = [];
  for (const cl of CL) {
    cl.words.forEach((w, i) => {
      const a = rnd(i, cl.name.length * 3) * TAU, b = rndr(i, cl.name.length * 5, -1, 1), r = rndr(i, cl.name.length * 7, 50, 150);
      const s = Math.sqrt(1 - b * b);
      pts.push({ w, col: cl.col, p: [cl.c[0] + Math.cos(a) * s * r, cl.c[1] + b * r, cl.c[2] + Math.sin(a) * s * r], cl: cl.name });
    });
  }
  // fenek lives between food and animals
  const fenekP = [(CL[0].c[0] + CL[2].c[0]) / 2 - 30, (CL[0].c[1] + CL[2].c[1]) / 2, (CL[0].c[2] + CL[2].c[2]) / 2];
  pts.push({ w: 'fenek', col: C.paper, p: fenekP, cl: 'both' });
  // royalty parallelogram (with a touch of jitter so it's "≈")
  const RAGEL = P0, RE = add(P0, RV), MARA = add(P0, GV), REGINA = add(add(P0, GV), RV, 1.0);
  REGINA[0] += 14; REGINA[1] += 10; REGINA[2] -= 12;
  const ROY = [
    { w: 'raġel', p: RAGEL }, { w: 're', p: RE }, { w: 'mara', p: MARA }, { w: 'reġina', p: REGINA },
  ];
  ROY.forEach((r) => pts.push({ ...r, col: C.paper, cl: 'roy' }));
  // background dust
  const dust = [];
  for (let i = 0; i < 520; i++) {
    const a = rnd(i, 41) * TAU, b = rndr(i, 42, -1, 1), r = 1100 * Math.cbrt(rnd(i, 43));
    const s = Math.sqrt(1 - b * b);
    dust.push([Math.cos(a) * s * r, b * r * 0.8, Math.sin(a) * s * r]);
  }
  // extra axes for "thousands of dimensions"
  const AX = [];
  for (let i = 0; i < 90; i++) {
    const a = rnd(i, 51) * TAU, b = rndr(i, 52, -1, 1), s = Math.sqrt(1 - b * b);
    AX.push([Math.cos(a) * s, b, Math.sin(a) * s]);
  }

  function camAt(lt) {
    const tgt = kf(lt, [[0, [0, 0, 0]], [4.0, [0, 0, 0]], [4.7, [230, 55, 360], Ease.inOutCubic], [6.4, [230, 55, 360]], [7.0, [0, 0, 0], Ease.inOutCubic]]);
    const dist = kf(lt, [[0, 3600], [1.1, 1550, Ease.outCubic], [4.0, 1380, Ease.inOutQuad], [4.7, 900, Ease.inOutCubic], [6.4, 850], [7.2, 2300, Ease.inOutCubic], [8, 2600]]);
    const yaw = kf(lt, [[0, -0.75], [1.1, -0.25, Ease.outCubic], [4.0, 0.45, Ease.inOutQuad], [4.7, 0.08, Ease.inOutCubic], [6.4, -0.04], [8, 0.5, Ease.inOutQuad]]);
    const pitch = kf(lt, [[0, 0.35], [1.1, 0.12, Ease.outCubic], [4.0, -0.05], [4.7, -0.02], [8, 0.25, Ease.inOutQuad]]);
    return { x: tgt[0], y: tgt[1], z: tgt[2], yaw, pitch, dist, fov: 1350, cy: 930 };
  }

  function arrow2(ctx, a, b, col, lw, head = 26, prog2 = 1) {
    const x1 = lerp(a.x, b.x, prog2), y1 = lerp(a.y, b.y, prog2);
    ctx.strokeStyle = col;
    ctx.lineWidth = lw;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    if (prog2 > 0.15) {
      const an = Math.atan2(y1 - a.y, x1 - a.x);
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(x1 + Math.cos(an) * 6, y1 + Math.sin(an) * 6);
      ctx.lineTo(x1 - Math.cos(an - 0.45) * head, y1 - Math.sin(an - 0.45) * head);
      ctx.lineTo(x1 - Math.cos(an + 0.45) * head, y1 - Math.sin(an + 0.45) * head);
      ctx.closePath();
      ctx.fill();
    }
  }

  addScene({
    name: 'embed',
    push: false,
    t0: TL.S.embed[0],
    t1: TL.S.embed[1],
    draw(ctx, lt, t) {
      // whip-pan out at the end: everything slides down, blue rises
      const whip = Ease.inExpo(prog(lt, 7.62, 8.0));
      ctx.fillStyle = C.navy;
      ctx.fillRect(0, 0, W, H);
      L.bgGlow(ctx, W / 2, 930, 1100, '#1B3A8A', 0.55);
      ctx.save();
      ctx.translate(0, whip * 2400);

      const cam = camAt(lt);
      const P = makeCam(cam);
      const focus = cam.dist;

      // dust
      for (let i = 0; i < dust.length; i++) {
        const q = P(dust[i][0], dust[i][1], dust[i][2]);
        if (q.z < 50) continue;
        const a = clamp(0.5 - Math.abs(q.z - focus) / 3000) * clamp((lt - rnd(i, 44) * 0.8) * 3);
        if (a <= 0.01) continue;
        const r = Math.max(1.2, 2.4 * q.s);
        ctx.fillStyle = rgba(C.sky, a * 0.9);
        ctx.fillRect(q.x - r / 2, q.y - r / 2, r, r);
      }

      // cluster halos
      const cp = prog(lt, 0.6, 1.6);
      for (const cl of CL) {
        const q = P(cl.c[0], cl.c[1], cl.c[2]);
        if (q.z < 50) continue;
        const g = ctx.createRadialGradient(q.x, q.y, 0, q.x, q.y, 260 * q.s);
        g.addColorStop(0, rgba(cl.col, 0.2 * cp));
        g.addColorStop(1, rgba(cl.col, 0));
        ctx.fillStyle = g;
        ctx.fillRect(q.x - 260 * q.s, q.y - 260 * q.s, 520 * q.s, 520 * q.s);
      }

      // constellation lines inside clusters
      const proj = pts.map((p) => ({ ...p, q: P(p.p[0], p.p[1], p.p[2]) }));
      ctx.lineWidth = 1.5;
      for (let i = 0; i < proj.length; i++) {
        for (let j = i + 1; j < proj.length; j++) {
          const a = proj[i], b = proj[j];
          if (a.cl !== b.cl || a.cl === 'roy') continue;
          if (a.q.z < 50 || b.q.z < 50) continue;
          const lp = prog(lt, 1.0 + rnd(i * 50 + j, 61) * 0.8, 1.6 + rnd(i * 50 + j, 61) * 0.8);
          if (lp <= 0) continue;
          ctx.strokeStyle = rgba(a.col, 0.28 * lp);
          ctx.beginPath();
          ctx.moveTo(a.q.x, a.q.y);
          ctx.lineTo(lerp(a.q.x, b.q.x, lp), lerp(a.q.y, b.q.y, lp));
          ctx.stroke();
        }
      }

      // points + labels, far → near
      proj.sort((a, b) => b.q.z - a.q.z);
      const royFocus = prog(lt, 4.0, 4.6) * (1 - prog(lt, 6.6, 7.1));
      for (let i = 0; i < proj.length; i++) {
        const p = proj[i];
        const q = p.q;
        if (q.z < 60) continue;
        const born = Ease.outBack(clamp((lt - 0.3 - rnd(i, 71) * 1.2) / 0.4));
        if (born <= 0) continue;
        const blur = clamp(Math.abs(q.z - focus) / 900);
        const isRoy = p.cl === 'roy';
        let a = lerp(1, 0.35, blur);
        if (royFocus > 0 && !isRoy) a *= 1 - 0.75 * royFocus;
        const r = (7 + blur * 10) * q.s * born * (isRoy ? 1.3 : 1);
        // glow
        const g = ctx.createRadialGradient(q.x, q.y, 0, q.x, q.y, r * 4);
        g.addColorStop(0, rgba(p.col, 0.55 * a));
        g.addColorStop(1, rgba(p.col, 0));
        ctx.fillStyle = g;
        ctx.fillRect(q.x - r * 4, q.y - r * 4, r * 8, r * 8);
        M.circle(ctx, q.x, q.y, r * (1 - blur * 0.4));
        ctx.fillStyle = rgba(p.col, a);
        ctx.fill();
        // label
        const fs = clamp(34 * q.s * (isRoy ? 1.25 : 1), 14, 72);
        const la = a * clamp((lt - 0.7 - rnd(i, 72) * 1.0) * 3) * (1 - blur * 0.5);
        if (la > 0.02) {
          text(ctx, isRoy ? p.w.toUpperCase() : p.w, q.x + r + 10, q.y + fs * 0.35, { f: 'A', w: 800, s: fs, wd: 92, color: p.col, alpha: la });
        }
      }

      // fenek joke
      const fj = Ease.snap(prog(lt, 2.6, 2.95)) * (1 - prog(lt, 3.8, 4.1));
      if (fj > 0) {
        const q = P(fenekP[0], fenekP[1], fenekP[2]);
        text(ctx, '(il-fenek? fit-tnejn.)', Math.max(44, q.x - 150), q.y + 96 + (1 - fj) * 20, { f: 'IS', s: 44, color: C.paper, alpha: fj });
      }

      // analogy arrows
      const qRa = P(...RAGEL), qRe = P(...RE), qMa = P(...MARA), qRg = P(...REGINA);
      const a1 = Ease.outCubic(prog(lt, 4.5, 5.0));
      const a2 = Ease.inOutCubic(prog(lt, 5.3, 5.8)); // copy of vector slides to MARA
      const a3 = Ease.outCubic(prog(lt, 5.8, 6.2));
      const aOut = 1 - prog(lt, 6.6, 7.0);
      if (a1 > 0 && aOut > 0) {
        ctx.globalAlpha = aOut;
        arrow2(ctx, qRa, qRe, C.red, 9, 30, a1);
        if (a2 > 0) {
          // ghost vector travelling from raġel→re to mara→reġina
          const s0 = { x: lerp(qRa.x, qMa.x, a2), y: lerp(qRa.y, qMa.y, a2) };
          const e0 = { x: lerp(qRe.x, qRg.x, a2), y: lerp(qRe.y, qRg.y, a2) };
          ctx.setLineDash([18, 14]);
          arrow2(ctx, s0, e0, rgba(C.yellow, 0.95), 7, 26, 1);
          ctx.setLineDash([]);
          // gender vector (mara − raġel)
          arrow2(ctx, qRa, qMa, rgba(C.paper, 0.45), 4, 18, clamp(a2 * 1.5));
        }
        if (a3 > 0) {
          const r = 40 + 60 * (1 - a3);
          ctx.strokeStyle = rgba(C.yellow, a3 * (1 - prog(lt, 6.2, 6.6) * 0.5));
          ctx.lineWidth = 5;
          M.circle(ctx, qRg.x, qRg.y, r);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }

      // axes → many dimensions
      const ax = prog(lt, 6.5, 7.6);
      if (ax > 0) {
        const o = P(0, 0, 0);
        const L0 = 900;
        const base3 = [[1, 0, 0, C.red], [0, -1, 0, C.green], [0, 0, 1, C.sky]];
        for (let i = 0; i < 3; i++) {
          const [x, y, z, col] = base3[i];
          const e = Ease.outCubic(clamp(ax * 4 - i * 0.3));
          const q = P(x * L0 * e, y * L0 * e, z * L0 * e);
          ctx.strokeStyle = col;
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(o.x, o.y);
          ctx.lineTo(q.x, q.y);
          ctx.stroke();
          if (e > 0.9) text(ctx, `d${i + 1}`, q.x + 8, q.y - 8, { f: 'JB', w: 700, s: 28, color: col });
        }
        const nAx = Math.floor(Ease.inQuad(clamp((ax - 0.25) / 0.75)) * AX.length);
        for (let i = 0; i < nAx; i++) {
          const d = AX[i];
          const e = Ease.outCubic(clamp((ax - 0.25 - (i / AX.length) * 0.6) * 5));
          const q = P(d[0] * L0 * e, d[1] * L0 * e, d[2] * L0 * e);
          ctx.strokeStyle = rgba(i % 4 === 0 ? C.yellow : C.paper, 0.35);
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(o.x, o.y);
          ctx.lineTo(q.x, q.y);
          ctx.stroke();
        }
      }
      ctx.restore();

      // ── typography layer ──
      const tOut = 1 - prog(lt, 3.8, 4.1);
      if (tOut > 0) {
        const p1 = Ease.snap(prog(lt, 0.0, 0.35));
        const sT = fitSize(ctx, 'MAPPA TAT-TIFSIRA', XW, 'A', 900, 72);
        ctx.save();
        ctx.globalAlpha = tOut;
        drawGlyphs(ctx, 'MAPPA TAT-TIFSIRA', XL, 420 + whip * 2400, { f: 'A', w: 900, s: sT, wd: 72, color: C.paper }, (i) => {
          const p = Ease.snap(clamp((lt - i * 0.02) / 0.35));
          return { dy: (1 - p) * -60, alpha: p };
        });
        const p2 = Ease.snap(prog(lt, 0.5, 0.85));
        text(ctx, 'Kull token isir punt.', XL + 4, 520 + (1 - p2) * 30, { f: 'IS', s: 72, color: C.sky, alpha: p2 });
        ctx.restore();
      }
      // caption: similar words live close
      const cA = Ease.snap(prog(lt, 2.0, 2.35)) * (1 - prog(lt, 3.8, 4.1));
      if (cA > 0) {
        text(ctx, 'Kelmiet simili', XL, 1400 + (1 - cA) * 40, { f: 'A', w: 900, s: 84, wd: 80, color: C.paper, alpha: cA });
        text(ctx, 'jgħixu qrib xulxin.', XL, 1480 + (1 - cA) * 50, { f: 'IS', s: 84, color: C.yellow, alpha: cA });
      }
      // equation
      const eq = lt - 4.0;
      if (eq > 0 && lt < 6.6) {
        const out = prog(lt, 6.3, 6.55);
        const parts = [
          ['RE', C.paper, 4.3], [' − ', C.red, 4.7], ['RAĠEL', C.paper, 4.75], [' + ', C.yellow, 5.3], ['MARA', C.paper, 5.35], [' ≈ ', C.yellow, 5.9], ['REĠINA', C.yellow, 5.95],
        ];
        const full = parts.map((p) => p[0]).join('');
        const s = fitSize(ctx, full, XW, 'A', 900, 70);
        let x = XL;
        for (const [str, col, at] of parts) {
          const p = Ease.snap(prog(lt, at, at + 0.25));
          const w = M.textWidth(ctx, str, 'A', 900, s, 70);
          if (p > 0) text(ctx, str, x, 1440 + (1 - p) * 50 - out * 40, { f: 'A', w: 900, s, wd: 70, color: col, alpha: p * (1 - out) });
          x += w;
        }
        const lp = Ease.snap(prog(lt, 4.2, 4.5)) * (1 - out);
        text(ctx, 'ARITMETIKA TAT-TIFSIRA', XL, 1300, { f: 'JB', w: 700, s: 26, color: C.sky, alpha: lp * 0.8, track: 4 });
      }
      // dimensions line
      const dl = Ease.snap(prog(lt, 6.6, 6.95));
      if (dl > 0) {
        const cnt = Math.round(3 + (4096 - 3) * Ease.inQuad(prog(lt, 6.7, 7.5)));
        text(ctx, "…f'eluf ta' dimensjonijiet.", XL, 1440 + (1 - dl) * 40 + whip * 2400, { f: 'IS', s: 86, color: C.paper, alpha: dl });
        text(ctx, `dimensjonijiet: ${cnt.toLocaleString('en-US').replace(',', ' ')}`, XL + 4, 1300 + whip * 2400, { f: 'JB', w: 700, s: 30, color: C.yellow, alpha: dl });
      }
      // incoming blue from the top during the whip
      if (whip > 0) {
        ctx.fillStyle = C.blue;
        ctx.fillRect(0, -H + whip * H * 1.02, W, H);
      }
    },
    fx(fx, lt) {
      fx.bloom = 0.34;
      fx.bloomThr = 0.55;
      fx.vig = 0.5;
      const whip = prog(lt, 7.62, 8.0);
      fx.ca += whip * 1.5;
    },
    mb(lt) {
      if (lt < 1.2) return 5;
      if (lt > 7.5) return 10;
      if (lt > 4.0 && lt < 4.8) return 5;
      return 3;
    },
  });
})(window);

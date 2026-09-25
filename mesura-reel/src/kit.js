/* Mesura reel engine · kit.js
   Brand components shared by every reel. Each takes explicit progress values,
   so choreography lives in the reel files and components stay reusable. */
(function (G) {
  'use strict';
  const M = G.M;
  const { E, P, D } = M;
  const clamp = M.clamp, lerp = M.lerp, TAU = M.TAU;
  const K = (G.K = {});

  // ------------------------------------------------------------ themes
  K.LT = {
    bg: P.paper, sunken: P.paperSunken, surface: P.surface, tile: P.paper, border: P.border, borderStrong: P.borderStrong,
    ink: P.ink, body: P.inkBody, muted: P.inkMuted, faint: P.inkFaint, ochre: P.ochre, pine: P.pine,
    cell: '#E6DFCF', cellLine: null, activity: P.pine,
  };
  K.DK = {
    bg: D.paper, sunken: D.paperSunken, surface: D.surface, tile: D.paper, border: D.border, borderStrong: D.borderStrong,
    ink: D.ink, body: D.inkBody, muted: D.inkMuted, faint: D.inkFaint, ochre: D.ochre, pine: D.mint,
    cell: '#18251F', cellLine: D.border, activity: D.mint,
  };

  K.bg = (ctx, color) => {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, M.W, M.H);
    ctx.restore();
  };

  // Camera: scale about a pivot + offset + roll
  K.camera = (ctx, { x = 0, y = 0, s = 1, r = 0, px = M.W / 2, py = M.H / 2 } = {}) => {
    ctx.translate(px + x, py + y);
    ctx.rotate(r);
    ctx.scale(s, s);
    ctx.translate(-px, -py);
  };

  // Marker-style highlight behind a word box (from M.wordBox)
  K.highlight = (ctx, box, p, color, o = {}) => {
    if (!box || p <= 0) return;
    const padX = o.padX ?? box.size * 0.06;
    const top = box.y - box.cap * (o.top ?? 0.86);
    const h = box.cap * (o.h ?? 1.12);
    const w = (box.w + padX * 2) * clamp(p);
    ctx.save();
    ctx.fillStyle = color;
    M.rrect(ctx, box.x - padX, top, w, h, o.r ?? 6);
    ctx.fill();
    ctx.restore();
  };

  // Block with a marker highlight on its *accent* word. If hl.text is set, the covered part of
  // the text is redrawn in that colour, so the marker "knocks out" the type as it wipes across.
  // o = drawBlock options + hl: {p, color, text, top, h, padX, r}
  K.markBlock = (ctx, B, o) => {
    const box = M.wordBox(B, (w) => w.accent);
    const hl = o.hl || {};
    const hp = clamp(hl.p ?? 0);
    if (box && hp > 0) K.highlight(ctx, box, hp, hl.color, hl);
    M.drawBlock(ctx, B, o);
    if (box && hp > 0 && hl.text) {
      const padX = hl.padX ?? box.size * 0.06;
      const top = box.y - box.cap * (hl.top ?? 0.86);
      const h = box.cap * (hl.h ?? 1.12);
      ctx.save();
      ctx.beginPath();
      ctx.rect(box.x - padX, top, (box.w + padX * 2) * hp, h);
      ctx.clip();
      M.drawBlock(ctx, B, Object.assign({}, o, { color: hl.text, accent: hl.text }));
      ctx.restore();
    }
    return box;
  };

  // Row of n ticks, the first one highlighted (rank 1 of n)
  K.rankRow = (ctx, x, y, w, n, o) => {
    const lb = o.t;
    for (let i = 0; i < n; i++) {
      const xi = x + (i / (n - 1)) * w;
      const k = n - 1 - i; // stagger right → left
      const hero = i === 0;
      const p = hero ? M.tw(lb, o.at + k * o.stagger + 0.1, 0.9, (t) => E.outBack(t, 2.6)) : M.tw(lb, o.at + k * o.stagger, 0.6, E.outExpo);
      if (p <= 0) continue;
      const h = (hero ? o.heroH : o.h) * p;
      ctx.fillStyle = hero ? o.hero : o.color;
      const lw = hero ? o.heroW : o.lw;
      M.rrect(ctx, xi - lw / 2, y - h, lw, h, lw / 2);
      ctx.fill();
    }
  };

  // ------------------------------------------------------------ waffle
  // o: {x, y, cell, gap, T, appear(i), fill(i), partialIdx, partialAmt, activity, t, glow}
  K.waffle = (ctx, o) => {
    const { x, y, cell, gap, T } = o;
    const rad = cell * 0.18;
    if (o.glow > 0) {
      // warm bloom behind the measured block (dark world)
      const gx = x + 5 * (cell + gap), gy = y + 1.1 * (cell + gap);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(gx, gy, 20, gx, gy, 520);
      g.addColorStop(0, M.rgba(T.ochre, 0.22 * o.glow));
      g.addColorStop(1, M.rgba(T.ochre, 0));
      ctx.fillStyle = g;
      ctx.fillRect(gx - 560, gy - 560, 1120, 1120);
      ctx.restore();
    }
    for (let i = 0; i < 100; i++) {
      const a = o.appear(i);
      if (a <= 0) continue;
      const r = Math.floor(i / 10), c = i % 10;
      const cx = x + c * (cell + gap) + cell / 2, cy = y + r * (cell + gap) + cell / 2;
      const s = E.outBack(clamp(a), 1.6);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(s, s);
      M.rrect(ctx, -cell / 2, -cell / 2, cell, cell, rad);
      ctx.fillStyle = T.cell;
      ctx.fill();
      if (T.cellLine) {
        ctx.strokeStyle = T.cellLine;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      const f = o.fill(i);
      if (f > 0) {
        const fs = E.outBack(clamp(f), 2.4);
        ctx.save();
        ctx.scale(fs, fs);
        M.rrect(ctx, -cell / 2, -cell / 2, cell, cell, rad);
        ctx.clip();
        const amt = i === o.partialIdx ? o.partialAmt : 1;
        ctx.fillStyle = T.ochre;
        ctx.fillRect(-cell / 2, cell / 2 - cell * amt, cell, cell * amt);
        ctx.restore();
      } else if (o.activity > 0) {
        // hidden usage: a restless dot inside every unmeasured cell
        const t = o.t;
        const ph = M.rand(i, 3) * TAU, sp = 1.2 + M.rand(i, 4) * 2.2;
        const orb = cell * (0.12 + M.rand(i, 5) * 0.12);
        const fl = 0.5 + 0.5 * Math.sin(t * (3 + M.rand(i, 6) * 5) + ph * 3);
        ctx.fillStyle = M.rgba(T.activity, o.activity * (0.25 + 0.75 * fl));
        ctx.beginPath();
        ctx.arc(Math.cos(t * sp + ph) * orb, Math.sin(t * sp * 1.3 + ph) * orb, cell * 0.09, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }
  };

  // --------------------------------------------------------------- sun
  // The Mesura mark as a rising sun: glow + ten light shafts aligned to its points.
  K.sun = (ctx, cx, cy, size, o = {}) => {
    const rot = o.rot || 0, rays = o.rays ?? 1, glow = o.glow ?? 1;
    const color = o.color || P.ochre, blend = o.blend || 'lighter';
    if (glow > 0) {
      ctx.save();
      ctx.globalCompositeOperation = blend;
      const R0 = size * (o.glowR ?? 2.8);
      const g = ctx.createRadialGradient(cx, cy, size * 0.05, cx, cy, R0);
      g.addColorStop(0, M.rgba(color, 0.62 * glow));
      g.addColorStop(0.18, M.rgba(color, 0.3 * glow));
      g.addColorStop(0.5, M.rgba(color, 0.08 * glow));
      g.addColorStop(1, M.rgba(color, 0));
      ctx.fillStyle = g;
      ctx.fillRect(cx - R0, cy - R0, R0 * 2, R0 * 2);
      ctx.restore();
    }
    if (rays > 0) {
      ctx.save();
      ctx.globalCompositeOperation = blend;
      const L = o.rayLen || 2600;
      for (let k = 0; k < 10; k++) {
        const p = M.LOGO_PTS[k * 2];
        const a0 = Math.atan2(p[1] - 12, p[0] - 12) + rot + (o.rayRot || 0);
        const hw = M.deg((o.rayWidth ?? 2.4) * (0.8 + 0.4 * M.rand(k, 11)));
        const g = ctx.createLinearGradient(cx, cy, cx + Math.cos(a0) * L, cy + Math.sin(a0) * L);
        g.addColorStop(0, M.rgba(color, 0));
        g.addColorStop(0.07, M.rgba(color, 0.26 * rays));
        g.addColorStop(0.45, M.rgba(color, 0.07 * rays));
        g.addColorStop(1, M.rgba(color, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(a0 - hw) * L, cy + Math.sin(a0 - hw) * L);
        ctx.lineTo(cx + Math.cos(a0 + hw) * L, cy + Math.sin(a0 + hw) * L);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }
    if (o.core !== false) M.mark(ctx, cx, cy, size, { color, rot, hole: o.hole ?? 1, morph: o.morph || 0 });
  };

  // Floating dust motes (analytic paths; deterministic)
  K.motes = (ctx, t, o) => {
    const n = o.n || 90;
    ctx.save();
    ctx.globalCompositeOperation = o.blend || 'lighter';
    for (let i = 0; i < n; i++) {
      const x0 = M.rand(i, 21) * M.W, y0 = M.rand(i, 22) * M.H;
      const sp = 20 + M.rand(i, 23) * 60;
      const x = x0 + M.noise(t * 0.35 + i, 5) * 80;
      const y = M.mod(y0 - t * sp, M.H + 100) - 50;
      const r = 1.5 + M.rand(i, 24) * 3.5;
      const tw_ = 0.5 + 0.5 * Math.sin(t * (1 + M.rand(i, 25) * 3) + i);
      const a = (o.alpha ?? 1) * (0.25 + 0.75 * tw_) * (o.mask ? o.mask(x, y) : 1);
      if (a <= 0.01) continue;
      ctx.fillStyle = M.rgba(o.color || P.ochre, a);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  };

  // ------------------------------------------------------------ dashboard
  // A leadership dashboard that measures everything except AI use.
  // o: {T, t, tileP(i), scan (0..1 beam across, or <0), blind (0..1 glitch), alpha}
  K.dashboard = (ctx, x, y, w, h, o = {}) => {
    const T = o.T || K.DK, t = o.t || 0;
    const pad = 44;
    ctx.save();
    ctx.globalAlpha *= o.alpha ?? 1;
    M.rrect(ctx, x, y, w, h, 30);
    ctx.fillStyle = T.surface;
    ctx.fill();
    ctx.strokeStyle = T.border;
    ctx.lineWidth = 2;
    ctx.stroke();
    M.label(ctx, 'Leadership dashboard', x + pad, y + 74, { weight: 600, size: 31, color: T.ink, ls: 0, upper: false });
    M.label(ctx, 'Q3 2026', x + w - pad, y + 74, { fam: 'mono', weight: 400, size: 25, color: T.muted, ls: 0.02, upper: false, align: 'right' });
    ctx.fillStyle = T.border;
    ctx.fillRect(x + pad, y + 110, w - pad * 2, 2);
    const tw_ = (w - pad * 2 - 24) / 2, th = 208;
    const tiles = [
      { label: 'Revenue', value: '+12%', spark: [0.2, 0.35, 0.3, 0.5, 0.55, 0.7, 0.66, 0.9] },
      { label: 'Headcount', value: '248', spark: [0.5, 0.52, 0.55, 0.54, 0.6, 0.62, 0.63, 0.66] },
      { label: 'Engagement', value: '7.9', spark: [0.6, 0.55, 0.62, 0.58, 0.7, 0.68, 0.74, 0.72] },
      { label: 'AI use', value: '—', blind: true },
    ];
    tiles.forEach((tl, i) => {
      const c = i % 2, r = Math.floor(i / 2);
      const tx = x + pad + c * (tw_ + 24), ty = y + 138 + r * (th + 24);
      const ap = o.tileP ? o.tileP(i) : 1;
      if (ap <= 0) return;
      ctx.save();
      ctx.globalAlpha *= clamp(ap * 1.5);
      ctx.translate(0, (1 - E.outExpo(ap)) * 40);
      M.rrect(ctx, tx, ty, tw_, th, 20);
      ctx.fillStyle = T.tile;
      ctx.fill();
      ctx.strokeStyle = tl.blind && o.blind > 0 ? M.mix(T.border, T.ochre, o.blind * 0.6) : T.border;
      ctx.lineWidth = 2;
      ctx.stroke();
      M.label(ctx, tl.label, tx + 30, ty + 54, { weight: 500, size: 27, color: T.muted, ls: 0, upper: false });
      let jx = 0;
      if (tl.blind && o.blind > 0) jx = (M.rand(Math.floor(t * 30), 41) - 0.5) * 14 * o.blind;
      ctx.font = M.font('serif', 500, 86);
      ctx.letterSpacing = '0px';
      ctx.fillStyle = tl.blind ? T.faint : T.ink;
      ctx.fillText(tl.value, tx + 28 + jx, ty + 164);
      if (tl.spark) {
        ctx.strokeStyle = T.pine;
        ctx.lineWidth = 4;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.beginPath();
        const sx = tx + tw_ - 30 - 150, sy = ty + 150;
        const sp = o.sparkP ? o.sparkP(i) : 1;
        const n = tl.spark.length;
        const upto = (n - 1) * sp;
        for (let k = 0; k <= Math.floor(upto); k++) {
          const px = sx + (k / (n - 1)) * 150, py = sy - tl.spark[k] * 70;
          if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        const kf = Math.floor(upto), fr = upto - kf;
        if (kf < n - 1 && fr > 0) {
          ctx.lineTo(sx + ((kf + fr) / (n - 1)) * 150, sy - lerp(tl.spark[kf], tl.spark[kf + 1], fr) * 70);
        }
        ctx.stroke();
      } else {
        K.badgeN(ctx, tx + tw_ - 30, ty + 142, 'Not measured', T, { align: 'right', size: 24, p: o.badgeP ?? 1 });
      }
      ctx.restore();
    });
    // chart strip: AI use over time, no data
    const cy = y + 138 + 2 * (th + 24) + 8;
    const ch = h - (cy - y) - pad;
    if (ch > 60) {
      const cp = o.tileP ? o.tileP(4) : 1;
      ctx.save();
      ctx.globalAlpha *= clamp(cp * 1.5);
      M.label(ctx, 'AI use over time', x + pad, cy + 34, { weight: 500, size: 25, color: T.muted, ls: 0, upper: false });
      ctx.strokeStyle = T.faint;
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 12]);
      ctx.beginPath();
      const ly = cy + ch * 0.66;
      ctx.moveTo(x + pad, ly);
      ctx.lineTo(x + pad + (w - pad * 2) * clamp(cp), ly);
      ctx.stroke();
      ctx.setLineDash([]);
      M.label(ctx, 'No data', x + w / 2, ly - 20, { fam: 'mono', weight: 400, size: 25, color: T.faint, ls: 0.04, align: 'center', upper: false });
      ctx.restore();
    }
    // scanning beam
    if (o.scan != null && o.scan > 0 && o.scan < 1) {
      const bx = x + lerp(-60, w + 60, o.scan);
      ctx.save();
      M.rrect(ctx, x, y, w, h, 30);
      ctx.clip();
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createLinearGradient(bx - 160, 0, bx + 16, 0);
      g.addColorStop(0, M.rgba(T.pine, 0));
      g.addColorStop(0.85, M.rgba(T.pine, 0.1));
      g.addColorStop(1, M.rgba(T.pine, 0.4));
      ctx.fillStyle = g;
      ctx.fillRect(bx - 160, y, 176, h);
      ctx.fillStyle = M.rgba(T.pine, 0.85);
      ctx.fillRect(bx + 12, y, 3, h);
      ctx.restore();
    }
    ctx.restore();
  };

  // Neutral / pine / ochre badge helpers (design-system badges)
  K.badgeN = (ctx, x, y, text, T, o = {}) =>
    M.badge(ctx, x, y, text, Object.assign({ bg: T === K.DK ? D.paperSunken : P.paperSunken, fg: T === K.DK ? D.inkMuted : P.inkMuted }, o));
  K.badgeP = (ctx, x, y, text, o = {}) => M.badge(ctx, x, y, text, Object.assign({ bg: P.pineSoft, fg: P.pine }, o));
  K.badgeO = (ctx, x, y, text, o = {}) => M.badge(ctx, x, y, text, Object.assign({ bg: P.ochreSoft, fg: P.caution }, o));

  // Soft card shadow + surface (design system: surface on paper, hairline border)
  K.card = (ctx, x, y, w, h, r, o = {}) => {
    ctx.save();
    if (o.shadow !== false) {
      ctx.shadowColor = `rgba(34,54,47,${o.shadowA ?? 0.1})`;
      ctx.shadowBlur = o.shadowBlur ?? 40;
      ctx.shadowOffsetY = o.shadowY ?? 14;
    }
    M.rrect(ctx, x, y, w, h, r);
    ctx.fillStyle = o.fill || P.surface;
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = o.stroke || P.border;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  };

  // ------------------------------------------------------------ survey
  // o: {q:[lines], opts:[...], sel, selP, prog, label, press, qn}
  K.survey = (ctx, x, y, w, h, o) => {
    K.card(ctx, x, y, w, h, 34, { shadowA: o.shadowA ?? 0.1 });
    const pad = 56;
    M.label(ctx, o.label || 'AI readiness diagnostic', x + pad, y + 86, { size: 24, color: P.ochre, ls: 0.14 });
    M.label(ctx, o.qn || '', x + w - pad, y + 86, { fam: 'mono', weight: 400, size: 24, color: P.inkMuted, ls: 0.02, align: 'right', upper: false });
    // progress
    const py = y + 124, pw = w - pad * 2;
    M.rrect(ctx, x + pad, py, pw, 10, 5);
    ctx.fillStyle = P.paperSunken;
    ctx.fill();
    M.rrect(ctx, x + pad, py, Math.max(10, pw * clamp(o.prog)), 10, 5);
    ctx.fillStyle = P.pine;
    ctx.fill();
    // question
    const Q = M.block(ctx, { lines: o.q, size: 62, lh: 1.08, x: x + pad, y: y + 214, anchor: 'top' });
    M.drawBlock(ctx, Q, { t: 1, color: P.ink, in: { style: 'none' } });
    // options
    let oy = Q.bottom + 72;
    const oh = 96, gap = 16;
    o.opts.forEach((txt, i) => {
      const sel = i === o.sel ? clamp(o.selP) : 0;
      const press = i === o.sel ? o.press || 0 : 0;
      const ox = x + pad, ow = w - pad * 2;
      ctx.save();
      const sc = 1 - 0.025 * press;
      ctx.translate(ox + ow / 2, oy + oh / 2);
      ctx.scale(sc, sc);
      ctx.translate(-(ox + ow / 2), -(oy + oh / 2));
      M.rrect(ctx, ox, oy, ow, oh, 24);
      ctx.fillStyle = sel > 0 ? M.mix(P.surface, P.pineSoft, sel) : P.surface;
      ctx.fill();
      ctx.strokeStyle = sel > 0 ? M.mix(P.border, P.pine, sel) : P.border;
      ctx.lineWidth = 2 + sel;
      ctx.stroke();
      // radio
      const rx = ox + 50, ry = oy + oh / 2;
      ctx.beginPath();
      ctx.arc(rx, ry, 17, 0, TAU);
      ctx.strokeStyle = sel > 0 ? M.mix(P.borderStrong, P.pine, sel) : P.borderStrong;
      ctx.lineWidth = 3;
      ctx.stroke();
      if (sel > 0) {
        ctx.beginPath();
        ctx.arc(rx, ry, 17 * E.outBack(sel, 2.5), 0, TAU);
        ctx.fillStyle = P.pine;
        ctx.fill();
        // check
        const cp = clamp((sel - 0.35) / 0.65);
        if (cp > 0) {
          ctx.strokeStyle = P.onPine;
          ctx.lineWidth = 4;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.beginPath();
          const pts = [[rx - 8, ry + 1], [rx - 2, ry + 7], [rx + 9, ry - 6]];
          const L1 = Math.hypot(6, 6), L2 = Math.hypot(11, 13), Lt = L1 + L2;
          const d = cp * Lt;
          ctx.moveTo(pts[0][0], pts[0][1]);
          if (d <= L1) ctx.lineTo(lerp(pts[0][0], pts[1][0], d / L1), lerp(pts[0][1], pts[1][1], d / L1));
          else {
            ctx.lineTo(pts[1][0], pts[1][1]);
            ctx.lineTo(lerp(pts[1][0], pts[2][0], (d - L1) / L2), lerp(pts[1][1], pts[2][1], (d - L1) / L2));
          }
          ctx.stroke();
        }
      }
      M.label(ctx, txt, ox + 88, oy + oh / 2 + 14, { weight: 500, size: 38, color: P.ink, ls: 0, upper: false });
      ctx.restore();
      oy += oh + gap;
    });
  };

  // ------------------------------------------------------------ report
  // o: {scoreP, rowP(i), benchP, badgeP, emergP, headP}
  K.REPORT_ROWS = [
    { k: 'Usage', v: 81, b: 60 },
    { k: 'Skills', v: 64, b: 55 },
    { k: 'Tools', v: 70, b: 62 },
    { k: 'Governance', v: 38, b: 45, low: true },
    { k: 'Culture', v: 75, b: 57 },
  ];
  K.report = (ctx, x, y, w, h, o) => {
    K.card(ctx, x, y, w, h, 34, { shadowA: 0.12, shadowBlur: 50 });
    const pad = 56;
    const hp = o.headP ?? 1;
    ctx.save();
    ctx.globalAlpha *= hp;
    M.lockup(ctx, x + pad, y + 92, 36, { color: P.pine });
    K.badgeN(ctx, x + w - pad, y + 80, 'Sample report', K.LT, { align: 'right', size: 24 });
    M.label(ctx, 'AI readiness report', x + pad, y + 196, { fam: 'serif', weight: 500, size: 58, color: P.ink, ls: -0.01, upper: false });
    ctx.restore();
    // score
    const sp = o.scoreP ?? 1;
    M.label(ctx, 'Readiness score', x + pad, y + 268, { size: 23, color: P.inkMuted, ls: 0.14, alpha: clamp(sp * 3) });
    const od = M.odometer(ctx, 72 * E.outQuart(sp), { x: x + pad - 6, y: y + 440, size: 200, color: P.pine, align: 'left', decimals: 0, digits: 2, hideLeadingZeros: true });
    M.label(ctx, '/100', x + pad + od.width + 12, y + 440, { fam: 'serif', weight: 500, size: 64, color: P.inkFaint, ls: 0, upper: false, alpha: clamp(sp * 2) });
    const bp = o.benchP ?? 1;
    M.label(ctx, 'Benchmark 58', x + w - pad, y + 340, { fam: 'mono', weight: 400, size: 26, color: P.inkMuted, ls: 0.02, align: 'right', upper: false, alpha: clamp(bp * 2) });
    K.badgeP(ctx, x + w - pad, y + 408, 'Above benchmark', { align: 'right', size: 27, p: o.badgeP ?? 1 });
    ctx.fillStyle = P.border;
    ctx.fillRect(x + pad, y + 492, w - pad * 2, 2);
    // dimension rows
    K.REPORT_ROWS.forEach((r, i) => {
      const rp = o.rowP ? o.rowP(i) : 1;
      if (rp <= 0) return;
      const ry = y + 574 + i * 100;
      ctx.save();
      ctx.globalAlpha *= clamp(rp * 2.5);
      M.label(ctx, r.k, x + pad, ry, { weight: 500, size: 33, color: P.ink, ls: 0, upper: false });
      if (r.low) {
        const ep = o.emergP ?? 1;
        const kw = M.layoutLine(ctx, r.k, 'sans', 500, 33, 0).width;
        K.badgeO(ctx, x + pad + kw + 20, ry - 11, 'Emerging', { size: 21, p: ep });
      }
      M.label(ctx, String(Math.round(r.v * E.outQuart(rp))), x + w - pad, ry, { fam: 'mono', weight: 500, size: 28, color: r.low ? P.caution : P.pine, ls: 0, align: 'right', upper: false });
      const tx = x + pad, tw_ = w - pad * 2, ty = ry + 24;
      M.rrect(ctx, tx, ty, tw_, 16, 8);
      ctx.fillStyle = P.paperSunken;
      ctx.fill();
      M.rrect(ctx, tx, ty, Math.max(16, tw_ * (r.v / 100) * E.outExpo(rp)), 16, 8);
      ctx.fillStyle = r.low ? P.ochre : P.pine;
      ctx.fill();
      // benchmark tick
      if (bp > 0) {
        const bx = tx + tw_ * (r.b / 100);
        const bh = 38 * E.outBack(clamp(bp * 1.4 - i * 0.08), 2);
        ctx.fillStyle = P.ink;
        ctx.fillRect(bx - 1.5, ty + 8 - bh / 2, 3, bh);
      }
      ctx.restore();
    });
  };

  // ------------------------------------------------------------ benchmark ruler
  // o: {p, bench, benchP, you, youP, dimP, labels}
  K.RULER_STEM = 380;
  K.benchRuler = (ctx, x, y, w, o) => {
    const p = o.p ?? 1;
    M.ruler(ctx, x, y, w, { n: 100, major: 10, len: 18, majorLen: 50, color: P.ink, lw: 3, p });
    for (let v = 0; v <= 100; v += 20) {
      const lp = clamp(p * 1.4 - v / 140);
      M.label(ctx, String(v), x + (w * v) / 100, y + 92, { fam: 'mono', weight: 400, size: 28, color: P.inkMuted, ls: 0, align: 'center', upper: false, alpha: lp });
    }
    const X = (v) => x + (w * v) / 100;
    // benchmark
    const bp = o.benchP ?? 0;
    if (bp > 0) {
      const bx = X(o.bench), top = y - 230 * E.outExpo(bp);
      ctx.save();
      ctx.strokeStyle = P.inkFaint;
      ctx.lineWidth = 4;
      ctx.setLineDash([9, 9]);
      ctx.beginPath();
      ctx.moveTo(bx, y);
      ctx.lineTo(bx, top);
      ctx.stroke();
      ctx.restore();
      const la = clamp(bp * 2 - 0.6);
      M.label(ctx, 'Benchmark', bx - 30, top - 74, { fam: 'mono', weight: 400, size: 27, color: P.inkMuted, ls: 0.02, align: 'right', upper: false, alpha: la });
      M.label(ctx, String(o.bench), bx - 30, top - 8, { fam: 'serif', weight: 500, size: 68, color: P.inkFaint, ls: 0, align: 'right', upper: false, alpha: la });
    }
    // you
    const yp = o.youP ?? 0;
    if (yp > 0) {
      const v = o.you;
      const yx = X(v), stem = K.RULER_STEM * E.outExpo(clamp(yp * 1.5));
      ctx.fillStyle = P.pine;
      ctx.fillRect(yx - 3, y - stem, 6, stem);
      const hr = (o.headR ?? 30) * E.outBack(clamp(yp * 1.5 - 0.2), 2.2);
      if (hr > 0 && !o.hideHead) {
        ctx.beginPath();
        ctx.arc(yx, y - stem, hr, 0, TAU);
        ctx.fill();
      }
      const la = clamp(yp * 2 - 0.8) * (o.youLabelA ?? 1);
      M.label(ctx, 'You', yx + 54, y - stem - 34, { weight: 600, size: 36, color: P.pine, ls: 0.02, upper: false, alpha: la });
      M.label(ctx, String(Math.round(v)), yx + 50, y - stem + 62, { fam: 'serif', weight: 500, size: 100, color: P.pine, ls: 0, upper: false, alpha: la });
    }
    // gap dimension
    const dp = o.dimP ?? 0;
    if (dp > 0) {
      const dy = y - 140;
      M.dimLine(ctx, X(o.bench) + 6, dy, X(o.you) - 8, dy, { p: dp, color: P.ochre, lw: 5, tick: 30, arrow: 17 });
    }
  };

  // ------------------------------------------------------------ button
  // Pill button that can grow out of a circle (container transform).
  // o: {cx, cy, w, h, text, size, m, from:{x,y,d}, press, textP, ripple}
  K.button = (ctx, o) => {
    const m = clamp(o.m ?? 1);
    const fx = o.from ? o.from.x : o.cx, fy = o.from ? o.from.y : o.cy, fd = o.from ? o.from.d : o.h;
    const w = lerp(fd, o.w, m), h = lerp(fd, o.h, m);
    const cx = lerp(fx, o.cx, m), cy = lerp(fy, o.cy, m);
    const press = o.press || 0;
    const sc = 1 - 0.035 * press;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(sc, sc);
    if (o.shadow !== false) {
      ctx.shadowColor = `rgba(34,54,47,${0.18 * m})`;
      ctx.shadowBlur = 40;
      ctx.shadowOffsetY = 16 * (1 - press);
    }
    M.pill(ctx, -w / 2, -h / 2, w, h);
    ctx.fillStyle = o.bg || P.pine;
    ctx.fill();
    ctx.shadowColor = 'transparent';
    if (o.ripple > 0 && o.ripple < 1) {
      ctx.save();
      M.pill(ctx, -w / 2, -h / 2, w, h);
      ctx.clip();
      ctx.fillStyle = M.rgba(P.onPine, 0.22 * (1 - o.ripple));
      ctx.beginPath();
      ctx.arc((o.rx || 0), (o.ry || 0), E.outCubic(o.ripple) * w * 0.9, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    const tp = clamp(o.textP ?? 1);
    if (tp > 0) {
      ctx.save();
      M.pill(ctx, -w / 2, -h / 2, w, h);
      ctx.clip();
      const L = M.layoutLine(ctx, o.text, 'sans', 500, o.size, 0);
      ctx.font = M.font('sans', 500, o.size);
      ctx.letterSpacing = '0px';
      ctx.fillStyle = o.fg || P.onPine;
      ctx.fillText(o.text, -L.width / 2, o.size * 0.36 + (1 - E.outExpo(tp)) * h);
      ctx.restore();
    }
    ctx.restore();
  };

  // Touch indicator (finger): o = {p (presence 0..1), press (0..1), ripple (0..1)}
  K.tap = (ctx, x, y, o) => {
    const p = clamp(o.p ?? 1);
    if (p <= 0) return;
    const press = o.press || 0;
    ctx.save();
    const r = 44 * (1 - 0.18 * press) * lerp(0.6, 1, E.outBack(p));
    ctx.globalAlpha *= p;
    ctx.fillStyle = M.rgba(P.ink, 0.16 + 0.1 * press);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = M.rgba('#FFFFFF', 0.95);
    ctx.lineWidth = 5;
    ctx.stroke();
    if (o.ripple > 0 && o.ripple < 1) {
      ctx.strokeStyle = M.rgba(o.rippleColor || P.pine, 0.6 * (1 - o.ripple));
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(x, y, 44 + E.outCubic(o.ripple) * 110, 0, TAU);
      ctx.stroke();
    }
    ctx.restore();
  };
})(typeof window !== 'undefined' ? window : globalThis);

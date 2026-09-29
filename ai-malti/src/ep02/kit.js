// ep02/kit.js — EP02 design kit: palette, Maltese cement tiles (madum), tile-flip transition,
// proverb typography, and the illustrated objects (ġarra, head, cat, tools, gallariji, domes, glasses…).
// Illustration style: flat colour, heavy ink outline, offset print-shadow.
(function (G) {
  const { W, H, TAU, clamp, lerp, prog, Ease, rgba, mix, noise1, rnd, rndr, text, layout, fitSize, spring, buf } = M;

  const P = {
    ink: '#17120E', ink2: '#2A211A', cream: '#F4EAD5', stone: '#E6D5B3', stoneD: '#C9B48C',
    terra: '#C85A3C', terraD: '#9E4029', ochre: '#E4A33A', ochreD: '#B97F22', teal: '#1E6B6E', tealD: '#134B4E',
    slate: '#2C4A7C', slateD: '#1C3259', brick: '#A7312B', green: '#3E8E5E', greenD: '#2B6843', sky: '#8EC5E8',
    skyD: '#5F9FC9', pink: '#E88AA0', yellow: '#FFC300', red: '#E8202A', white: '#FFFFFF', navy: '#14213D', wood: '#8B5A2B',
  };
  const XL = 72, XW = W - 144, LW = 9; // gutters, standard outline weight

  // ── geometry helpers ─────────────────────────────────────
  function rr(ctx, x, y, w, h, r) { M.rrect(ctx, x, y, w, h, r); }
  function smooth(ctx, pts, closed = true, tension = 1) {
    // Catmull-Rom through pts → cubic Béziers
    const n = pts.length;
    const get = (i) => pts[closed ? (i + n) % n : clamp(i, 0, n - 1)];
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 0; i < (closed ? n : n - 1); i++) {
      const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
      ctx.bezierCurveTo(
        p1[0] + ((p2[0] - p0[0]) / 6) * tension, p1[1] + ((p2[1] - p0[1]) / 6) * tension,
        p2[0] - ((p3[0] - p1[0]) / 6) * tension, p2[1] - ((p3[1] - p1[1]) / 6) * tension,
        p2[0], p2[1]
      );
    }
    if (closed) ctx.closePath();
  }
  // flat fill + ink outline + offset print shadow for the current path-building fn
  function inked(ctx, build, fill, { shadow = P.ink, sh = 10, lw = LW, stroke = P.ink, alpha = 1 } = {}) {
    ctx.save();
    ctx.globalAlpha *= alpha;
    if (sh) {
      ctx.save();
      ctx.translate(sh, sh);
      ctx.beginPath(); build(); ctx.fillStyle = shadow; ctx.fill();
      ctx.restore();
    }
    ctx.beginPath(); build();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (lw) { ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.strokeStyle = stroke; ctx.stroke(); }
    ctx.restore();
  }
  function tick(ctx, x, y, s, col = P.green, lw = 12, p = 1) {
    ctx.save();
    ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.setLineDash([s * 2.2 * p, 9999]);
    ctx.beginPath(); ctx.moveTo(x - s * 0.5, y); ctx.lineTo(x - s * 0.12, y + s * 0.38); ctx.lineTo(x + s * 0.55, y - s * 0.42); ctx.stroke();
    ctx.restore();
  }
  function cross(ctx, x, y, s, col = P.red, lw = 12, p = 1) {
    ctx.save();
    ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineCap = 'round';
    const a = clamp(p * 2), b = clamp(p * 2 - 1);
    ctx.beginPath(); ctx.moveTo(x - s * 0.45, y - s * 0.45); ctx.lineTo(x - s * 0.45 + s * 0.9 * a, y - s * 0.45 + s * 0.9 * a);
    if (b > 0) { ctx.moveTo(x + s * 0.45, y - s * 0.45); ctx.lineTo(x + s * 0.45 - s * 0.9 * b, y - s * 0.45 + s * 0.9 * b); }
    ctx.stroke();
    ctx.restore();
  }

  // ── madum: Maltese cement tiles ──────────────────────────
  // kinds: 'rosette' | 'star' | 'quatro'; c = [ground, a, b, d]
  function drawTile(ctx, S, kind, c) {
    const s = S;
    ctx.fillStyle = c[0];
    ctx.fillRect(0, 0, s, s);
    const circ = (x, y, r, col) => { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fillStyle = col; ctx.fill(); };
    const corners = [[0, 0], [s, 0], [0, s], [s, s]];
    if (kind === 'rosette') {
      for (const [x, y] of corners) { circ(x, y, s * 0.42, c[1]); circ(x, y, s * 0.31, c[0]); circ(x, y, s * 0.2, c[2]); circ(x, y, s * 0.09, c[3]); }
      ctx.save(); ctx.translate(s / 2, s / 2);
      for (let k = 0; k < 8; k++) {
        ctx.save(); ctx.rotate((k * TAU) / 8);
        ctx.beginPath(); ctx.ellipse(s * 0.17, 0, s * (k % 2 ? 0.12 : 0.16), s * (k % 2 ? 0.045 : 0.065), 0, 0, TAU);
        ctx.fillStyle = k % 2 ? c[3] : c[2]; ctx.fill();
        ctx.restore();
      }
      circ(0, 0, s * 0.075, c[1]); circ(0, 0, s * 0.035, c[0]);
      ctx.restore();
      ctx.strokeStyle = c[3]; ctx.lineWidth = s * 0.018;
      ctx.beginPath(); ctx.moveTo(s / 2, s * 0.03); ctx.lineTo(s * 0.97, s / 2); ctx.lineTo(s / 2, s * 0.97); ctx.lineTo(s * 0.03, s / 2); ctx.closePath(); ctx.stroke();
    } else if (kind === 'star') {
      for (const [x, y] of [[s / 2, 0], [s, s / 2], [s / 2, s], [0, s / 2]]) { circ(x, y, s * 0.2, c[2]); circ(x, y, s * 0.11, c[0]); }
      for (const [x, y] of corners) {
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (x ? -1 : 1) * s * 0.26, y); ctx.lineTo(x, y + (y ? -1 : 1) * s * 0.26); ctx.closePath();
        ctx.fillStyle = c[3]; ctx.fill();
      }
      ctx.save(); ctx.translate(s / 2, s / 2);
      for (const rot of [0, Math.PI / 4]) { ctx.save(); ctx.rotate(rot); ctx.fillStyle = c[1]; ctx.fillRect(-s * 0.22, -s * 0.22, s * 0.44, s * 0.44); ctx.restore(); }
      circ(0, 0, s * 0.15, c[0]); circ(0, 0, s * 0.1, c[3]); circ(0, 0, s * 0.04, c[2]);
      ctx.restore();
    } else {
      ctx.save();
      ctx.beginPath(); ctx.rect(0, 0, s, s); ctx.clip();
      ctx.strokeStyle = c[1]; ctx.lineWidth = s * 0.07;
      for (const [x, y] of corners) { ctx.beginPath(); ctx.arc(x, y, s * 0.5, 0, TAU); ctx.stroke(); }
      ctx.strokeStyle = c[3]; ctx.lineWidth = s * 0.02;
      for (const [x, y] of corners) { ctx.beginPath(); ctx.arc(x, y, s * 0.36, 0, TAU); ctx.stroke(); }
      ctx.restore();
      circ(s / 2, s / 2, s * 0.17, c[2]);
      ctx.save(); ctx.translate(s / 2, s / 2); ctx.rotate(Math.PI / 4); ctx.fillStyle = c[3]; ctx.fillRect(-s * 0.08, -s * 0.08, s * 0.16, s * 0.16); ctx.restore();
      for (const [x, y] of [[s / 2, 0], [s, s / 2], [s / 2, s], [0, s / 2]]) circ(x, y, s * 0.06, c[3]);
    }
    // wear + grout
    for (let i = 0; i < 60; i++) {
      ctx.fillStyle = rgba(i % 2 ? '#000000' : '#FFFFFF', 0.035);
      ctx.fillRect(rnd(i, 1) * s, rnd(i, 2) * s, 2 + rnd(i, 3) * 3, 2 + rnd(i, 4) * 3);
    }
    ctx.strokeStyle = rgba('#000000', 0.28);
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, s - 2, s - 2);
  }
  const tileCache = new Map();
  function tileImg(kind, c, S) {
    const key = kind + c.join('') + S;
    let t = tileCache.get(key);
    if (!t) {
      const cv = document.createElement('canvas');
      cv.width = cv.height = S;
      drawTile(cv.getContext('2d'), S, kind, c);
      tileCache.set(key, (t = cv));
    }
    return t;
  }
  function floor(ctx, kind, c, S = 180, ox = 0, oy = 0) {
    const img = tileImg(kind, c, S);
    const x0 = (((ox % S) + S) % S) - S, y0 = (((oy % S) + S) % S) - S;
    for (let y = y0; y < H; y += S) for (let x = x0; x < W; x += S) ctx.drawImage(img, x, y);
  }
  // one row of tiles as a decorative band (top edge at y), with a thin ink rule above
  function band(ctx, kind, c, S, y, ox = 0, rows = 1) {
    const img = tileImg(kind, c, S);
    const x0 = (((ox % S) + S) % S) - S;
    for (let r = 0; r < rows; r++) for (let x = x0; x < W; x += S) ctx.drawImage(img, x, y + r * S);
    ctx.fillStyle = P.ink;
    ctx.fillRect(0, y - 8, W, 10);
  }
  function tilePattern(ctx, kind, c, S, ox = 0, oy = 0) {
    const pat = ctx.createPattern(tileImg(kind, c, S), 'repeat');
    if (pat.setTransform) pat.setTransform(new DOMMatrix().translate(ox, oy));
    return pat;
  }

  // ── tile-flip transition ─────────────────────────────────
  // p: seconds since the flip started. paintA/paintB draw full frames. Tiles flip on a diagonal wave.
  function tileFlip(ctx, p, paintA, paintB, { S = 180, flip = 0.28, spread = 0.22, dir = 1, grout = P.ink } = {}) {
    const A = buf('flipA'), B = buf('flipB');
    paintA(A.x);
    paintB(B.x);
    ctx.fillStyle = grout;
    ctx.fillRect(0, 0, W, H);
    const cols = Math.ceil(W / S), rows = Math.ceil(H / S);
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const u = dir > 0 ? (i + (rows - 1 - j)) / (cols + rows - 2) : (cols - 1 - i + j) / (cols + rows - 2);
        const q = clamp((p - u * spread) / flip);
        const x = i * S, y = j * S;
        if (q <= 0) { ctx.drawImage(A.c, x, y, S, S, x, y, S, S); continue; }
        if (q >= 1) { ctx.drawImage(B.c, x, y, S, S, x, y, S, S); continue; }
        const e = Ease.inOutCubic(q), ang = e * Math.PI;
        const src = e < 0.5 ? A.c : B.c;
        const sx = Math.max(0.02, Math.abs(Math.cos(ang)));
        ctx.save();
        ctx.translate(x + S / 2, y + S / 2);
        ctx.scale(sx, 1 + 0.1 * Math.sin(ang));
        ctx.drawImage(src, x, y, S, S, -S / 2, -S / 2, S, S);
        ctx.fillStyle = rgba('#000000', 0.45 * Math.sin(ang));
        ctx.fillRect(-S / 2, -S / 2, S, S);
        ctx.restore();
      }
    }
  }

  // ── typography ───────────────────────────────────────────
  // Proverb block: chunks [{s, at}] flow as one italic serif paragraph; each chunk rises in at its time.
  function proverb(ctx, chunks, lt, { x = XL, y = 420, s = 104, width = XW, color = P.cream, quote = P.yellow, lh = 1.08, out = null } = {}) {
    ctx.font = M.fontStr('IS', 400, s);
    const words = [];
    chunks.forEach((c, ci) => c.s.split(' ').forEach((w, wi) => words.push({ w, at: c.at + wi * 0.06, ci })));
    const space = ctx.measureText(' ').width;
    let cx = 0, line = 0;
    for (const wd of words) {
      const ww = ctx.measureText(wd.w).width;
      if (cx > 0 && cx + ww > width) { cx = 0; line++; }
      wd.x = cx; wd.line = line; wd.ww = ww;
      cx += ww + space;
    }
    const L = s * lh;
    // opening quote mark
    const q0 = Ease.snap(prog(lt, chunks[0].at - 0.1, chunks[0].at + 0.25));
    if (q0 > 0) text(ctx, '“', x - s * 0.08, y - s * 0.42 + (1 - q0) * 30, { f: 'IS', s: s * 1.5, color: quote, alpha: q0 });
    const outP = out != null ? Ease.inQuart(prog(lt, out, out + 0.3)) : 0;
    for (const wd of words) {
      const p = Ease.snap(prog(lt, wd.at, wd.at + 0.4));
      if (p <= 0) continue;
      const by = y + wd.line * L + s * 0.72;
      ctx.save();
      ctx.beginPath();
      ctx.rect(x + wd.x - 20, by - s * 0.95, wd.ww + 40, s * 1.22);
      ctx.clip();
      text(ctx, wd.w, x + wd.x, by + (1 - p) * s * 0.9 - outP * s * 1.1, { f: 'IS', s, color });
      ctx.restore();
    }
    return { lines: line + 1, height: (line + 1) * L };
  }
  // "U L-AI?" pill
  function kicker(ctx, x, y, lt, at, { label = 'U L-AI?', bg = P.yellow, fg = P.ink } = {}) {
    const p = spring(lt - at, 3.2, 0.42);
    if (p <= 0.001) return;
    const w = M.textWidth(ctx, label, 'JB', 800, 34, 100, 3) + 44, h = 60;
    ctx.save();
    ctx.translate(x + w / 2, y);
    ctx.scale(p, p);
    ctx.rotate((1 - clamp(p)) * -0.2);
    ctx.fillStyle = P.ink; rr(ctx, -w / 2 + 6, -h / 2 + 7, w, h, 30); ctx.fill();
    ctx.fillStyle = bg; rr(ctx, -w / 2, -h / 2, w, h, 30); ctx.fill();
    text(ctx, label, -w / 2 + 22, 12, { f: 'JB', w: 800, s: 34, color: fg, track: 3 });
    ctx.restore();
  }
  // sans line that rises in at `at` (optional exit at `out`)
  function line(ctx, str, x, y, lt, at, { s = 68, w = 800, wd = 88, color = P.cream, align = 'left', out = null, f = 'A' } = {}) {
    const p = Ease.snap(prog(lt, at, at + 0.35));
    if (p <= 0) return;
    const o = out != null ? Ease.inQuart(prog(lt, out, out + 0.25)) : 0;
    if (o >= 1) return;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, y - s * 0.95, W, s * 1.25);
    ctx.clip();
    text(ctx, str, x, y + (1 - p) * s * 1.05 - o * s * 1.1, f === 'IS' ? { f: 'IS', s, color, align } : { f: 'A', w, s, wd, color, align });
    ctx.restore();
  }
  // line() with the size capped so the string fits maxW
  function lineFit(ctx, str, x, y, lt, at, maxW, opt = {}) {
    const s0 = opt.s || 64;
    const s = Math.min(s0, fitSize(ctx, str, maxW, 'A', opt.w || 800, opt.wd || 88));
    line(ctx, str, x, y, lt, at, { ...opt, s });
  }
  function label(ctx, str, x, y, { s = 26, color = P.cream, align = 'left', alpha = 1, track = 3, w = 700 } = {}) {
    text(ctx, str, x, y, { f: 'JB', w, s, color, align, alpha, track });
  }

  // ── objects ──────────────────────────────────────────────
  // Ġarra (water jar). (cx, top) = centre of the lip; s = scale (1 → 525 px tall)
  function jarBody(ctx, cx, top, s) {
    const side = (m) => {
      const q = (x, y) => [cx + m * x * s, top + y * s];
      return q;
    };
    const r = side(1), l = side(-1);
    ctx.moveTo(...l(70, 0));
    ctx.lineTo(...r(70, 0));
    ctx.bezierCurveTo(...r(92, 2), ...r(90, 30), ...r(62, 40));
    ctx.lineTo(...r(58, 78));
    ctx.bezierCurveTo(...r(62, 120), ...r(185, 130), ...r(205, 255));
    ctx.bezierCurveTo(...r(222, 365), ...r(160, 470), ...r(100, 512));
    ctx.lineTo(...r(96, 525));
    ctx.lineTo(...l(96, 525));
    ctx.lineTo(...l(100, 512));
    ctx.bezierCurveTo(...l(160, 470), ...l(222, 365), ...l(205, 255));
    ctx.bezierCurveTo(...l(185, 130), ...l(62, 120), ...l(58, 78));
    ctx.lineTo(...l(62, 40));
    ctx.bezierCurveTo(...l(90, 30), ...l(92, 2), ...l(70, 0));
    ctx.closePath();
  }
  function jar(ctx, cx, top, s, { draw = 1, level = 0, t = 0, words = null } = {}) {
    // handles
    ctx.save();
    ctx.lineWidth = 22 * s; ctx.lineCap = 'round'; ctx.strokeStyle = P.ink;
    ctx.globalAlpha = clamp(draw * 2 - 1);
    for (const m of [1, -1]) {
      ctx.beginPath();
      ctx.moveTo(cx + m * 60 * s, top + 92 * s);
      ctx.bezierCurveTo(cx + m * 128 * s, top + 52 * s, cx + m * 205 * s, top + 105 * s, cx + m * 186 * s, top + 190 * s);
      ctx.stroke();
    }
    ctx.strokeStyle = P.terra; ctx.lineWidth = 10 * s;
    for (const m of [1, -1]) {
      ctx.beginPath();
      ctx.moveTo(cx + m * 60 * s, top + 92 * s);
      ctx.bezierCurveTo(cx + m * 128 * s, top + 52 * s, cx + m * 205 * s, top + 105 * s, cx + m * 186 * s, top + 190 * s);
      ctx.stroke();
    }
    ctx.restore();
    // shadow + translucent body
    ctx.save();
    ctx.globalAlpha = clamp(draw * 2 - 0.6);
    ctx.save(); ctx.translate(12, 12); ctx.beginPath(); jarBody(ctx, cx, top, s); ctx.fillStyle = rgba(P.ink, 0.55); ctx.fill(); ctx.restore();
    ctx.beginPath(); jarBody(ctx, cx, top, s); ctx.fillStyle = P.terra; ctx.fill();
    // water (inside, clipped)
    if (level > 0) {
      ctx.save();
      ctx.beginPath(); jarBody(ctx, cx, top, s); ctx.clip();
      const bottom = top + 525 * s, surfTop = top + 60 * s;
      const yS = lerp(bottom, surfTop, level);
      ctx.beginPath();
      ctx.moveTo(cx - 260 * s, bottom + 10);
      for (let x = -260; x <= 260; x += 8) {
        const yy = yS + Math.sin(x * 0.035 + t * 7) * 7 * s + Math.sin(x * 0.07 - t * 11) * 3 * s;
        ctx.lineTo(cx + x * s, yy);
      }
      ctx.lineTo(cx + 260 * s, bottom + 10);
      ctx.closePath();
      ctx.fillStyle = P.sky; ctx.fill();
      ctx.save(); ctx.clip();
      // water made of words
      if (words) {
        ctx.font = M.fontStr('JB', 600, 17 * s);
        ctx.fillStyle = rgba(P.navy, 0.55);
        for (let r = 0, yy = bottom - 12 * s; yy > yS - 20; r++, yy -= 22 * s) {
          const off = (r * 137) % 400;
          let str = '';
          for (let k = 0; k < 14; k++) str += words[(r * 5 + k * 3) % words.length] + ' ';
          ctx.fillText(str, cx - 240 * s - off * 0.3 + ((t * 20 * (r % 2 ? 1 : -1)) % 60), yy);
        }
      }
      ctx.fillStyle = rgba('#FFFFFF', 0.35);
      ctx.fillRect(cx - 260 * s, yS - 4, 520 * s, 10 * s);
      ctx.restore();
      ctx.restore();
    }
    // decoration bands
    ctx.save();
    ctx.beginPath(); jarBody(ctx, cx, top, s); ctx.clip();
    ctx.strokeStyle = rgba(P.cream, 0.85); ctx.lineWidth = 6 * s;
    for (const yy of [190, 212]) { ctx.beginPath(); ctx.ellipse(cx, top + yy * s, 230 * s, 26 * s, 0, 0, Math.PI); ctx.stroke(); }
    ctx.strokeStyle = rgba(P.ink, 0.8); ctx.lineWidth = 5 * s; ctx.lineJoin = 'miter';
    ctx.beginPath();
    for (let k = 0, x = -240; x <= 240; x += 20, k++) ctx.lineTo(cx + x * s, top + (k % 2 ? 250 : 272) * s + Math.abs(x) * 0.02 * s);
    ctx.stroke();
    // shading: dark right, highlight left
    const g = ctx.createLinearGradient(cx - 220 * s, 0, cx + 220 * s, 0);
    g.addColorStop(0, rgba('#FFFFFF', 0.16)); g.addColorStop(0.35, rgba('#FFFFFF', 0)); g.addColorStop(0.7, rgba('#000000', 0)); g.addColorStop(1, rgba('#000000', 0.28));
    ctx.fillStyle = g; ctx.fillRect(cx - 240 * s, top, 480 * s, 540 * s);
    ctx.restore();
    ctx.restore();
    // outline (drawn on)
    ctx.save();
    ctx.lineWidth = LW; ctx.strokeStyle = P.ink; ctx.lineJoin = 'round';
    ctx.setLineDash([2200 * s * Ease.inOutCubic(clamp(draw)), 99999]);
    ctx.beginPath(); jarBody(ctx, cx, top, s); ctx.stroke();
    ctx.restore();
  }
  function drop(ctx, x, y, r, col = P.sky) {
    ctx.beginPath();
    ctx.moveTo(x, y - r * 1.9);
    ctx.bezierCurveTo(x + r * 0.35, y - r * 1.1, x + r, y - r * 0.4, x + r, y + r * 0.1);
    ctx.arc(x, y + r * 0.1, r, 0, Math.PI);
    ctx.bezierCurveTo(x - r, y - r * 0.4, x - r * 0.35, y - r * 1.1, x, y - r * 1.9);
    ctx.closePath();
    ctx.fillStyle = col; ctx.fill();
    ctx.lineWidth = 5; ctx.strokeStyle = P.ink; ctx.stroke();
  }

  // Head in profile (faces right). Box (x, y, w=h*0.78, h)
  const HEAD = [[0.36, 1.0], [0.31, 0.84], [0.17, 0.66], [0.12, 0.45], [0.17, 0.24], [0.33, 0.08], [0.55, 0.03], [0.72, 0.1], [0.8, 0.24], [0.81, 0.36], [0.87, 0.47], [0.9, 0.53], [0.84, 0.57], [0.86, 0.62], [0.83, 0.655], [0.855, 0.69], [0.82, 0.73], [0.79, 0.8], [0.68, 0.84], [0.62, 0.86], [0.62, 1.0]];
  function headPath(ctx, x, y, h) {
    const w = h;
    const pts = HEAD.map(([u, v]) => [x + u * w, y + v * h]);
    smooth(ctx, pts, true, 0.9);
  }
  function magnifier(ctx, x, y, r, { lens = rgba(P.cream, 0.08), ring = P.ochre, ang = 0.8 } = {}) {
    ctx.save();
    ctx.lineCap = 'round';
    // handle
    const hx = x + Math.cos(ang) * r, hy = y + Math.sin(ang) * r;
    const ex = x + Math.cos(ang) * r * 2.1, ey = y + Math.sin(ang) * r * 2.1;
    ctx.strokeStyle = P.ink; ctx.lineWidth = r * 0.34;
    ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(ex, ey); ctx.stroke();
    ctx.strokeStyle = P.brick; ctx.lineWidth = r * 0.22;
    ctx.beginPath(); ctx.moveTo(hx + Math.cos(ang) * r * 0.25, hy + Math.sin(ang) * r * 0.25); ctx.lineTo(ex, ey); ctx.stroke();
    // lens
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fillStyle = lens; ctx.fill();
    ctx.lineWidth = r * 0.16; ctx.strokeStyle = P.ink; ctx.stroke();
    ctx.lineWidth = r * 0.08; ctx.strokeStyle = ring; ctx.stroke();
    ctx.strokeStyle = rgba('#FFFFFF', 0.5); ctx.lineWidth = r * 0.06;
    ctx.beginPath(); ctx.arc(x, y, r * 0.72, -2.6, -1.9); ctx.stroke();
    ctx.restore();
  }

  // Cat (sitting, facing right) — s: scale (1 → ~300 px tall)
  function cat(ctx, x, y, s, { col = P.ink, eye = P.yellow, tailWave = 0, blink = 0 } = {}) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.fillStyle = col;
    // tail
    ctx.strokeStyle = col; ctx.lineWidth = 26; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-70, 120); ctx.bezierCurveTo(-170, 120, -170 + tailWave * 30, 20, -120 + tailWave * 20, -30); ctx.stroke();
    // body
    ctx.beginPath(); ctx.ellipse(0, 70, 95, 110, 0, 0, TAU); ctx.fill();
    // head
    ctx.beginPath(); ctx.ellipse(30, -70, 78, 68, 0, 0, TAU); ctx.fill();
    // ears
    for (const m of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(30 + m * 62, -95); ctx.lineTo(30 + m * 58, -165); ctx.lineTo(30 + m * 12, -128); ctx.closePath(); ctx.fill();
    }
    // eyes
    ctx.fillStyle = eye;
    const eh = 16 * (1 - blink) + 1;
    for (const ex of [8, 62]) { ctx.beginPath(); ctx.ellipse(ex, -72, 11, eh, 0, 0, TAU); ctx.fill(); }
    if (blink < 0.5) {
      ctx.fillStyle = col;
      for (const ex of [8, 62]) { ctx.beginPath(); ctx.ellipse(ex + 2, -72, 3.5, eh * 0.8, 0, 0, TAU); ctx.fill(); }
    }
    // nose
    ctx.fillStyle = P.pink; ctx.beginPath(); ctx.moveTo(30, -50); ctx.lineTo(24, -58); ctx.lineTo(36, -58); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  function kitten(ctx, x, y, s, { col = P.cream, open = 0 } = {}) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    inked(ctx, () => {
      ctx.ellipse(0, 20, 52, 44, 0, 0, TAU);
    }, col, { sh: 6, lw: 7 });
    inked(ctx, () => {
      ctx.moveTo(-44, -2); ctx.lineTo(-40, -62); ctx.lineTo(-10, -26);
      ctx.lineTo(10, -26); ctx.lineTo(40, -62); ctx.lineTo(44, -2);
      ctx.bezierCurveTo(48, 40, -48, 40, -44, -2);
    }, col, { sh: 6, lw: 7 });
    ctx.strokeStyle = P.ink; ctx.lineWidth = 6; ctx.lineCap = 'round';
    if (open < 0.5) {
      for (const m of [-1, 1]) { ctx.beginPath(); ctx.arc(m * 18, 0, 9, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke(); }
    } else {
      ctx.fillStyle = P.ink;
      for (const m of [-1, 1]) { ctx.beginPath(); ctx.arc(m * 18, 2, 7, 0, TAU); ctx.fill(); }
    }
    ctx.fillStyle = P.pink; ctx.beginPath(); ctx.arc(0, 14, 5, 0, TAU); ctx.fill();
    ctx.restore();
  }

  // Tool tile icons
  function toolTile(ctx, x, y, s, kind, { bg = P.cream, glow = 0 } = {}) {
    ctx.save();
    ctx.translate(x, y);
    if (glow > 0) M.glowDot(ctx, 0, 0, s * 1.3, P.yellow, 0.7 * glow);
    inked(ctx, () => rr(ctx, -s / 2, -s / 2, s, s, s * 0.22), bg, { sh: 10 });
    ctx.strokeStyle = P.ink; ctx.fillStyle = P.ink; ctx.lineWidth = s * 0.06; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (kind === 'calc') {
      rr(ctx, -s * 0.28, -s * 0.33, s * 0.56, s * 0.66, s * 0.06); ctx.stroke();
      ctx.fillStyle = P.green; ctx.fillRect(-s * 0.2, -s * 0.25, s * 0.4, s * 0.13);
      ctx.fillStyle = P.ink;
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) ctx.fillRect(-s * 0.2 + c * s * 0.145, -s * 0.04 + r * s * 0.115, s * 0.1, s * 0.075);
    } else if (kind === 'web') {
      ctx.beginPath(); ctx.arc(0, 0, s * 0.3, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(0, 0, s * 0.13, s * 0.3, 0, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-s * 0.3, 0); ctx.lineTo(s * 0.3, 0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-s * 0.26, -s * 0.14); ctx.lineTo(s * 0.26, -s * 0.14); ctx.moveTo(-s * 0.26, s * 0.14); ctx.lineTo(s * 0.26, s * 0.14); ctx.stroke();
    } else if (kind === 'code') {
      text(ctx, '</>', 0, s * 0.13, { f: 'JB', w: 800, s: s * 0.4, color: P.ink, align: 'center' });
    } else if (kind === 'ai') {
      ctx.fillStyle = P.ink;
      const star = (cx, cy, r) => {
        ctx.beginPath();
        for (let k = 0; k < 8; k++) {
          const a = (k * TAU) / 8 - Math.PI / 2, rad = k % 2 ? r * 0.28 : r;
          k ? ctx.lineTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad) : ctx.moveTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad);
        }
        ctx.closePath(); ctx.fill();
      };
      star(-s * 0.06, s * 0.04, s * 0.26);
      star(s * 0.22, -s * 0.2, s * 0.1);
    }
    ctx.restore();
  }

  // Maltese townhouse with a gallarija. (x = left, yb = ground line). col = gallarija colour.
  function house(ctx, x, yb, w, h, { gal = P.wood, door = P.slate, paint = 1, pot = 0, draw = 1 } = {}) {
    ctx.save();
    ctx.globalAlpha *= clamp(draw * 1.5);
    const y = yb - h;
    // façade
    inked(ctx, () => ctx.rect(x, y, w, h), P.stone, { sh: 0, lw: 7 });
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.strokeStyle = rgba(P.stoneD, 0.8); ctx.lineWidth = 2;
    for (let r = 0, yy = y + 38; yy < yb; yy += 38, r++) {
      ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x + w, yy); ctx.stroke();
      for (let xx = x + (r % 2 ? 40 : 0); xx < x + w; xx += 80) { ctx.beginPath(); ctx.moveTo(xx, yy - 38); ctx.lineTo(xx, yy); ctx.stroke(); }
    }
    ctx.restore();
    // cornice
    inked(ctx, () => ctx.rect(x - 14, y - 26, w + 28, 30), P.stoneD, { sh: 6, lw: 6 });
    // door (arched)
    const dw = w * 0.34, dh = h * 0.33, dx = x + w * 0.58, dy = yb - dh;
    inked(ctx, () => { ctx.moveTo(dx, yb); ctx.lineTo(dx, dy + dw / 2); ctx.arc(dx + dw / 2, dy + dw / 2, dw / 2, Math.PI, 0); ctx.lineTo(dx + dw, yb); ctx.closePath(); }, door, { sh: 0, lw: 6 });
    ctx.fillStyle = P.ochre; ctx.beginPath(); ctx.arc(dx + dw * 0.78, yb - dh * 0.42, 6, 0, TAU); ctx.fill();
    // ground-floor window + pot
    const wx = x + w * 0.1, wy = yb - h * 0.3, ww = w * 0.34, wh = h * 0.16;
    inked(ctx, () => ctx.rect(wx, wy, ww, wh), P.navy, { sh: 0, lw: 6 });
    inked(ctx, () => ctx.rect(wx - 10, wy + wh, ww + 20, 14), P.stoneD, { sh: 0, lw: 5 });
    if (pot > 0) {
      const ps = spring(pot, 3, 0.45);
      ctx.save(); ctx.translate(wx + ww / 2, wy + wh); ctx.scale(ps, ps);
      inked(ctx, () => { ctx.moveTo(-34, 0); ctx.lineTo(-26, -40); ctx.lineTo(26, -40); ctx.lineTo(34, 0); ctx.closePath(); }, P.terra, { sh: 0, lw: 5 });
      for (let k = 0; k < 5; k++) {
        const a = -Math.PI / 2 + (k - 2) * 0.45;
        ctx.fillStyle = P.greenD; ctx.beginPath(); ctx.ellipse(Math.cos(a) * 30, -40 + Math.sin(a) * 30, 16, 9, a, 0, TAU); ctx.fill();
        ctx.fillStyle = P.red; ctx.beginPath(); ctx.arc(Math.cos(a) * 44, -40 + Math.sin(a) * 44, 11, 0, TAU); ctx.fill();
      }
      ctx.restore();
    }
    // gallarija (enclosed timber balcony)
    const gw = w * 0.78, gh = h * 0.34, gx = x + (w - gw) / 2, gy = y + h * 0.13;
    const gcol = mix(P.wood, gal, paint);
    inked(ctx, () => ctx.rect(gx - 16, gy + gh, gw + 32, 22), P.stoneD, { sh: 6, lw: 6 });
    for (let k = 0; k < 3; k++) inked(ctx, () => { const cx = gx + gw * (0.12 + k * 0.38); ctx.moveTo(cx, gy + gh + 22); ctx.lineTo(cx + 14, gy + gh + 60); ctx.lineTo(cx + 28, gy + gh + 22); ctx.closePath(); }, P.stoneD, { sh: 0, lw: 5 });
    inked(ctx, () => ctx.rect(gx, gy, gw, gh), gcol, { sh: 10, lw: 7 });
    ctx.fillStyle = mix(P.navy, P.sky, 0.25);
    const cols = 4;
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < 2; r++) {
        const pw = gw / cols, px = gx + c * pw + 10, py = gy + 12 + r * (gh * 0.3), ph = gh * 0.26;
        ctx.fillRect(px, py, pw - 20, ph);
      }
      const pw = gw / cols;
      ctx.strokeStyle = rgba(P.ink, 0.6); ctx.lineWidth = 3;
      for (let k = 0; k < 4; k++) { const ly = gy + gh * 0.66 + k * gh * 0.08; ctx.beginPath(); ctx.moveTo(gx + c * pw + 10, ly); ctx.lineTo(gx + (c + 1) * pw - 10, ly); ctx.stroke(); }
    }
    ctx.strokeStyle = P.ink; ctx.lineWidth = 5;
    for (let c = 1; c < cols; c++) { ctx.beginPath(); ctx.moveTo(gx + (c * gw) / cols, gy); ctx.lineTo(gx + (c * gw) / cols, gy + gh); ctx.stroke(); }
    inked(ctx, () => ctx.rect(gx - 10, gy - 18, gw + 20, 20), mix(P.wood, gal, paint * 0.8), { sh: 0, lw: 5 });
    ctx.restore();
  }

  // Church dome (Mosta-like): drum + ribbed dome + lantern. s: scale (1 → ~360 px tall)
  function dome(ctx, x, yb, s, { col = P.stone, alpha = 1 } = {}) {
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.translate(x, yb);
    ctx.scale(s, s);
    inked(ctx, () => ctx.rect(-150, -110, 300, 110), col, { sh: 8, lw: 7 });
    ctx.fillStyle = P.ink;
    for (let k = -2; k <= 2; k++) { rr(ctx, k * 56 - 12, -90, 24, 60, 12); ctx.fill(); }
    inked(ctx, () => ctx.rect(-162, -124, 324, 16), P.stoneD, { sh: 0, lw: 6 });
    inked(ctx, () => { ctx.moveTo(-140, -124); ctx.bezierCurveTo(-140, -300, 140, -300, 140, -124); ctx.closePath(); }, col, { sh: 8, lw: 7 });
    ctx.strokeStyle = rgba(P.ink, 0.7); ctx.lineWidth = 4;
    for (const k of [-0.6, -0.25, 0.25, 0.6]) { ctx.beginPath(); ctx.moveTo(k * 140, -124); ctx.quadraticCurveTo(k * 90, -250, 0, -262); ctx.stroke(); }
    inked(ctx, () => ctx.rect(-28, -318, 56, 58), col, { sh: 0, lw: 6 });
    inked(ctx, () => { ctx.moveTo(-34, -318); ctx.quadraticCurveTo(0, -370, 34, -318); ctx.closePath(); }, col, { sh: 0, lw: 6 });
    ctx.restore();
  }

  // speech bubble (tail at bottom-left)
  function bubble(ctx, x, y, w, h, { fill = P.cream, tail = 'bl', sh = 10, shadow = P.ink } = {}) {
    inked(ctx, () => {
      rr(ctx, x, y, w, h, 34);
      if (tail === 'bl') { ctx.moveTo(x + 70, y + h - 2); ctx.lineTo(x + 50, y + h + 46); ctx.lineTo(x + 120, y + h - 2); }
      else if (tail === 'br') { ctx.moveTo(x + w - 120, y + h - 2); ctx.lineTo(x + w - 50, y + h + 46); ctx.lineTo(x + w - 70, y + h - 2); }
    }, fill, { sh, shadow });
  }

  // nanna's glasses: two round lenses, bridge, temples, beaded chain. reflections show scrolling code.
  function glasses(ctx, cx, cy, s, { t = 0, glint = 0, frame = P.ochre, code = true, chain = 1 } = {}) {
    const r = 118 * s, dx = 142 * s;
    ctx.save();
    // chain (catenary of beads)
    if (chain > 0) {
      for (let k = 0; k <= 36; k++) {
        const u = k / 36;
        const x = lerp(cx - dx - r * 1.05, cx + dx + r * 1.05, u);
        const y = cy + 10 * s + Math.sin(u * Math.PI) * 190 * s * chain;
        ctx.beginPath(); ctx.arc(x, y, (k % 3 ? 5 : 8) * s, 0, TAU);
        ctx.fillStyle = k % 3 ? P.ochre : P.red; ctx.fill();
      }
    }
    for (const m of [-1, 1]) {
      const x = cx + m * dx;
      ctx.save();
      ctx.beginPath(); ctx.arc(x, cy, r, 0, TAU);
      ctx.fillStyle = rgba(P.sky, 0.12); ctx.fill();
      ctx.clip();
      if (code) {
        ctx.font = M.fontStr('JB', 600, 19 * s);
        ctx.fillStyle = rgba(P.green, 0.75);
        const rows = ['def nanna(qawl):', '  return tifsira', 'for kelma in kliem:', '  tagħlim += 1', 'if għaġġla: iżball', 'print("saħħa!")', 'x = ħobż + żejt', 'mudell.jitgħallem()'];
        for (let i = 0; i < 12; i++) {
          const yy = cy - r + ((i * 30 * s + t * 60 * s) % (r * 2 + 40)) - 10;
          ctx.fillText(rows[(i + (m > 0 ? 3 : 0)) % rows.length], x - r * 0.85, yy);
        }
      }
      // reflections
      ctx.strokeStyle = rgba('#FFFFFF', 0.5); ctx.lineWidth = 12 * s;
      ctx.beginPath(); ctx.moveTo(x - r * 0.5, cy - r * 0.9); ctx.lineTo(x - r * 1.1, cy - r * 0.2); ctx.stroke();
      if (glint > 0) {
        const gx = lerp(x - r * 1.6, x + r * 1.6, glint);
        const gr = ctx.createLinearGradient(gx - 60 * s, 0, gx + 60 * s, 0);
        gr.addColorStop(0, rgba('#FFFFFF', 0)); gr.addColorStop(0.5, rgba('#FFFFFF', 0.7)); gr.addColorStop(1, rgba('#FFFFFF', 0));
        ctx.fillStyle = gr; ctx.fillRect(x - r, cy - r, r * 2, r * 2);
      }
      ctx.restore();
      ctx.lineWidth = 16 * s; ctx.strokeStyle = P.ink;
      ctx.beginPath(); ctx.arc(x, cy, r, 0, TAU); ctx.stroke();
      ctx.lineWidth = 8 * s; ctx.strokeStyle = frame;
      ctx.beginPath(); ctx.arc(x, cy, r, 0, TAU); ctx.stroke();
    }
    // bridge + temples
    ctx.lineCap = 'round';
    for (const [lw, col] of [[16 * s, P.ink], [8 * s, frame]]) {
      ctx.lineWidth = lw; ctx.strokeStyle = col;
      ctx.beginPath(); ctx.moveTo(cx - dx + r * 0.92, cy - r * 0.25); ctx.quadraticCurveTo(cx, cy - r * 0.62, cx + dx - r * 0.92, cy - r * 0.25); ctx.stroke();
      for (const m of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + m * (dx + r), cy - r * 0.2); ctx.lineTo(cx + m * (dx + r * 1.32), cy - r * 0.42); ctx.stroke(); }
    }
    ctx.restore();
  }

  // bizzilla (Maltese lace) doily — radial rings of scallops, spokes and picots
  function lace(ctx, cx, cy, R, { t = 0, alpha = 0.3, col = P.cream } = {}) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(t * 0.08);
    ctx.globalAlpha *= alpha;
    ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 2.5;
    const rings = [0.28, 0.46, 0.64, 0.82, 1.0];
    rings.forEach((f, i) => {
      const r = R * f, n = 12 + i * 8;
      ctx.beginPath();
      for (let k = 0; k <= n; k++) {
        const a0 = (k / n) * TAU, a1 = ((k + 0.5) / n) * TAU, a2 = ((k + 1) / n) * TAU;
        const bump = r + R * 0.035;
        if (k === 0) ctx.moveTo(Math.cos(a0) * r, Math.sin(a0) * r);
        ctx.quadraticCurveTo(Math.cos(a1) * bump * 1.02, Math.sin(a1) * bump * 1.02, Math.cos(a2) * r, Math.sin(a2) * r);
      }
      ctx.stroke();
      for (let k = 0; k < n; k++) {
        const a = ((k + 0.5) / n) * TAU;
        ctx.beginPath(); ctx.arc(Math.cos(a) * (r + R * 0.05), Math.sin(a) * (r + R * 0.05), 3.2, 0, TAU); ctx.stroke();
      }
      if (i > 0) {
        const rp = R * rings[i - 1], m = 12 + (i - 1) * 8;
        for (let k = 0; k < m; k++) {
          const a = (k / m) * TAU;
          ctx.beginPath(); ctx.moveTo(Math.cos(a) * (rp + R * 0.05), Math.sin(a) * (rp + R * 0.05));
          ctx.quadraticCurveTo(Math.cos(a + 0.08) * (rp + r) * 0.52, Math.sin(a + 0.08) * (rp + r) * 0.52, Math.cos(a) * r, Math.sin(a) * r);
          ctx.stroke();
        }
      }
    });
    ctx.beginPath(); ctx.arc(0, 0, R * 0.12, 0, TAU); ctx.stroke();
    for (let k = 0; k < 8; k++) { const a = (k / 8) * TAU; ctx.beginPath(); ctx.ellipse(Math.cos(a) * R * 0.17, Math.sin(a) * R * 0.17, R * 0.07, R * 0.03, a, 0, TAU); ctx.stroke(); }
    ctx.restore();
  }

  // lace-style network (nodes + curved threads + picots) inside a region
  function network(seed, n, fnPoint) {
    const pts = [];
    for (let i = 0; i < n; i++) pts.push(fnPoint(i, seed));
    const edges = [];
    for (let i = 0; i < n; i++) {
      const d = pts.map((q, j) => [Math.hypot(q[0] - pts[i][0], q[1] - pts[i][1]), j]).sort((a, b) => a[0] - b[0]);
      for (let k = 1; k <= 3; k++) if (d[k] && i < d[k][1]) edges.push([i, d[k][1]]);
    }
    return { pts, edges };
  }
  function drawNetwork(ctx, net, { col = P.sky, alpha = 1, t = 0, grow = 1, node = 5 } = {}) {
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.strokeStyle = col; ctx.lineWidth = 2.2;
    net.edges.forEach(([a, b], k) => {
      const g = clamp(grow * 1.4 - (k / net.edges.length) * 0.4);
      if (g <= 0) return;
      const A = net.pts[a], B = net.pts[b];
      const mx = (A[0] + B[0]) / 2 + (B[1] - A[1]) * 0.12, my = (A[1] + B[1]) / 2 - (B[0] - A[0]) * 0.12;
      ctx.beginPath(); ctx.moveTo(A[0], A[1]);
      ctx.quadraticCurveTo(lerp(A[0], mx, g), lerp(A[1], my, g), lerp(A[0], B[0], g), lerp(A[1], B[1], g));
      ctx.stroke();
    });
    net.pts.forEach((q, i) => {
      const g = clamp(grow * 1.5 - (i / net.pts.length) * 0.5);
      if (g <= 0) return;
      const pulse = 0.5 + 0.5 * Math.sin(t * 5 + i * 1.7);
      ctx.beginPath(); ctx.arc(q[0], q[1], node * g * (0.8 + 0.4 * pulse), 0, TAU); ctx.stroke();
    });
    ctx.restore();
  }

  function stamp(ctx, x, y, str, lt, at, { col = P.red, rot = -0.12, s = 96 } = {}) {
    const k = lt - at;
    if (k < 0) return;
    const sc = k < 0.12 ? lerp(2.4, 1, Ease.outCubic(k / 0.12)) : 1;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.scale(sc, sc);
    ctx.globalAlpha *= clamp(k / 0.06);
    const w = M.textWidth(ctx, str, 'A', 900, s, 90) + 64, h = s * 1.1;
    ctx.strokeStyle = col; ctx.lineWidth = 12;
    rr(ctx, -w / 2, -h / 2, w, h, 16); ctx.stroke();
    text(ctx, str, 0, s * 0.36, { f: 'A', w: 900, s, wd: 90, color: col, align: 'center' });
    // grunge holes
    ctx.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 70; i++) { ctx.beginPath(); ctx.arc(rndr(i, 7, -w / 2, w / 2), rndr(i, 8, -h / 2, h / 2), rndr(i, 9, 1, 5), 0, TAU); ctx.fill(); }
    ctx.restore();
  }

  G.K = { P, XL, XW, LW, rr, smooth, inked, tick, cross, drawTile, tileImg, floor, band, tilePattern, tileFlip, proverb, kicker, line, lineFit, label, jar, drop, headPath, magnifier, cat, kitten, toolTile, house, dome, bubble, glasses, lace, network, drawNetwork, stamp };
})(window);

// S11 — LATEST (52–56s): "U ILLUM?" → reasoning models think step by step (search tree prunes to one path)
//        → "U jużaw l-għodod." (tools) → "…anke biex jagħmlu filmati bħal dan." → Droste phone → infinite zoom
(function (G) {
  const { W, H, C, TAU, clamp, lerp, prog, Ease, rgba, mix, noise1, rnd, rndr, fitSize, layout, drawGlyphs, shake, spring, text, kf, buf } = M;
  const XL = 72, XW = W - 144;

  // reasoning tree: level 0 root at bottom, 4 levels up; chosen path indices
  const LEVELS = 4, ROOT = [540, 1400], DY = 150;
  const CHOSEN = [0, 1, 0, 1, 1]; // child index choices per level (binary)
  function nodePos(level, idx) {
    const n = Math.pow(2, level);
    const span = Math.min(490, 140 + level * 100);
    const x = ROOT[0] + (n === 1 ? 0 : (idx / (n - 1) - 0.5) * span * 2);
    return [x, ROOT[1] - level * DY];
  }
  function onPath(level, idx) {
    let i = 0;
    for (let l = 1; l <= level; l++) i = i * 2 + CHOSEN[l];
    return i === idx;
  }

  function tools(ctx, lt, phone) {
    const items = [
      ['tfittxija', C.yellow, (x, y, s) => { ctx.lineWidth = s * 0.14; ctx.strokeStyle = C.ink; M.circle(ctx, x - s * 0.08, y - s * 0.08, s * 0.3); ctx.stroke(); ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x + s * 0.14, y + s * 0.14); ctx.lineTo(x + s * 0.38, y + s * 0.38); ctx.stroke(); }],
      ['kodiċi', C.sky, (x, y, s) => text(ctx, '</>', x, y + s * 0.18, { f: 'JB', w: 800, s: s * 0.56, color: C.ink, align: 'center' })],
      ['kalkoli', C.green, (x, y, s) => { ctx.fillStyle = C.ink; M.rrect(ctx, x - s * 0.3, y - s * 0.4, s * 0.6, s * 0.8, s * 0.08); ctx.fill(); ctx.fillStyle = C.green; ctx.fillRect(x - s * 0.22, y - s * 0.32, s * 0.44, s * 0.16); for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) ctx.fillRect(x - s * 0.22 + c * s * 0.16, y - s * 0.08 + r * s * 0.14, s * 0.1, s * 0.09); }],
      ['filmati', C.red, (x, y, s) => { ctx.fillStyle = C.paper; ctx.beginPath(); ctx.moveTo(x - s * 0.18, y - s * 0.28); ctx.lineTo(x + s * 0.3, y); ctx.lineTo(x - s * 0.18, y + s * 0.28); ctx.fill(); }],
    ];
    const S = 190, gap = 38, total = 4 * S + 3 * gap, x0 = W / 2 - total / 2 + S / 2, y = 1020;
    items.forEach(([label, col, icon], i) => {
      const p = spring(lt - 2.0 - i * 0.15, 3.0, 0.42);
      if (p <= 0) return;
      const x = x0 + i * (S + gap);
      if (i === 3 && phone > 0) return; // the play tile becomes the phone
      const fade = 1 - (i === 3 ? 0 : prog(lt, 3.0, 3.25));
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.translate(x, y);
      ctx.scale(p, p);
      ctx.fillStyle = col;
      M.rrect(ctx, -S / 2, -S / 2, S, S, 44);
      ctx.fill();
      icon(0, 0, S);
      ctx.restore();
      text(ctx, label, x, y + S / 2 + 56, { f: 'JB', w: 700, s: 30, color: C.paper, align: 'center', alpha: clamp(p) * fade });
    });
    return { x: x0 + 3 * (S + gap), y, S };
  }

  addScene({
    name: 'latest',
    push: false,
    t0: TL.S.latest[0],
    t1: TL.S.latest[1],
    draw(ctx, lt, t) {
      // phone geometry (animated from the play tile)
      const ph = Ease.inOutCubic(prog(lt, 3.0, 3.45));
      const zoom = Ease.inExpo(prog(lt, 3.45, 3.97));
      const sx = W / 2, sy = 960; // phone centre when grown
      const pw = lerp(190, 560, ph), phh = lerp(190, (560 - 44) * 16 / 9 + 44, ph);
      const tileX = W / 2 - (4 * 190 + 3 * 38) / 2 + 190 / 2 + 3 * (190 + 38);
      const pcx = lerp(tileX, sx, ph), pcy = lerp(1020, sy, ph);
      const scr = { x: pcx - pw / 2 + 22 * ph, y: pcy - phh / 2 + 22 * ph, w: pw - 44 * ph, h: phh - 44 * ph };
      // zoom: scale around the screen centre until the screen fills the frame
      const zTarget = Math.max(W / Math.max(1, scr.w), H / Math.max(1, scr.h));
      const Z = Math.exp(Math.log(zTarget) * zoom);
      const applyZ = () => {
        ctx.translate(W / 2, H / 2);
        ctx.scale(Z, Z);
        ctx.translate(-(scr.x + scr.w / 2), -(scr.y + scr.h / 2));
      };

      ctx.save();
      if (zoom > 0) applyZ();
      // background
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#0A1030');
      g.addColorStop(1, C.ink);
      ctx.fillStyle = g;
      ctx.fillRect(-W, -H, W * 3, H * 3);
      L.bgDots(ctx, t, { alpha: 0.06 });

      // U ILLUM?
      const q = lt;
      if (q < 0.62) {
        const s = fitSize(ctx, 'U ILLUM?', XW, 'A', 900, 118);
        const slam = Ease.outExpo(prog(q, 0, 0.2));
        const out = Ease.inQuart(prog(q, 0.45, 0.6));
        ctx.save();
        ctx.translate(W / 2, 960);
        ctx.scale(lerp(1.4, 1, slam), lerp(1.4, 1, slam));
        text(ctx, 'U ILLUM?', -W / 2 + XL, s * 0.36 - out * 300, { f: 'A', w: 900, s, wd: 118, color: C.paper, alpha: 1 - out });
        ctx.restore();
      }
      // headline block
      const h1 = lt >= 0.5 && lt < 2.0;
      if (h1) {
        const out = Ease.inQuart(prog(lt, 1.84, 1.98));
        const lines = [['L-aqwa mudelli', 'A', C.paper, 0.5], ['jaħsbu pass pass', 'A', C.yellow, 0.62], ['qabel iwieġbu.', 'IS', C.paper, 0.74]];
        lines.forEach(([str, f, col, at], i) => {
          const p = Ease.snap(prog(lt, at, at + 0.3));
          text(ctx, str, XL, 440 + i * 100 + (1 - p) * 50 - out * 60, f === 'A' ? { f: 'A', w: 900, s: 92, wd: 84, color: col, alpha: p * (1 - out) } : { f: 'IS', s: 96, color: col, alpha: p * (1 - out) });
        });
      }
      // reasoning tree
      const tr = lt - 0.6;
      if (tr > 0 && lt < 2.1) {
        const out = Ease.inQuart(prog(lt, 1.86, 2.04));
        ctx.save();
        ctx.globalAlpha = 1 - out;
        for (let l = 1; l <= LEVELS; l++) {
          const n = Math.pow(2, l);
          for (let i = 0; i < n; i++) {
            const [x, y] = nodePos(l, i);
            const [px, py] = nodePos(l - 1, Math.floor(i / 2));
            const at = (l - 1) * 0.22 + (i % 2) * 0.05;
            const p = Ease.outCubic(clamp((tr - at) / 0.22));
            if (p <= 0) continue;
            const chosen = onPath(l, i);
            const pruned = !chosen && tr > at + 0.35 + rnd(l * 10 + i, 3) * 0.2;
            const col = chosen && tr > LEVELS * 0.22 + 0.1 ? C.yellow : pruned ? rgba(C.red, 0.5) : rgba(C.paper, 0.7);
            ctx.strokeStyle = col;
            ctx.lineWidth = chosen && tr > LEVELS * 0.22 + 0.1 ? 8 : 4;
            ctx.beginPath();
            ctx.moveTo(px, py);
            const ex = lerp(px, x, p), ey = lerp(py, y, p);
            ctx.bezierCurveTo(px, lerp(py, ey, 0.6), ex, lerp(py, ey, 0.4), ex, ey);
            ctx.stroke();
            if (p >= 1) {
              const leaf = l === LEVELS;
              const r = leaf && chosen ? 44 : 22;
              ctx.fillStyle = leaf && chosen && tr > LEVELS * 0.22 + 0.1 ? C.green : pruned ? C.ink2 : C.ink2;
              M.circle(ctx, x, y, r);
              ctx.fill();
              ctx.strokeStyle = col;
              ctx.lineWidth = 4;
              ctx.stroke();
              if (pruned) { ctx.strokeStyle = rgba(C.red, 0.8); ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x - 9, y - 9); ctx.lineTo(x + 9, y + 9); ctx.moveTo(x + 9, y - 9); ctx.lineTo(x - 9, y + 9); ctx.stroke(); }
              if (leaf && chosen && tr > LEVELS * 0.22 + 0.1) {
                ctx.strokeStyle = C.ink; ctx.lineWidth = 8; ctx.lineCap = 'round';
                ctx.beginPath(); ctx.moveTo(x - 18, y); ctx.lineTo(x - 5, y + 14); ctx.lineTo(x + 20, y - 14); ctx.stroke();
                text(ctx, 'tweġiba', x + 60, y + 10, { f: 'JB', w: 700, s: 30, color: C.green });
              }
            }
          }
        }
        // root
        M.circle(ctx, ROOT[0], ROOT[1], 40);
        ctx.fillStyle = C.paper;
        ctx.fill();
        text(ctx, '?', ROOT[0], ROOT[1] + 22, { f: 'A', w: 900, s: 62, color: C.ink, align: 'center' });
        text(ctx, 'mistoqsija', ROOT[0] + 60, ROOT[1] + 12, { f: 'JB', w: 700, s: 28, color: C.paper, alpha: 0.7 });
        // thinking ticker
        const dots = '.'.repeat(1 + (Math.floor(lt * 6) % 3));
        text(ctx, `qed naħseb${dots}`, XL, 790, { f: 'JB', w: 600, s: 30, color: C.grey, alpha: clamp(tr * 3) });
        ctx.restore();
      }
      // tools
      const tl = lt >= 1.95;
      if (tl) {
        const hp = Ease.snap(prog(lt, 2.0, 2.25));
        const out = Ease.inQuart(prog(lt, 2.92, 3.06));
        text(ctx, 'U JUŻAW', XL, 520 + (1 - hp) * 60 - out * 60, { f: 'A', w: 900, s: 110, wd: 96, color: C.paper, alpha: hp * (1 - out) });
        text(ctx, "L-GĦODOD.", XL, 640 + (1 - hp) * 80 - out * 60, { f: 'A', w: 900, s: 110, wd: 96, color: C.yellow, alpha: hp * (1 - out) });
        tools(ctx, lt, ph);
      }
      // phone body (screen content drawn afterwards via Droste)
      if (ph > 0) {
        ctx.fillStyle = '#111';
        M.rrect(ctx, pcx - pw / 2, pcy - phh / 2, pw, phh, lerp(44, 70, ph));
        ctx.fill();
        ctx.strokeStyle = rgba(C.paper, 0.5);
        ctx.lineWidth = 4;
        ctx.stroke();
        ctx.fillStyle = C.red;
        M.rrect(ctx, scr.x, scr.y, scr.w, scr.h, lerp(34, 50, ph));
        ctx.fill();
      }
      // caption
      const cp = Ease.snap(prog(lt, 3.06, 3.34));
      if (cp > 0) {
        text(ctx, '…anke biex jagħmlu', XL, 360 + (1 - cp) * 30, { f: 'IS', s: 70, color: C.paper, alpha: cp });
        text(ctx, 'filmati bħal dan.', XL, 435 + (1 - cp) * 30, { f: 'IS', s: 70, color: C.yellow, alpha: cp });
      }
      ctx.restore();

      // Droste: paint the frame into its own phone screen, recursively
      if (ph > 0.05) {
        const b = buf('droste');
        for (let k = 0; k < 4; k++) {
          b.x.clearRect(0, 0, W, H);
          b.x.drawImage(ctx.canvas, 0, 0);
          ctx.save();
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          if (zoom > 0) applyZ();
          ctx.beginPath();
          M.rrect(ctx, scr.x, scr.y, scr.w, scr.h, lerp(34, 50, ph));
          ctx.clip();
          ctx.globalAlpha = clamp(ph * 2);
          ctx.drawImage(b.c, scr.x, scr.y, scr.w, scr.h);
          ctx.restore();
        }
      }
      // fade to black for the finale
      const fb = prog(lt, 3.8, 3.98);
      if (fb > 0) {
        ctx.fillStyle = rgba('#000000', fb);
        ctx.fillRect(0, 0, W, H);
      }
    },
    fx(fx, lt) {
      fx.bloom = 0.28;
      fx.bloomThr = 0.6;
      fx.vig = 0.45;
      const z = prog(lt, 3.45, 3.97);
      fx.ca += z * 1.2;
      fx.warp = z * 0.2;
    },
    mb(lt) {
      if (lt < 0.3) return 6;
      if (lt > 2.9) return 6;
      return 4;
    },
  });
})(window);

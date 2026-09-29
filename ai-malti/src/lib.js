// lib.js — shared design elements used across scenes
(function (G) {
  const { W, H, C, TAU, clamp, lerp, prog, Ease, rgba, mix, noise1, rnd, text, fontStr, layout } = M;

  // Subtle drifting dot grid for dark backgrounds
  function bgDots(ctx, t, { alpha = 0.09, gap = 54, color = C.paper, drift = 12, r = 2.2 } = {}) {
    ctx.save();
    ctx.fillStyle = rgba(color, alpha);
    const ox = (t * drift) % gap, oy = (t * drift * 0.6) % gap;
    for (let y = -gap + oy; y < H + gap; y += gap) {
      for (let x = -gap + ox; x < W + gap; x += gap) {
        ctx.fillRect(x - r / 2, y - r / 2, r, r);
      }
    }
    ctx.restore();
  }

  // Full-bleed radial glow backdrop
  function bgGlow(ctx, x, y, r, col, a) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rgba(col, a));
    g.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  // Simplified George Cross emblem (flag canton)
  function georgeCross(ctx, x, y, s) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s / 100, s / 100);
    ctx.fillStyle = '#C9CBD0';
    ctx.strokeStyle = C.red;
    ctx.lineWidth = 6;
    const a = 18, b = 50;
    ctx.beginPath();
    ctx.moveTo(-a, -b); ctx.lineTo(a, -b); ctx.lineTo(a, -a); ctx.lineTo(b, -a); ctx.lineTo(b, a); ctx.lineTo(a, a);
    ctx.lineTo(a, b); ctx.lineTo(-a, b); ctx.lineTo(-a, a); ctx.lineTo(-b, a); ctx.lineTo(-b, -a); ctx.lineTo(-a, -a);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, 13, 0, TAU);
    ctx.fillStyle = '#AEB1B8';
    ctx.fill();
    ctx.restore();
  }

  // Blinking block cursor
  function cursor(ctx, x, y, h, t, col = C.paper, w = null) {
    const on = Math.floor(t * 3) % 2 === 0;
    if (!on) return;
    ctx.fillStyle = col;
    ctx.fillRect(x, y - h, w || h * 0.5, h);
  }

  // Typewriter: returns visible substring for time since start
  function typed(str, lt, cps) {
    const chars = Array.from(str);
    const n = clamp(Math.floor(lt * cps), 0, chars.length);
    return chars.slice(0, n).join('');
  }

  // Masked line reveal: text rises from behind a baseline mask
  function riseText(ctx, str, x, y, lt, opt = {}) {
    const { dur = 0.45, stagger = 0.025, dist = 1.0, ease = Ease.snap, align = 'left', out = null } = opt;
    const s = opt.s || 100;
    const L = layout(ctx, str, opt.f || 'A', opt.w || 800, s, opt.wd || 100, opt.track || 0);
    let ox = x;
    if (align === 'center') ox = x - L.width / 2;
    else if (align === 'right') ox = x - L.width;
    ctx.save();
    ctx.beginPath();
    ctx.rect(ox - s, y - s * 1.05, L.width + s * 2, s * 1.35);
    ctx.clip();
    M.drawGlyphs(ctx, str, ox, y, { ...opt, align: 'left' }, (i, g, n) => {
      const p = ease(clamp((lt - i * stagger) / dur));
      let dy = (1 - p) * s * 1.1 * dist;
      if (out) {
        const po = Ease.inQuart(clamp((lt - out - i * stagger * 0.6) / (dur * 0.7)));
        dy -= po * s * 1.1;
      }
      return { dy, color: opt.colorFn ? opt.colorFn(i, g, n) : undefined };
    });
    ctx.restore();
    return L;
  }

  // Rounded pill / chip
  function chip(ctx, x, y, w, h, fill, r) {
    M.rrect(ctx, x, y, w, h, r == null ? h / 2 : r);
    ctx.fillStyle = fill;
    ctx.fill();
  }

  // Luzzu eye (Eye of Osiris) — the recurring "attention" icon.
  // open: 0..1 eyelid aperture, look: [-1..1] pupil offset, s: scale (eye width ≈ 2s)
  function luzzuEye(ctx, x, y, s, open, look = [0, 0], opt = {}) {
    const { stroke = C.yellow, iris = C.red, pupil = C.ink, lw = 10, draw = 1, glow = 0 } = opt;
    ctx.save();
    ctx.translate(x, y);
    const o = clamp(open, 0.02, 1);
    // almond shape
    const w = s, hgt = s * 0.52 * o;
    const almond = () => {
      ctx.beginPath();
      ctx.moveTo(-w, 0);
      ctx.bezierCurveTo(-w * 0.5, -hgt * 1.25, w * 0.45, -hgt * 1.25, w * 1.05, -hgt * 0.1);
      ctx.bezierCurveTo(w * 0.55, hgt * 1.15, -w * 0.45, hgt * 1.15, -w, 0);
      ctx.closePath();
    };
    // white of the eye
    almond();
    ctx.fillStyle = opt.white || C.paper;
    ctx.globalAlpha = clamp(draw * 1.5 - 0.5);
    ctx.fill();
    ctx.globalAlpha = 1;
    // iris + pupil clipped by almond
    ctx.save();
    almond();
    ctx.clip();
    const px = look[0] * s * 0.28, py = look[1] * s * 0.12;
    ctx.beginPath();
    ctx.arc(px, py, s * 0.36, 0, TAU);
    ctx.fillStyle = iris;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(px, py, s * 0.17, 0, TAU);
    ctx.fillStyle = pupil;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(px + s * 0.08, py - s * 0.08, s * 0.05, 0, TAU);
    ctx.fillStyle = rgba(C.paper, 0.9);
    ctx.fill();
    ctx.restore();
    // outline (drawn on)
    ctx.lineWidth = lw;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = stroke;
    ctx.setLineDash([s * 6 * draw, s * 8]);
    almond();
    ctx.stroke();
    // eyebrow + tail — the classic luzzu flourish
    ctx.beginPath();
    ctx.moveTo(-w * 1.05, -s * 0.72);
    ctx.bezierCurveTo(-w * 0.4, -s * 1.02, w * 0.5, -s * 0.95, w * 1.1, -s * 0.55);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(w * 0.2, hgt * 0.9 + s * 0.05);
    ctx.bezierCurveTo(w * 0.3, s * 0.75, w * 0.9, s * 0.8, w * 1.2, s * 0.62);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  G.L = { bgDots, bgGlow, georgeCross, cursor, typed, riseText, chip, luzzuEye };
})(window);

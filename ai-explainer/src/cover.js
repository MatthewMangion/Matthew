/* Cover / thumbnail composition (9:16, key content inside the 3:4 grid-safe crop). */
(function () {
  'use strict';
  const { W, H, C, TAU, rr, layout, drawText, text, drawBot, confetti, sparkle, starPath, paper, grain, vignette, setFont, STY, circle } = M;

  window.renderCover = function (opts = {}) {
    const ctx = document.getElementById('c').getContext('2d');
    const RS = window.RENDER_SCALE || 1;
    ctx.setTransform(RS, 0, 0, RS, 0, 0);
    ctx.fillStyle = C.cream; ctx.fillRect(0, 0, W, H);
    // sunburst behind the character
    ctx.save(); ctx.translate(540, 1420); ctx.fillStyle = 'rgba(255,197,61,0.35)';
    for (let i = 0; i < 16; i++) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 900, (i / 16) * TAU, ((i + 0.5) / 16) * TAU); ctx.closePath(); ctx.fill(); }
    ctx.restore();
    // doodles
    const dd = [[150, 300, 'ring', C.cobalt], [940, 360, 'spark', C.sun], [120, 1010, 'tri', C.mint], [975, 1250, 'plus', C.pink], [170, 1700, 'spark', C.tomato], [930, 1690, 'ring', C.tomato]];
    for (const [x, y, k, c] of dd) {
      ctx.save(); ctx.translate(x, y); ctx.lineCap = 'round';
      if (k === 'ring') { ctx.strokeStyle = c; ctx.lineWidth = 13; circle(ctx, 0, 0, 36); ctx.stroke(); }
      if (k === 'spark') sparkle(ctx, 0, 0, 46, c);
      if (k === 'tri') { ctx.fillStyle = c; ctx.rotate(0.4); ctx.beginPath(); ctx.moveTo(0, -36); ctx.lineTo(34, 28); ctx.lineTo(-34, 28); ctx.closePath(); ctx.fill(); }
      if (k === 'plus') { ctx.strokeStyle = c; ctx.lineWidth = 13; ctx.beginPath(); ctx.moveTo(-26, 0); ctx.lineTo(26, 0); ctx.moveTo(0, -26); ctx.lineTo(0, 26); ctx.stroke(); }
      ctx.restore();
    }
    // eyebrow pill
    const eb = layout('FOR BUSY PARENTS', { size: 46, style: 'mo', color: C.cream, maxW: 2000, ws: 0 });
    ctx.save(); ctx.translate(540, 330); ctx.rotate(-0.03);
    ctx.fillStyle = C.tomato; rr(ctx, -eb.width / 2 - 36, -44, eb.width + 72, 88, 44); ctx.fill();
    drawText(ctx, eb, 0, -36, {});
    ctx.restore();
    // title
    drawText(ctx, layout('How AI', { size: 236, style: 's9' }), 540, 400, {});
    drawText(ctx, layout('{actually|si,tomato}', { size: 250, style: 's9' }), 540, 585, {});
    drawText(ctx, layout('works.', { size: 236, style: 's9' }), 540, 835, {});
    ctx.save(); ctx.translate(540, 1150); ctx.rotate(-0.04);
    text(ctx, '(explained with a sticker chart)', 0, 0, 'hd', 64, C.ink);
    ctx.restore();
    // hero character + celebration
    confetti(ctx, 0.3, { x: 540, y: 1450, n: 70, speed: 1500, spread: TAU, seed: 12, g: 700, drag: 2.6, size: 20, life: 3 });
    drawBot(ctx, { x: 540, y: 1440, s: 1.4, t: 0.3, sticker: 1, glasses: 1, eyes: 'happy', mouth: 'open', antGlow: 0.8, rot: -0.05, look: { x: 0, y: -0.2 } });
    for (const [x, y, r] of [[290, 1290, 26], [800, 1300, 34], [250, 1540, 20], [840, 1560, 24]]) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(0.3); starPath(ctx, 0, 0, r * 1.3, r * 0.6, 5, -Math.PI / 2, 4); ctx.fillStyle = C.gold; ctx.fill(); ctx.lineWidth = 6; ctx.strokeStyle = C.ink; ctx.stroke(); ctx.restore();
    }
    // footer pill
    const ft = opts.footer === false ? '' : '7 STEPS  ·  80 SECONDS';
    if (ft) {
      setFont(ctx, STY.mo, 38); const fw = ctx.measureText(ft).width + 80;
      ctx.save(); ctx.translate(540, 1745); ctx.fillStyle = C.ink; rr(ctx, -fw / 2, -40, fw, 80, 40); ctx.fill();
      ctx.fillStyle = C.cream; ctx.textAlign = 'center'; ctx.fillText(ft, 0, 13); ctx.restore();
    }
    paper(ctx, 0.55); vignette(ctx, 0.14); grain(ctx, 3, 0.04);
  };
})();

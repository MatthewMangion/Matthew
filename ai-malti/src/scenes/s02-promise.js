// S02 — PROMISE (4–8s): "Issa ħa nurik / KIF NAĦDEM / f'60 sekonda." → 60 flies into the HUD → implode → drop
(function () {
  const { W, H, C, TAU, clamp, lerp, prog, Ease, rgba, mix, noise1, rnd, fitSize, layout, drawGlyphs, shake, spring, text } = M;
  const XL = 72, XW = W - 144;
  const CX = 540, CY = 990;

  // rotating instrument ring behind the title
  function ring(ctx, lt, k) {
    if (k <= 0) return;
    ctx.save();
    ctx.translate(CX, CY);
    const R = 430;
    ctx.rotate(lt * 0.35);
    ctx.strokeStyle = rgba(C.paper, 0.22 * k);
    ctx.lineWidth = 2;
    for (let i = 0; i < 120; i++) {
      const a = (i / 120) * TAU;
      if (i / 120 > Ease.outQuart(k)) break;
      const l = i % 10 === 0 ? 30 : i % 5 === 0 ? 18 : 9;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * R, Math.sin(a) * R);
      ctx.lineTo(Math.cos(a) * (R - l), Math.sin(a) * (R - l));
      ctx.stroke();
    }
    ctx.rotate(-lt * 0.9);
    ctx.lineWidth = 6;
    ctx.strokeStyle = rgba(C.red, 0.9 * k);
    ctx.beginPath();
    ctx.arc(0, 0, R + 24, -0.4, -0.4 + 1.1 * Ease.outQuart(k));
    ctx.stroke();
    ctx.strokeStyle = rgba(C.yellow, 0.85 * k);
    ctx.beginPath();
    ctx.arc(0, 0, R + 24, 2.6, 2.6 + 0.5 * Ease.outQuart(k));
    ctx.stroke();
    ctx.restore();
  }

  addScene({
    name: 'promise',
    t0: TL.S.promise[0],
    t1: TL.S.promise[1],
    draw(ctx, lt, t) {
      ctx.fillStyle = C.ink;
      ctx.fillRect(0, 0, W, H);
      L.bgDots(ctx, t, { alpha: 0.07 });
      // implosion (7.0 → 7.75): everything collapses into a single point
      const imp = Ease.inExpo(prog(lt, 3.0, 3.72));
      const gone = lt >= 3.75;
      const sh = shake(lt, [[0.75, 0.7], [1.0, 0.9]], 14, 10);
      ctx.save();
      ctx.translate(CX + sh.dx, CY + sh.dy);
      const sc = 1 - imp * 0.985;
      ctx.scale(sc, sc);
      ctx.rotate(imp * 0.6);
      ctx.translate(-CX, -CY);
      if (!gone) {
        ring(ctx, lt, prog(lt, 0.1, 1.3));
        // 1) typewriter line
        const tl = L.typed('Issa ħa nurik', lt, 22);
        const yT = 700;
        text(ctx, tl, XL + 20, yT, { f: 'JB', w: 600, s: 64, color: C.paper });
        const tw = M.textWidth(ctx, tl, 'JB', 600, 64);
        if (lt < 0.75 || Math.floor(lt * 3) % 2 === 0) {
          ctx.fillStyle = C.red;
          ctx.fillRect(XL + 20 + tw + 8, yT - 50, 30, 58);
        }
        // 2) KIF / NAĦDEM
        const sKIF = fitSize(ctx, 'KIF', 520, 'A', 900, 125);
        const sN = fitSize(ctx, 'NAĦDEM', XW, 'A', 900, 92);
        const k1 = lt - 0.75, k2 = lt - 1.0;
        if (k1 > 0) {
          drawGlyphs(ctx, 'KIF', XL, 960, { f: 'A', w: 900, s: sKIF, wd: 125, color: C.yellow }, (i) => {
            const p = spring(k1 - i * 0.03, 3.4, 0.42);
            return { sy: p, sx: lerp(1.4, 1, clamp(p)), alpha: k1 - i * 0.03 > 0 ? 1 : 0 };
          });
        }
        if (k2 > 0) {
          drawGlyphs(ctx, 'NAĦDEM', XL, 960 + sN * 0.78, { f: 'A', w: 900, s: sN, wd: 92, color: C.paper }, (i, g, n) => {
            const p = Ease.snap(clamp((k2 - i * 0.022) / 0.3));
            return { dx: (1 - p) * 300, alpha: p, sx: lerp(0.3, 1, p) };
          });
        }
        // 3) f'60 sekonda.
        const k3 = lt - 1.75;
        if (k3 > 0) {
          const y3 = 960 + sN * 0.78 + 170;
          const p = Ease.snap(clamp(k3 / 0.4));
          const pre = "f'", num = '60', post = ' sekonda.';
          const s = 118;
          const wPre = M.textWidth(ctx, pre, 'IS', 400, s), wNum = M.textWidth(ctx, num, 'A', 900, s * 0.92, 100);
          const x0 = XL + 8;
          text(ctx, pre, x0, y3 + (1 - p) * 60, { f: 'IS', s, color: C.paper, alpha: p });
          // the "60" — detaches and flies into the HUD timer at 6.45–6.75
          const fly = Ease.inOutCubic(prog(lt, 2.45, 2.78));
          const nx = x0 + wPre + 10, ny = y3 + (1 - p) * 60;
          const tx = W - 72 - M.textWidth(ctx, '60s', 'JB', 700, 30, 100, 1), ty = 214;
          if (fly < 1) {
            const fx = lerp(nx, tx, fly), fy = lerp(ny, ty, fly) - Math.sin(fly * Math.PI) * 260;
            const fs = lerp(s * 0.92, 30, fly);
            // ghost stays behind as outline
            text(ctx, num, fx, fy, { f: 'A', w: 900, s: fs, wd: 100, color: C.yellow, alpha: p });
          }
          if (fly > 0) {
            ctx.save();
            ctx.globalAlpha = p * 0.8;
            ctx.font = M.fontStr('A', 900, s * 0.92, 100);
            ctx.lineWidth = 3;
            ctx.strokeStyle = C.yellow;
            ctx.strokeText(num, nx, ny);
            ctx.restore();
          }
          text(ctx, post, nx + wNum + 6, y3 + (1 - p) * 60, { f: 'IS', s, color: C.paper, alpha: p });
        }
      }
      ctx.restore();
      // the collapsed point: pulses, then vanishes into black for the drop
      if (imp > 0.6 && !gone) {
        const r = lerp(40, 6, prog(lt, 3.4, 3.72));
        M.glowDot(ctx, CX, CY, r * 5, C.paper, 0.9);
        M.circle(ctx, CX, CY, r * 0.5);
        ctx.fillStyle = '#fff';
        ctx.fill();
      }
      // converging speed lines during the implosion
      const cl = prog(lt, 2.9, 3.7);
      if (cl > 0 && !gone) {
        ctx.save();
        ctx.strokeStyle = rgba(C.paper, 0.35 * Math.sin(cl * Math.PI));
        ctx.lineWidth = 3;
        for (let i = 0; i < 48; i++) {
          const a = (i / 48) * TAU + rnd(i, 4) * 0.2;
          const r0 = lerp(1400, 80, Ease.inCubic(clamp(cl * 1.1 - rnd(i, 5) * 0.1)));
          const r1 = r0 + 160 + rnd(i, 6) * 200;
          ctx.beginPath();
          ctx.moveTo(CX + Math.cos(a) * r0, CY + Math.sin(a) * r0);
          ctx.lineTo(CX + Math.cos(a) * r1, CY + Math.sin(a) * r1);
          ctx.stroke();
        }
        ctx.restore();
      }
    },
    fx(fx, lt) {
      const imp = prog(lt, 3.0, 3.72);
      fx.ca += imp * 1.2;
      fx.warp = -imp * 0.25;
      if (lt >= 3.75) fx.expo = 0.0;
    },
    mb(lt) {
      if (lt > 2.4 && lt < 2.8) return 8;
      if (lt > 2.9) return 8;
      if ((lt > 0.75 && lt < 1.3)) return 6;
      return 3;
    },
  });
})();

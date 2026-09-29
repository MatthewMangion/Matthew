// ep02/cards.js — countdown number cards on Maltese tile floors + the tile-flip transitions that stitch the edit.
// Transition scenes are `exclusive`: while active they paint the neighbouring scenes themselves.
(function (G) {
  const { W, H, clamp, prog, Ease, rgba, text, fitSize, spring, lerp } = M;
  const { P, floor, tilePattern, tileFlip, rr } = K;

  const CARD = {
    7: { kind: 'rosette', c: [P.teal, P.cream, P.ochre, P.terra], nk: 'star', nc: [P.cream, P.terra, P.teal, P.ochre] },
    6: { kind: 'star', c: [P.slate, P.cream, P.sky, P.ochre], nk: 'quatro', nc: [P.cream, P.slate, P.ochre, P.terra] },
    5: { kind: 'quatro', c: [P.ochre, P.ink, P.cream, P.terra], nk: 'rosette', nc: [P.cream, P.ochre, P.terra, P.ink] },
    4: { kind: 'rosette', c: [P.terra, P.cream, P.ink, P.ochre], nk: 'star', nc: [P.cream, P.terra, P.ochre, P.ink] },
    3: { kind: 'star', c: [P.sky, P.cream, P.green, P.terra], nk: 'rosette', nc: [P.cream, P.green, P.terra, P.sky] },
    2: { kind: 'quatro', c: [P.slate, P.terra, P.cream, P.ochre], nk: 'star', nc: [P.cream, P.slate, P.terra, P.ochre] },
    1: { kind: 'rosette', c: [P.ink, P.ochre, P.cream, P.red], nk: 'quatro', nc: [P.ochre, P.ink, P.cream, P.red] },
  };

  // k: seconds since the card landed (negative while it is still flipping in)
  function paintCard(ctx, n, k) {
    const cfg = CARD[n];
    const drift = k * 24;
    floor(ctx, cfg.kind, cfg.c, 180, drift * 0.5, -drift);
    const g = ctx.createRadialGradient(W / 2, 1000, 100, W / 2, 1000, 1100);
    g.addColorStop(0, rgba(P.ink, 0.05));
    g.addColorStop(1, rgba(P.ink, 0.55));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    const str = String(n);
    const s = Math.min(fitSize(ctx, str, 600, 'A', 900, 100), 1180);
    const cy = 1060;
    const punch = k < 0 ? 1 : 1 + 0.16 * Math.exp(-k * 9) * Math.cos(k * 22);
    ctx.save();
    ctx.translate(W / 2, cy);
    ctx.scale(punch, punch);
    ctx.rotate(-0.035);
    ctx.font = M.fontStr('A', 900, s, 100);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    for (let d = 26; d >= 2; d -= 2) {
      ctx.fillStyle = d > 20 ? rgba(P.ink, 0.35) : P.ink;
      ctx.fillText(str, d, s * 0.36 + d);
    }
    ctx.fillStyle = tilePattern(ctx, cfg.nk, cfg.nc, 150, 0, 0);
    ctx.fillText(str, 0, s * 0.36);
    ctx.lineWidth = 16;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = P.ink;
    ctx.strokeText(str, 0, s * 0.36);
    ctx.lineWidth = 5;
    ctx.strokeStyle = P.cream;
    ctx.strokeText(str, 0, s * 0.36);
    ctx.restore();
    // "QAWL" pill + progress beads
    const pw = 250, ph = 74, py = 470;
    ctx.fillStyle = P.ink; rr(ctx, W / 2 - pw / 2 + 8, py + 8, pw, ph, 37); ctx.fill();
    ctx.fillStyle = P.cream; rr(ctx, W / 2 - pw / 2, py, pw, ph, 37); ctx.fill();
    text(ctx, 'QAWL', W / 2, py + 50, { f: 'JB', w: 800, s: 40, color: P.ink, align: 'center', track: 8 });
    for (let i = 0; i < 7; i++) {
      const num = 7 - i;
      const x = W / 2 + (i - 3) * 46, y = 1600;
      ctx.beginPath(); ctx.arc(x + 4, y + 4, 14, 0, Math.PI * 2); ctx.fillStyle = P.ink; ctx.fill();
      ctx.beginPath(); ctx.arc(x, y, 14, 0, Math.PI * 2);
      ctx.fillStyle = num === n ? P.yellow : num > n ? P.cream : rgba(P.cream, 0.35);
      ctx.fill();
      ctx.lineWidth = 4; ctx.strokeStyle = P.ink; ctx.stroke();
    }
  }
  G.paintCard = paintCard;

  const flipOpts = (dir) => ({ S: 180, flip: 0.28, spread: 0.2, dir, grout: P.ink });
  const at = (name) => ENGINE.sceneByName(name);
  const endOf = (s, t) => Math.min(t - s.t0, s.t1 - s.t0 - 1e-4);
  const startOf = (s, t) => Math.max(0, t - s.t0);

  // per-proverb: [T-0.5, T) flip prev → card · [T, T+0.5) card · [T+0.5, T+1) flip card → scene
  TL.SEG.forEach((g, i) => {
    const prevKey = i === 0 ? 'hook' : TL.SEG[i - 1].key;
    addScene({
      name: 'x' + g.n,
      t0: g.T - 0.5,
      t1: g.T + 1.0,
      z: 50,
      exclusive: true,
      push: false,
      draw(ctx, lt, t) {
        const prev = at(prevKey), next = at(g.key);
        const card = (c) => paintCard(c, g.n, t - g.T);
        if (lt < 0.5) tileFlip(ctx, lt, (c) => ENGINE.paintSceneAt(c, prev, endOf(prev, t)), card, flipOpts(i % 2 ? -1 : 1));
        else if (lt < 1.0) card(ctx);
        else tileFlip(ctx, lt - 1.0, card, (c) => ENGINE.paintSceneAt(c, next, startOf(next, t)), flipOpts(i % 2 ? 1 : -1));
      },
      mb(lt) {
        return lt < 0.5 || lt >= 1.0 ? 6 : lt < 0.62 ? 6 : 3;
      },
    });
  });

  // #1 → outro, and outro → hook (seamless loop back to frame 0)
  const plain = (name, t0, from, to, toLt, dir) =>
    addScene({
      name,
      t0,
      t1: t0 + 0.5,
      z: 50,
      exclusive: true,
      push: false,
      draw(ctx, lt, t) {
        const A = at(from), B = at(to);
        tileFlip(ctx, lt, (c) => ENGINE.paintSceneAt(c, A, endOf(A, t)), (c) => ENGINE.paintSceneAt(c, B, toLt(t)), flipOpts(dir));
      },
      mb() {
        return 6;
      },
    });
  plain('xo', 59.5, 'p1', 'outro', (t) => Math.max(0, t - 60), 1);
  plain('xl', 63.5, 'outro', 'hook', () => 0, -1);
})(window);

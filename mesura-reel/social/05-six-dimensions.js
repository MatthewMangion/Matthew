// Reel 05 · Six dimensions. Hook: how do you measure AI readiness?
// From the deck: six dimensions of workforce AI readiness. Five self-reported, one tested. Each
// scored 0-100, then weighted into one readiness score (the sample report: 88%, Elite AI Navigator).
import { film, P, F, E, SAFE, CW, DIMS, clamp, lerp, seg, spring, mix, rgba, TAU, ringSec } from './kit.js';

const T = {
  ruler: 0.15, slide: 0.7, hookOut: 2.85,
  six: 3.0, rows: [3.9, 5.0, 6.1, 7.2, 8.3, 9.4], sixOut: 11.4,
  tested: 11.7, tags: 12.2, tag6: 12.85, testedOut: 14.1,
  scored: 14.4, fill: 14.8, collapse: 16.5, ring: 17.05, tier: 18.2, scoredOut: 20.85,
};
const RY = 700, RH = 124;                     // first row baseline, row pitch
const RING = { x: 540, y: 1040, ro: 220, ri: 184 };
const arcEnd = v => -Math.PI / 2 + (TAU * v) / 100;

export default film({
  id: '05-six-dimensions', land: 21.6, T,
  heavy: [[T.collapse - 0.05, T.ring + 0.1, 16]],
  draw(k, t) {
    const { ctx } = k;
    /* ---------------------------------------------------------- hook */
    k.hook('How do you\nmeasure AI\nreadiness?', t, -0.22, { size: 128, y: 420, lh: 1.05, tOut: T.hookOut });
    // a ruler draws itself; the ochre point slides along it and settles at 88
    const ro = E.inOutCubic(seg(t, T.hookOut, T.hookOut + 0.4));
    const rp = E.inOutCubic(seg(t, T.ruler, T.ruler + 0.9));
    if (rp > 0 && ro < 1) {
      const y = 930, a = 1 - ro, len = CW * rp;
      ctx.globalAlpha = a; ctx.fillStyle = P.ink; ctx.fillRect(SAFE.l, y, len, 3);
      for (let i = 0; i <= 40; i++) {
        const x = SAFE.l + (CW * i) / 40;
        if (x > SAFE.l + len) break;
        const major = i % 10 === 0, h = major ? 40 : i % 5 === 0 ? 26 : 14;
        ctx.fillRect(x - 1.5, y - h, 3, h);
        if (major) k.text(String(i * 2.5), F.text(28, 500), x, y + 50, P.muted, a, 'center');
      }
      ctx.globalAlpha = 1;
      const sp = E.inOutCubic(seg(t, T.slide, T.slide + 1.0)), mx = SAFE.l + CW * 0.88 * sp;
      if (t > T.slide - 0.1) {
        k.dot(mx, y - 60, 16 * clamp(spring(t - T.slide + 0.1, 2.4, 0.6), 0, 1.3), P.ochre, a);
        ctx.globalAlpha = a * 0.5; ctx.fillStyle = P.ochre; ctx.fillRect(mx - 1.5, y - 44, 3, 44); ctx.globalAlpha = 1;
      }
    }

    /* -------------------------------------------------- the six rows */
    k.say('Mesura measures\n*six* dimensions.', t, T.six, { tOut: T.sixOut, y: 420 });
    k.say('Five self-reported.\nOne *tested*.', t, T.tested, { tOut: T.testedOut, y: 420 });
    k.say('Each scored 0–100,\nthen weighted into\n*one* readiness score.', t, T.scored, { tOut: T.collapse + 0.05, y: 400, size: 88 });
    const fall = E.inOutCubic(seg(t, T.collapse, T.collapse + 0.55));
    DIMS.forEach((d, i) => {
      const t0 = T.rows[i], y = RY + i * RH, p = spring(t - t0, 2.3, 0.62);
      if (p <= 0.001 || fall >= 1) return;
      const a = clamp(p * 2) * (1 - seg(fall, 0.3, 0.8));
      // collapsing: each row's colour flies to its place on the ring
      const ang = -Math.PI / 2 + (i * TAU) / 6, hr = (RING.ro + RING.ri) / 2;
      const tx = RING.x + hr * Math.cos(ang), ty = RING.y + hr * Math.sin(ang);
      const dx = lerp(SAFE.l + 14, tx, fall), dy = lerp(y - 20, ty, fall);
      k.dot(dx, dy, 14 * clamp(p, 0, 1.3) * (1 + 0.4 * fall), d.color, clamp(p * 2));
      const ox = -fall * 80;
      ctx.save(); ctx.globalAlpha = 1; ctx.translate(ox, 0);
      k.block(d.name, F.disp(60), SAFE.l + 46, y, 0, P.ink, t, t0 + 0.04, { dur: 0.6, alpha: a });
      k.block(d.desc, F.text(32, 400), SAFE.l + 48, y + 46, 0, P.body, t, t0 + 0.12, { stagger: 0.025, dur: 0.6, tOut: T.fill - 0.1 });
      ctx.restore();
      // self-rated / tested tags
      const tg = spring(t - (i < 5 ? T.tags + i * 0.07 : T.tag6), 2.6, 0.6) * (1 - seg(t, T.fill - 0.2, T.fill + 0.1));
      if (tg > 0.001) {
        const s = i < 5 ? 'SELF-RATED' : 'TESTED', f = F.text(22, 600), w = k.measure(s, f, 2.4) + 40, cx = SAFE.r - w / 2;
        ctx.save(); ctx.translate(cx, y - 20); ctx.scale(clamp(tg, 0, 1.2), clamp(tg, 0, 1.2)); ctx.globalAlpha = a;
        k.pill(-w / 2, -24, w, 48); ctx.fillStyle = i < 5 ? P.sunken : P.ochre; ctx.fill(); ctx.restore();
        k.text(s, f, cx + 1.2, y - 12, i < 5 ? P.muted : '#3B2E12', a * clamp(tg * 2), 'center', 2.4);
      }
      // scores: a bar replaces the description
      const g = E.outQuint(seg(t, T.fill + i * 0.1, T.fill + 0.9 + i * 0.1)) * (1 - fall);
      if (g > 0) {
        k.bar(SAFE.l + 46 + ox, y + 26, CW - 46, 14, (d.score / 100) * g, d.color, P.track, a);
        k.num(d.score * E.outQuint(seg(t, T.fill + i * 0.1, T.fill + 0.9 + i * 0.1)), SAFE.r + ox, y + 2, 52, { intCols: d.score === 100 ? 3 : 2, align: 'right', alpha: a, suffixScale: 0.45 });
      }
    });

    /* ---------------------------------------------------------- the ring */
    const rin = seg(t, T.ring - 0.3, T.ring), rout = E.inCubic(seg(t, T.scoredOut, T.scoredOut + 0.35));
    if (rin > 0 && rout < 1) {
      const a = rin * (1 - rout), v = 88 * E.outQuint(seg(t, T.ring, T.ring + 1.1)), hr = (RING.ro + RING.ri) / 2;
      ctx.globalAlpha = a; ctx.beginPath(); ctx.arc(RING.x, RING.y, hr, 0, TAU); ctx.lineWidth = RING.ro - RING.ri; ctx.strokeStyle = P.track; ctx.stroke(); ctx.globalAlpha = 1;
      if (v > 0.3) { k.pathSec({ a: ringSec(RING.ro, RING.ri, -Math.PI / 2, arcEnd(v)) }, RING.x, RING.y, 1, 1); ctx.globalAlpha = a; ctx.fillStyle = P.pine; ctx.fill(); ctx.globalAlpha = 1; }
      // the six colours sit on the track until the arc sweeps over them
      DIMS.forEach((d, i) => {
        const ang = (i * 360) / 6, swept = v / 100 * 360 > ang + 2;
        const r = 20 * (swept ? 1 - seg(t, T.ring + (ang / 360) * 0.6, T.ring + (ang / 360) * 0.6 + 0.2) : 1);
        const aa = -Math.PI / 2 + (i * TAU) / 6;
        if (r > 0.3 && t < T.ring + 1.4) k.dot(RING.x + hr * Math.cos(aa), RING.y + hr * Math.sin(aa), r, d.color, a);
      });
      const ae = arcEnd(v);
      if (v > 0.3) k.dot(RING.x + hr * Math.cos(ae), RING.y + hr * Math.sin(ae), 14, P.ochre, a);
      k.num(v, RING.x - 8, RING.y + 58, 170, { intCols: 2, align: 'center', alpha: a, suffixScale: 0.36 });
      k.text('READINESS', F.text(24, 600), RING.x, RING.y + 112, P.muted, a, 'center', 3);
      const tl = k.lay('Elite AI Navigator', F.disp(60));
      k.rise(tl, RING.x - tl.width / 2, RING.y + 340, P.ink, t, T.tier, { tOut: T.scoredOut });
    }
  },
  events(k) {
    const ev = [{ t: T.ruler, k: 'tape' }, { t: T.slide, k: 'zip', v: 0.5 }, { t: T.slide + 0.95, k: 'tick', v: 1, f: 4200 }];
    ev.push({ t: T.hookOut, k: 'out' }, { t: T.six, k: 'in' });
    T.rows.forEach((t0, i) => ev.push({ t: t0, k: 'note', m: [74, 76, 78, 81, 83, 86][i], x: 200 }));
    ev.push({ t: T.sixOut, k: 'out' }, { t: T.tested, k: 'in' });
    for (let i = 0; i < 5; i++) ev.push({ t: T.tags + i * 0.07, k: 'tick', v: 0.7, f: 3600 + 200 * i, p: 0.3 });
    ev.push({ t: T.tag6, k: 'check' }, { t: T.testedOut, k: 'out' }, { t: T.scored, k: 'in' });
    for (let i = 0; i < 6; i++) ev.push({ t: T.fill + i * 0.1, k: 'zip', v: 0.35 });
    ev.push({ t: T.collapse, k: 'suck', d: 0.55 }, { t: T.ring, k: 'ring' }, { t: T.tier, k: 'bell', m: 86, v: 1.2 });
    ev.push({ t: T.scoredOut, k: 'out' });
    return ev;
  },
  music: {
    chords: [
      [0, 2.4, 38, [57, 62, 66, 69, 74]], [2.4, 4.8, 43, [55, 59, 62, 66, 71]], [4.8, 7.2, 40, [55, 59, 62, 67, 71]],
      [7.2, 9.6, 45, [57, 61, 64, 69, 73]], [9.6, 12.0, 35, [54, 57, 62, 66, 69]], [12.0, 14.4, 43, [55, 59, 62, 67, 71]],
      [14.4, 16.8, 45, [57, 62, 64, 69, 76]], [16.8, 19.2, 38, [54, 57, 62, 66, 69, 74]], [19.2, 21.6, 45, [57, 61, 64, 69, 76]],
      [21.6, 24.6, 38, [50, 54, 57, 61, 64, 69]],
    ],
    drums: [[0, 3.0, 'groove'], [3.0, 11.4, 'pulse'], [11.4, 16.8, 'groove'], [16.8, 20.4, 'half'], [20.4, 21.6, 'none']],
    bass: [[0, 3.0, 'eighths'], [3.0, 11.4, 'quarters'], [11.4, 16.8, 'eighths'], [16.8, 21.2, 'hold']],
    arps: [[3.0, 11.4, 0.6], [11.4, 16.8, 0.3]],
  },
});

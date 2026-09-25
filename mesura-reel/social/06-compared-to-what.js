// Reel 06 · Compared to what? Hook: you scored 88%. Is that good?
// From the deck: every score is read against three baselines: your sector (is my industry ahead or
// behind?), the Mesura average (where do I sit against everyone measured so far?) and your
// organisation (am I typical of the people I actually work with?). Every dimension gets the same
// comparisons, and the arithmetic is printed next to every score. Nothing is a black box.
import { film, P, F, E, SAFE, CW, POS, DIMS, OVERALL, clamp, lerp, seg, spring, mix, rgba, TAU } from './kit.js';

const T = {
  hookOut: 2.85,
  dep: 3.0, depOut: 5.35,
  base: 5.6, scale: 5.9, rows: [6.8, 8.5, 10.2], baseOut: 12.9,
  dims: 13.2, dimRows: 13.6, dimsOut: 16.55,
  box: 16.8, card: 17.55, boxOut: 20.85,
};
const SC = { y: 870, lo: 70, hi: 100 };
const sx = v => SAFE.l + ((v - SC.lo) / (SC.hi - SC.lo)) * CW;
const BASES = [
  ['sector', 'Your sector', 'Is your industry ahead or behind?', OVERALL.sector, '▲ 5%'],
  ['mesura', 'The Mesura average', 'Where do you sit against everyone measured so far?', OVERALL.mesura, '▲ 10%'],
  ['org', 'Your organisation', 'Are you typical of the people you work with?', OVERALL.org, '▲ 3%'],
];

export default film({
  id: '06-compared-to-what', land: 21.6, T,
  heavy: [[0, 0.4, 12]],
  draw(k, t) {
    const { ctx } = k;
    /* ---------------------------------------------------------- hook */
    k.eyebrow('YOUR READINESS SCORE', t, 0.05, { y: 420, tOut: T.hookOut, color: P.muted });
    const L88 = k.lay('88', F.disp(340)), LP = k.lay('%', F.disp(150));
    k.slam(L88, SAFE.l - 10, 750, P.ochre, t, 0, { tOut: T.hookOut });
    k.slam(LP, SAFE.l - 10 + L88.width + 6, 750, P.ochre, t, 0.06, { tOut: T.hookOut });
    k.hook('Is that good?', t, 0.3, { size: 120, y: 930, tOut: T.hookOut });

    /* ---------------------------------------------------- it depends */
    k.say('It depends who\nyou compare *with*.', t, T.dep, { tOut: T.depOut, y: 640, size: 110 });

    /* -------------------------------------------- three baselines */
    k.say('Every score is read\nagainst *three* baselines.', t, T.base, { tOut: T.baseOut, y: 420, size: 88 });
    const so = E.inOutCubic(seg(t, T.baseOut, T.baseOut + 0.4)), sp = E.inOutCubic(seg(t, T.scale, T.scale + 0.8));
    if (sp > 0 && so < 1) {
      const a = 1 - so;
      ctx.globalAlpha = a; ctx.fillStyle = P.borderStrong; ctx.fillRect(SAFE.l, SC.y, CW * sp, 3);
      for (let v = SC.lo; v <= SC.hi; v++) {
        const x = sx(v);
        if (x > SAFE.l + CW * sp + 0.5) break;
        const major = v % 5 === 0;
        ctx.fillRect(x - 1, SC.y - (major ? 22 : 10), 2, major ? 22 : 10);
        if (major) k.text(String(v), F.text(26, 500), x, SC.y + 44, P.muted, a, 'center');
      }
      ctx.globalAlpha = 1;
      const yp = spring(t - T.scale - 0.4, 2.2, 0.6);
      if (yp > 0.001) {
        const x = sx(OVERALL.score);
        k.dot(x, SC.y - 48, 17 * clamp(yp, 0, 1.3), P.ochre, a);
        k.text('YOU  88%', F.text(26, 600), x, SC.y - 90, P.ochre, a * clamp(yp * 2), 'center', 2.6);
      }
      BASES.forEach(([kind, , , v], i) => {
        const mp = spring(t - T.rows[i], 2.4, 0.55);
        if (mp > 0.001) k.marker(kind, sx(v), SC.y - 24 - (1 - clamp(mp)) * 70, clamp(mp, 0, 1.3) * 1.15, P.ink, a * clamp(mp * 2));
      });
    }
    BASES.forEach(([kind, title, q, , badge], i) => {
      const t0 = T.rows[i], y = 1050 + i * 150, p = spring(t - t0, 2.3, 0.62);
      const out = E.inOutCubic(seg(t, T.baseOut + i * 0.05, T.baseOut + 0.35 + i * 0.05));
      if (p <= 0.001 || out >= 1) return;
      const a = clamp(p * 2) * (1 - out);
      k.marker(kind, SAFE.l + 16, y - 17, clamp(p, 0, 1.2), P.ink, a);
      k.block(title, F.disp(50), SAFE.l + 56, y, 0, P.ink, t, t0 + 0.04, { tOut: T.baseOut + i * 0.05 });
      k.block(q, F.text(32, 400), SAFE.l + 58, y + 48, 0, P.body, t, t0 + 0.12, { stagger: 0.025, tOut: T.baseOut + i * 0.05 });
      const bp = spring(t - t0 - 0.45, 2.6, 0.6) * (1 - out);
      if (bp > 0.001) {
        const f = F.text(32, 600), w = k.measure(badge, f) + 40, cx = SAFE.r - w / 2;
        ctx.save(); ctx.translate(cx, y - 14); ctx.scale(clamp(bp, 0, 1.2), clamp(bp, 0, 1.2)); ctx.globalAlpha = a;
        k.pill(-w / 2, -30, w, 60); ctx.fillStyle = P.pineSoft; ctx.fill(); ctx.restore();
        k.text(badge, f, cx, y - 2, POS, a * clamp(bp * 2), 'center');
      }
    });

    /* ------------------------------------------------ all six dimensions */
    k.say('And the same for\nall *six* dimensions.', t, T.dims, { tOut: T.dimsOut, y: 420, size: 88 });
    DIMS.forEach((d, i) => {
      const t0 = T.dimRows + i * 0.12, y = 700 + i * 124, p = E.outQuint(seg(t, t0, t0 + 0.8));
      const out = E.inOutCubic(seg(t, T.dimsOut + i * 0.04, T.dimsOut + 0.35 + i * 0.04));
      if (t < t0 || out >= 1) return;
      const a = seg(t, t0, t0 + 0.2) * (1 - out), dy = -out * 50;
      k.text(d.name, F.disp(46), SAFE.l, y + dy, P.ink, a);
      k.num(d.score * p, SAFE.r, y + dy, 46, { intCols: d.score === 100 ? 3 : 2, align: 'right', alpha: a, suffixScale: 0.45 });
      k.bar(SAFE.l, y + 24 + dy, CW, 14, (d.score / 100) * p, d.color, P.track, a);
      [['mesura', d.mesura], ['sector', d.sector], ['org', d.org]].forEach(([kind, v], j) => {
        const mp = spring(t - t0 - 0.5 - j * 0.1, 2.6, 0.6);
        if (mp > 0.001) k.marker(kind, SAFE.l + CW * (v / 100), y + 31 + dy, clamp(mp, 0, 1.2) * 0.8, P.ink, a);
      });
    });

    /* ------------------------------------------------------ no black box */
    k.say('No black box.', t, T.box, { tOut: T.boxOut, y: 470, size: 120 });
    k.note('Every score shows the answers and the arithmetic behind it.', t, T.box + 0.45, { y: 590, tOut: T.boxOut, size: 42 });
    const cp = spring(t - T.card, 1.7, 0.72), co = E.inCubic(seg(t, T.boxOut, T.boxOut + 0.35));
    if (cp > 0.001 && co < 1) {
      const y0 = 780 + (1 - clamp(cp)) * 200 + co * 60, a = clamp(cp * 2) * (1 - co), x0 = SAFE.l + 44;
      k.card(SAFE.l, y0, CW, 470, 26, P.surface, a, 0.1);
      k.text('How the Literacy score is calculated', F.text(32, 600), x0, y0 + 76, P.ink, a);
      [['Self-rated AI knowledge', 67], ['Appetite to learn more about AI', 33]].forEach(([s, w], j) => {
        const t0 = T.card + 0.35 + j * 0.3, ry = y0 + 170 + j * 118, g = E.outQuint(seg(t, t0, t0 + 0.8));
        k.text('▲', F.text(24, 600), x0, ry, POS, a * seg(t, t0, t0 + 0.2));
        k.text(s, F.text(34, 500), x0 + 36, ry, P.ink, a * seg(t, t0, t0 + 0.2));
        k.num(w * g, SAFE.r - 44, ry, 40, { intCols: 2, align: 'right', alpha: a * seg(t, t0, t0 + 0.2), color: P.muted, suffixScale: 0.5 });
        k.bar(x0, ry + 26, CW - 88, 10, (w / 100) * g, P.pine, P.track, a * seg(t, t0, t0 + 0.2));
      });
      k.block('Each answer maps to a 0–100 score. The dimension\nis the weighted average of its measures.', F.text(26, 400), x0, y0 + 400, 36, P.muted, t, T.card + 1.1, { stagger: 0.02, alpha: a });
    }
  },
  events(k) {
    const ev = [{ t: 0.3, k: 'swish', v: 0.5 }, { t: T.hookOut, k: 'out' }, { t: T.dep, k: 'hmm' }, { t: T.depOut, k: 'out' }];
    ev.push({ t: T.base, k: 'in' }, { t: T.scale, k: 'tape' }, { t: T.scale + 0.4, k: 'tick', v: 1, f: 4200 });
    T.rows.forEach((t0, i) => ev.push({ t: t0, k: 'note', m: [78, 81, 86][i], x: 300 }, { t: t0 + 0.45, k: 'check' }));
    ev.push({ t: T.baseOut, k: 'out' }, { t: T.dims, k: 'in' });
    DIMS.forEach((d, i) => ev.push({ t: T.dimRows + i * 0.12, k: 'zip', v: 0.3 }));
    ev.push({ t: T.dimsOut, k: 'out' }, { t: T.box, k: 'in' }, { t: T.card, k: 'card' }, { t: T.boxOut, k: 'out' });
    return ev;
  },
  music: {
    chords: [
      [0, 2.4, 43, [55, 59, 62, 66, 71]], [2.4, 4.8, 45, [57, 62, 64, 69, 74]], [4.8, 7.2, 42, [57, 62, 66, 69, 73]],
      [7.2, 9.6, 35, [54, 57, 62, 66, 69]], [9.6, 12.0, 43, [55, 59, 62, 67, 71]], [12.0, 14.4, 45, [57, 61, 64, 69, 73]],
      [14.4, 16.8, 40, [55, 59, 62, 66, 71]], [16.8, 19.2, 43, [55, 59, 62, 67, 74]], [19.2, 21.6, 45, [57, 62, 64, 69, 76]],
      [21.6, 24.6, 38, [50, 54, 57, 61, 64, 69]],
    ],
    drums: [[0, 2.4, 'groove'], [2.4, 5.4, 'half'], [5.4, 12.6, 'pulse'], [12.6, 16.8, 'groove'], [16.8, 20.4, 'half'], [20.4, 21.6, 'none']],
    bass: [[0, 2.4, 'eighths'], [2.4, 5.4, 'hold'], [5.4, 12.6, 'quarters'], [12.6, 16.8, 'eighths'], [16.8, 21.2, 'quarters']],
    arps: [[5.4, 12.6, 0.6], [12.6, 16.8, 0.3]],
  },
});

// Reel 01 · AI at work. Hook: one in five European companies now uses AI.
// Eurostat 2025: enterprises using AI 13.5% (2024) -> 20.0% (2025); Malta professional GenAI use
// 29.5% vs EU 15.1%. National statistics stop at the organisation's door.
import { film, P, F, E, SAFE, CW, clamp, lerp, seg, spring, hash, mix, rgba, TAU } from './kit.js';

const T = {
  hookOut: 2.85,
  s1: 3.1, rewind: 3.35, s1Out: 5.15,
  s2: 5.4, regrow: 5.6, s2Out: 7.5,
  mt: 7.8, collapse: 7.8, bars: 8.35, mtOut: 9.95,
  twice: 10.2, ghost: 10.55, twOut: 12.3,
  door: 12.6, list: [13.55, 14.15, 14.75, 15.35], doorOut: 17.05,
  q: 17.4, qOut: 20.75,
};

// 100 enterprises as a band of dots, 20 of them lit: two per block of ten, spread evenly.
const COLS = 20, ROWS = 5, X0 = SAFE.l + 14, X1 = SAFE.r - 14, SP = (X1 - X0) / (COLS - 1), Y0 = 960, R = 14;
const DOTS = [];
for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) DOTS.push({ c, r, x: X0 + c * SP, y: Y0 + r * SP, lit: -1 });
for (let b = 0; b < 10; b++) {
  const block = DOTS.filter(d => Math.floor(d.c / 2) === b);
  const picks = block.map((d, i) => [hash(b * 31 + i, 5), d]).sort((a, z) => a[0] - z[0]).slice(0, 2).map(p => p[1]);
  picks.forEach(d => { d.lit = 0; });
}
DOTS.filter(d => d.lit === 0).sort((a, z) => a.x - z.x || a.y - z.y).forEach((d, i) => { d.lit = i; });  // lighting order

const MALTA = 29.5, EU = 15.1, SCALE = CW / 32;          // bar length per percentage point
const BAR = { mt: 1000, eu: 1140, h: 48 };
const litCount = t => {
  if (t < T.rewind) return 20;
  if (t < T.regrow) return lerp(20, 13.5, E.inOutCubic(seg(t, T.rewind, T.rewind + 0.7)));
  return lerp(13.5, 20, E.inOutCubic(seg(t, T.regrow, T.regrow + 0.75)));
};

export default film({
  id: '01-ai-at-work', land: 21.6, T,
  heavy: [[7.75, 8.45, 16], [12.3, 12.75, 12]],
  draw(k, t) {
    const { ctx } = k;
    /* ---------------------------------------------------------- hook */
    k.eyebrow('EUROSTAT  ·  2025', t, 0.1, { y: 340, tOut: T.hookOut });
    const big = k.lay('1 in 5', F.disp(290));
    k.slam(big, SAFE.l - 6, 610, P.ochre, t, 0, { tOut: T.hookOut });
    k.hook('European companies\nnow use AI.', t, 0.2, { size: 92, y: 738, lh: 1.08, tOut: T.hookOut });

    /* ------------------------------------------------------ the band */
    const bandOut = seg(t, T.collapse, T.bars);                // dots collapse into the bars
    if (t < T.bars + 0.05) {
      const n = litCount(t);
      DOTS.forEach(d => {
        const ta = 0.02 + (d.c / (COLS - 1)) * 0.32 + (d.r / (ROWS - 1)) * 0.1;
        let r = R * clamp(spring(t - ta, 2.6, 0.55), 0, 1.3);
        if (r <= 0.05) return;
        let x = d.x, y = d.y;
        if (bandOut > 0) {
          const q = E.inOutCubic(clamp(bandOut * 1.25 - (1 - d.c / (COLS - 1)) * 0.25));
          x = lerp(d.x, SAFE.l + 22, q); y = lerp(d.y, d.r < 3 ? BAR.mt : BAR.eu, q); r *= 1 - q * 0.75;
        }
        let col = '#D9D0BD';
        if (d.lit >= 0) {
          const on = seg(t, 0.42 + d.lit * 0.03, 0.54 + d.lit * 0.03);       // first lighting, left to right
          const keep = clamp(n - d.lit);                                      // rewind / regrow by count
          col = mix('#D9D0BD', P.ochre, on * keep);
          if (on > 0 && on < 1) k.ripple(x, y, t, 0.42 + d.lit * 0.03, R, 40, P.ochre, 0.5, 1.5);
        }
        k.dot(x, y, r, col, 1);
      });
    }
    // legend: year and share of enterprises, counting down and back up
    const la = seg(t, T.s1, T.s1 + 0.3) * (1 - seg(t, T.s2Out, T.s2Out + 0.3));
    if (la > 0.002) {
      const yr = t < T.regrow + 0.3 ? '2024' : '2025';
      const flip = t < T.rewind + 0.2 ? '2025' : yr;
      k.text(flip, F.text(30, 600), SAFE.l, 1244, P.ink, la, 'left', 3);
      k.text('OF EU ENTERPRISES USE AI', F.text(24, 600), SAFE.l + 104, 1244, P.muted, la, 'left', 2.6);
      k.num(litCount(t), SAFE.r, 1256, 76, { dec: 1, align: 'right', alpha: la, color: P.ink });
    }
    k.source('Source: Eurostat, 2025. Enterprises with at least 10 employees.', t, 0.6, { tOut: T.s2Out });

    /* ------------------------------------------------ one year earlier */
    k.say('A year earlier,\nit was *13.5%*.', t, T.s1, { tOut: T.s1Out, y: 600 });
    k.say('Almost *50% growth*\nin one year.', t, T.s2, { tOut: T.s2Out, y: 600 });

    /* ----------------------------------------------------- Malta vs EU */
    k.eyebrow('MALTA  ·  2025', t, T.mt, { y: 380, tOut: T.twOut });
    k.say('*29.5%* of people\nuse generative AI\nfor work.', t, T.mt, { tOut: T.mtOut, y: 500 });
    k.say('Nearly *twice*\nthe EU average.', t, T.twice, { tOut: T.twOut, y: 560 });
    const bOut = E.inOutCubic(seg(t, T.twOut - 0.1, T.twOut + 0.35));
    if (t > T.bars - 0.05 && bOut < 1) {
      const g1 = E.outQuint(seg(t, T.bars, T.bars + 0.9)) * (1 - bOut), g2 = E.outQuint(seg(t, T.bars + 0.18, T.bars + 1.0)) * (1 - bOut);
      const a = 1 - seg(bOut, 0.6, 1);
      k.bar(SAFE.l, BAR.mt - BAR.h / 2, MALTA * SCALE, BAR.h, g1, P.ochre, null, a);
      k.bar(SAFE.l, BAR.eu - BAR.h / 2, EU * SCALE, BAR.h, g2, P.pine, null, a);
      const la2 = seg(t, T.bars + 0.1, T.bars + 0.4) * a;
      k.text('MALTA', F.text(26, 600), SAFE.l, BAR.mt - 42, P.ink, la2, 'left', 3.1);
      k.text('EU AVERAGE', F.text(26, 600), SAFE.l, BAR.eu - 42, P.ink, la2, 'left', 3.1);
      k.num(MALTA * E.outQuint(seg(t, T.bars, T.bars + 0.9)), SAFE.l + MALTA * SCALE * g1, BAR.mt - 38, 60, { dec: 1, align: 'right', alpha: la2, color: P.ink });
      k.num(EU * E.outQuint(seg(t, T.bars + 0.18, T.bars + 1.0)), SAFE.l + EU * SCALE * Math.max(g2, 0.62), BAR.eu - 38, 60, { dec: 1, align: 'right', alpha: la2, color: P.ink });
      // nearly twice: the EU length laid off a second time, next to Malta's
      const gp = E.inOutCubic(seg(t, T.ghost, T.ghost + 0.7)) * (1 - bOut);
      if (gp > 0) {
        const x0 = SAFE.l + EU * SCALE, len = EU * SCALE * gp;
        ctx.save(); ctx.setLineDash([12, 10]); ctx.lineWidth = 3; ctx.strokeStyle = rgba(P.pine, 0.75 * a * (1 - seg(bOut, 0, 0.5)));
        k.rrect(x0, BAR.eu - BAR.h / 2, Math.max(BAR.h, len), BAR.h, BAR.h / 2); ctx.stroke();
        const vx = SAFE.l + 2 * EU * SCALE, vp = seg(t, T.ghost + 0.6, T.ghost + 0.95);
        if (vp > 0) { ctx.beginPath(); ctx.moveTo(vx, BAR.eu - BAR.h / 2 - 8); ctx.lineTo(vx, lerp(BAR.eu - BAR.h / 2 - 8, BAR.mt - BAR.h / 2, vp)); ctx.stroke(); }
        ctx.restore();
        k.text('× 2', F.text(34, 600), x0 + EU * SCALE / 2, BAR.eu + 78, P.pine, seg(t, T.ghost + 0.5, T.ghost + 0.8) * a * (1 - seg(bOut, 0, 0.5)), 'center', 1);
      }
    }
    k.source('Source: Eurostat individual GenAI dataset, 2025.', t, T.bars, { tOut: T.twOut });

    /* ------------------------------------------------ stop at the door */
    k.say('National numbers\nstop at your door.', t, T.door, { tOut: T.doorOut, y: 480 });
    k.eyebrow('THEY CAN’T TELL YOU', t, T.list[0] - 0.3, { y: 730, tOut: T.doorOut, color: P.muted });
    const ITEMS = ['Where your people use AI', 'What they use it for', 'Whether they use it well', 'What changed after training'];
    ITEMS.forEach((s, i) => {
      const t0 = T.list[i], y = 850 + i * 136;
      const p = spring(t - t0, 2.4, 0.6), out = E.inOutCubic(seg(t, T.doorOut + i * 0.04, T.doorOut + 0.3 + i * 0.04));
      if (p <= 0.001 || out >= 1) return;
      const a = clamp(p * 2) * (1 - out);
      ctx.save(); ctx.globalAlpha = a;
      ctx.beginPath(); ctx.arc(SAFE.l + 32, y - 16, 34 * clamp(p, 0, 1.2), 0, TAU); ctx.fillStyle = P.ochreSoft; ctx.fill();
      ctx.restore();
      k.text('?', F.disp(46), SAFE.l + 32, y - 1, P.ochre, a * seg(t, t0 + 0.08, t0 + 0.2), 'center');
      k.block(s, F.text(48, 500), SAFE.l + 96, y, 0, P.ink, t, t0 + 0.04, { stagger: 0.035, dur: 0.6, tOut: T.doorOut + i * 0.04 });
    });

    /* --------------------------------------------------- the question */
    k.hook('Where is AI\nalready part of\nyour team’s\ndaily work*?*', t, T.q, { size: 122, y: 640, lh: 1.06, tOut: T.qOut });
  },
  events(k) {
    const ev = [];
    ev.push({ t: 0.22, k: 'swish', v: 0.4 });
    for (let i = 0; i < 20; i++) ev.push({ t: 0.42 + i * 0.03, k: 'ping', x: X0 + (i / 19) * (X1 - X0), m: i });
    ev.push({ t: T.hookOut, k: 'out' });
    ev.push({ t: T.s1, k: 'in' });
    for (let i = 0; i < 7; i++) ev.push({ t: T.rewind + 0.1 + i * 0.08, k: 'unping', m: i });
    ev.push({ t: T.s1Out, k: 'out' }, { t: T.s2, k: 'in' });
    for (let i = 0; i < 7; i++) ev.push({ t: T.regrow + 0.05 + i * 0.09, k: 'ping', x: 700, m: 12 + i });
    ev.push({ t: T.s2Out, k: 'out' }, { t: T.mt, k: 'in' }, { t: T.collapse, k: 'suck', d: T.bars - T.collapse });
    ev.push({ t: T.bars, k: 'zip', v: 1 }, { t: T.bars + 0.18, k: 'zip', v: 0.7 });
    ev.push({ t: T.mtOut, k: 'out' }, { t: T.twice, k: 'in' });
    ev.push({ t: T.ghost, k: 'tape' }, { t: T.ghost + 0.6, k: 'tick', v: 1 }, { t: T.ghost + 0.95, k: 'tick', v: 1 });
    ev.push({ t: T.twOut, k: 'out' }, { t: T.door, k: 'in' });
    T.list.forEach((t0, i) => ev.push({ t: t0, k: 'item', m: i }));
    ev.push({ t: T.doorOut, k: 'out' }, { t: T.q, k: 'question' }, { t: T.qOut, k: 'out' });
    return ev;
  },
  music: {
    // D major, bright. Bars of 2.4 s; the point lands on the downbeat at 21.6.
    chords: [
      [0, 2.4, 38, [57, 62, 66, 69, 74]], [2.4, 4.8, 35, [54, 57, 62, 66, 73]], [4.8, 7.2, 43, [55, 59, 62, 66, 69]],
      [7.2, 9.6, 45, [57, 61, 64, 69, 76]], [9.6, 12.0, 42, [57, 62, 66, 69, 73]], [12.0, 14.4, 43, [55, 59, 62, 67, 71]],
      [14.4, 16.8, 40, [55, 59, 62, 66, 71]], [16.8, 19.2, 45, [57, 62, 64, 69, 76]], [19.2, 21.6, 45, [57, 61, 64, 67, 76]],
      [21.6, 24.6, 38, [50, 54, 57, 61, 64, 69]],
    ],
    drums: [[0, 12.6, 'groove'], [12.6, 17.4, 'pulse'], [17.4, 20.4, 'half'], [20.4, 21.6, 'none']],
    bass: [[0, 17.4, 'eighths'], [17.4, 21.2, 'quarters']],
    arps: [[0, 12.6, 0.3], [12.6, 17.4, 0.6]],
  },
});

// Reel 03 · Who is more ready? Hook: two employees, pick one.
// From the deck: Employee A uses AI every day, accepts outputs without verification and uploads
// sensitive information. Employee B uses AI once a week, verifies important outputs and knows when
// to escalate. Usage alone cannot show readiness.
import { film, P, F, E, SAFE, CW, NEG, POS, clamp, lerp, seg, spring, mix, rgba, TAU } from './kit.js';

const T = {
  cards: 0.3, hookOut: 11.2,
  pick: 3.0, hops: [3.0, 3.6, 4.2, 4.8], pickOut: 5.3,
  a: [5.5, 6.2], b: [8.3, 9.0],
  verdict: 11.4, vText: 11.6, vOut: 14.2,
  cardsOut: 14.1, usage: 14.5, usageOut: 17.1,
  measure: 17.4, note: 18.3, mOut: 20.85,
};
const CARD = { x: SAFE.l, w: CW, h: 356, r: 28 };
const PEOPLE = [
  { y: 700, tag: 'EMPLOYEE A', title: 'Uses AI every day', items: ['Accepts outputs without verification', 'Uploads sensitive information'], good: false, t: T.a },
  { y: 1092, tag: 'EMPLOYEE B', title: 'Uses AI once a week', items: ['Verifies important outputs', 'Knows when to escalate'], good: true, t: T.b },
];
const NEG_SOFT = mix(NEG, P.surface, 0.86);

export default film({
  id: '03-who-is-ready', land: 21.6, T,
  heavy: [[T.cardsOut - 0.05, T.cardsOut + 0.6, 12]],
  draw(k, t) {
    const { ctx } = k;
    k.hook('Who is more\nready for AI?', t, -0.22, { size: 128, y: 410, lh: 1.05, tOut: T.hookOut });
    k.say('Using it more\nisn’t the same as\nusing it *well*.', t, T.vText, { tOut: T.vOut, y: 380 });

    /* ---------------------------------------------------------- cards */
    const win = spring(t - T.verdict, 2.0, 0.62);             // B wins
    const out = E.inCubic(seg(t, T.cardsOut, T.cardsOut + 0.55));
    const x0 = CARD.x + 40;
    PEOPLE.forEach((pp, i) => {
      const cin = spring(t - T.cards - i * 0.14, 1.7, 0.7);
      if (cin <= 0.001 || out >= 1) return;
      const y = pp.y + (1 - clamp(cin)) * 300 + out * (1100 + i * 160);
      const dim = pp.good ? 1 : 1 - 0.45 * clamp(win);
      const fillP = pp.good ? clamp(win) : 0;
      const sc = pp.good ? 1 + 0.025 * clamp(win) : 1;
      ctx.save(); ctx.translate(540, y + CARD.h / 2); ctx.scale(sc, sc); ctx.translate(-540, -(y + CARD.h / 2));
      ctx.save(); ctx.globalAlpha = clamp(cin * 2) * dim;
      k.card(CARD.x, y, CARD.w, CARD.h, CARD.r, mix(P.surface, P.pine, fillP), 1, 0.12 + 0.1 * fillP, fillP > 0.5 ? null : P.border);
      ctx.restore();
      const a = clamp(cin * 2) * dim;
      const ink = mix(P.ink, P.onPine, fillP), muted = mix(P.muted, '#B9C8C2', fillP);
      k.text(pp.tag, F.text(24, 600), x0, y + 62, muted, a, 'left', 2.8);
      k.text(pp.title, F.disp(64), x0, y + 142, ink, a);
      ctx.globalAlpha = a; ctx.fillStyle = mix(P.border, '#3C665F', fillP); ctx.fillRect(x0, y + 182, CARD.w - 80, 2); ctx.globalAlpha = 1;
      pp.items.forEach((s, j) => {
        const t0 = pp.t[j], p = spring(t - t0, 2.4, 0.6);
        if (p <= 0.001) return;
        const iy = y + 254 + j * 68, ia = a * clamp(p * 2);
        const soft = pp.good ? mix(P.pineSoft, '#2F5E56', fillP) : NEG_SOFT;
        ctx.save(); ctx.globalAlpha = ia; ctx.beginPath(); ctx.arc(x0 + 22, iy - 12, 24 * clamp(p, 0, 1.2), 0, TAU); ctx.fillStyle = soft; ctx.fill(); ctx.restore();
        const mp = E.outCubic(seg(t, t0 + 0.1, t0 + 0.4));
        ctx.globalAlpha = ia;
        if (pp.good) k.check(x0 + 22, iy - 12, 28, mp, mix(POS, P.onPine, fillP), 4.5);
        else k.cross(x0 + 22, iy - 12, 28, mp, NEG, 4.5);
        ctx.globalAlpha = 1;
        k.block(s, F.text(36, 500), x0 + 66, iy, 0, ink, t, t0 + 0.05, { stagger: 0.03, dur: 0.55, alpha: dim });
      });
      // the verdict tag, top right of B
      if (pp.good) {
        const tg = spring(t - T.verdict - 0.2, 2.4, 0.6);
        if (tg > 0.001) {
          const f = F.text(24, 600), w = k.measure('MORE READY', f, 2.8) + 48, cx = CARD.x + CARD.w - 40 - w / 2, ty = y + 54;
          ctx.save(); ctx.translate(cx, ty); ctx.scale(clamp(tg, 0, 1.2), clamp(tg, 0, 1.2));
          k.pill(-w / 2, -26, w, 52); ctx.fillStyle = P.ochre; ctx.fill(); ctx.restore();
          k.text('MORE READY', f, cx + 1.4, ty + 9, '#3B2E12', clamp(tg * 2), 'center', 2.8);
        }
      }
      ctx.restore();
      // "Pick one": a selector hops between the two cards
      const hop = T.hops.findIndex((h, n) => t >= h && t < (T.hops[n + 1] ?? T.pickOut));
      if (hop >= 0 && hop % 2 === i) {
        const hp = E.outCubic(seg(t, T.hops[hop], T.hops[hop] + 0.18));
        ctx.save(); ctx.globalAlpha = hp; ctx.lineWidth = 5; ctx.strokeStyle = P.ochre;
        k.rrect(CARD.x - 10 * hp, y - 10 * hp, CARD.w + 20 * hp, CARD.h + 20 * hp, CARD.r + 10 * hp); ctx.stroke(); ctx.restore();
      }
    });
    const pa = seg(t, T.pick, T.pick + 0.25) * (1 - seg(t, T.pickOut, T.pickOut + 0.3));
    if (pa > 0.002) k.text('Pick one.', F.text(40, 500), SAFE.l, 628, P.ochre, pa);

    /* ------------------------------------------------------ the point */
    k.say('Usage alone\ncan’t show\n*readiness*.', t, T.usage, { tOut: T.usageOut, y: 700, size: 116, lh: 1.06 });
    k.say('Readiness has\nto be *measured*.', t, T.measure, { tOut: T.mOut, y: 620 });
    k.note('Mesura scores six dimensions of readiness, including what people actually know. Anonymously.', t, T.note, { y: 900, tOut: T.mOut, size: 42 });
  },
  events(k) {
    const ev = [{ t: T.cards, k: 'card' }, { t: T.cards + 0.14, k: 'card' }];
    T.hops.forEach((h, i) => ev.push({ t: h, k: 'hop', m: i }));
    T.a.forEach(t0 => ev.push({ t: t0, k: 'cross' }));
    T.b.forEach(t0 => ev.push({ t: t0, k: 'check' }));
    ev.push({ t: T.verdict, k: 'reveal' }, { t: T.vText, k: 'in' }, { t: T.vOut, k: 'out' });
    ev.push({ t: T.cardsOut, k: 'drop2' }, { t: T.usage, k: 'in' }, { t: T.usageOut, k: 'out' });
    ev.push({ t: T.measure, k: 'in' }, { t: T.note, k: 'item', m: 2 }, { t: T.mOut, k: 'out' });
    return ev;
  },
  music: {
    chords: [
      [0, 2.4, 43, [55, 59, 62, 66, 71]], [2.4, 4.8, 45, [57, 61, 64, 69, 73]], [4.8, 7.2, 35, [54, 59, 62, 66]],
      [7.2, 9.6, 42, [54, 57, 61, 64, 69]], [9.6, 12.0, 43, [55, 59, 62, 67, 71]], [12.0, 14.4, 42, [57, 62, 66, 69, 74]],
      [14.4, 16.8, 40, [55, 59, 62, 66, 71]], [16.8, 19.2, 43, [55, 59, 62, 67, 74]], [19.2, 21.6, 45, [57, 62, 64, 69, 76]],
      [21.6, 24.6, 38, [50, 54, 57, 61, 64, 69]],
    ],
    drums: [[0, 3.0, 'groove'], [3.0, 5.4, 'clock'], [5.4, 11.4, 'pulse'], [11.4, 16.8, 'groove'], [16.8, 20.4, 'half'], [20.4, 21.6, 'none']],
    bass: [[0, 3.0, 'eighths'], [3.0, 5.4, 'hold'], [5.4, 11.4, 'quarters'], [11.4, 16.8, 'eighths'], [16.8, 21.2, 'quarters']],
    arps: [[5.4, 11.4, 0.6], [11.4, 16.8, 0.3]],
  },
});

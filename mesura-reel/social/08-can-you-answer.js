// Reel 08 · Can you answer this? Hook: a real question from the Mesura assessment.
// From the deck: "AI chatbots sometimes give different answers when asked the same question twice.
// Why is that?" The answer: it builds each answer by predicting likely wording, so answers can
// vary. Demonstrated asks seven knowledge and judgment questions, marked correct, unsure or wrong.
// Every other dimension is self-rated; this one has correct answers.
import { film, P, F, E, SAFE, CW, POS, NEG, clamp, lerp, seg, spring, mix, rgba, TAU } from './kit.js';

const T = {
  hookOut: 2.35,
  card: 2.45, q: 2.75, opts: 3.25, count: 4.3, reveal: 7.3, cardOut: 9.0,
  why: 9.3, whyOut: 11.75,
  seven: 12.0, dots: 12.7, sevenOut: 14.55,
  tested: 14.8, testedOut: 17.55,
  conf: 17.8, both: 18.7, confOut: 20.85,
};
const OPTS = ['The internet connection changes', 'It predicts likely wording', 'It is faulty', 'It remembers you personally and adapts', 'I’m not sure'];
const RIGHT = 1;
const CARD = { x: SAFE.l, y: 520, w: CW, h: 890, r: 30 };
const MARKS = ['right', 'right', 'unsure', 'right', 'wrong', 'right', 'right'];

export default film({
  id: '08-can-you-answer', land: 21.6, T,
  heavy: [[T.cardOut, T.cardOut + 0.5, 12]],
  draw(k, t) {
    const { ctx } = k;
    k.hook('Can you\nanswer *this*?', t, -0.22, { size: 140, y: 620, lh: 1.04, tOut: T.hookOut });

    /* ---------------------------------------------------------- the card */
    const cin = spring(t - T.card, 1.6, 0.74), cout = E.inCubic(seg(t, T.cardOut, T.cardOut + 0.5));
    if (cin > 0.001 && cout < 1) {
      const y = CARD.y + (1 - clamp(cin)) * 900 + cout * 1300, a = clamp(cin * 2), x0 = CARD.x + 44;
      k.eyebrow('FROM THE MESURA ASSESSMENT', t, T.card + 0.1, { y: CARD.y - 60 + cout * 1300, tOut: T.cardOut - 0.2, color: P.muted });
      k.card(CARD.x, y, CARD.w, CARD.h, CARD.r, P.surface, a, 0.14);
      k.text('DEMONSTRATED', F.text(22, 600), x0, y + 70, P.muted, a, 'left', 2.6);
      k.block('AI chatbots sometimes give different\nanswers when asked the same\nquestion twice. Why is that?', F.disp(48), x0, y + 152, 58, P.ink, t, T.q, { stagger: 0.03 });
      // countdown ring, top right of the card
      const cp = seg(t, T.count, T.reveal), ca = seg(t, T.count - 0.2, T.count) * (1 - seg(t, T.reveal, T.reveal + 0.25));
      if (ca > 0.002) {
        const cx = CARD.x + CARD.w - 84, cy = y + 76, pulse = 1 + 0.08 * Math.exp(-((cp * 3) % 1) * 8);
        ctx.globalAlpha = ca; ctx.beginPath(); ctx.arc(cx, cy, 44 * pulse, 0, TAU); ctx.fillStyle = P.ochreSoft; ctx.fill();
        ctx.beginPath(); ctx.arc(cx, cy, 44, 0, TAU); ctx.lineWidth = 8; ctx.strokeStyle = P.track; ctx.stroke();
        ctx.beginPath(); ctx.arc(cx, cy, 44, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - cp)); ctx.strokeStyle = P.ochre; ctx.stroke(); ctx.globalAlpha = 1;
        k.text(String(Math.max(1, 3 - Math.floor(cp * 3))), F.disp(48), cx, cy + 17, P.ink, ca, 'center');
      }
      const rv = spring(t - T.reveal, 2.4, 0.6);
      OPTS.forEach((o, i) => {
        const t0 = T.opts + i * 0.12, oy = y + 400 + i * 102, p = spring(t - t0, 2.6, 0.62);
        if (p <= 0.001) return;
        const right = i === RIGHT, fade = right ? 1 : 1 - 0.6 * clamp(rv);
        const oa = a * clamp(p * 2) * fade;
        if (right && rv > 0.001) { ctx.save(); ctx.globalAlpha = a * clamp(rv); k.rrect(x0 - 18, oy - 52, CW - 52, 80, 18); ctx.fillStyle = P.pine; ctx.fill(); ctx.restore(); }
        const ink = right ? mix(P.ink, P.onPine, clamp(rv)) : P.ink;
        ctx.globalAlpha = oa; ctx.beginPath(); ctx.arc(x0 + 16, oy - 12, 16, 0, TAU); ctx.lineWidth = 3;
        ctx.strokeStyle = right ? mix(P.faint, P.onPine, clamp(rv)) : P.faint; ctx.stroke(); ctx.globalAlpha = 1;
        if (right && rv > 0.001) { ctx.globalAlpha = a; k.check(x0 + 16, oy - 12, 30, E.outCubic(seg(t, T.reveal + 0.1, T.reveal + 0.4)), P.onPine, 4.5); ctx.globalAlpha = 1; }
        k.text(o, F.text(34, right && rv > 0.5 ? 600 : 500), x0 + 52, oy, ink, oa);
      });
    }

    /* -------------------------------------------------------------- why */
    k.say('It isn’t faulty.\nIt predicts likely\n*wording*.', t, T.why, { tOut: T.whyOut, y: 640, size: 108, lh: 1.06 });
    k.note('So the same question can get a different answer.', t, T.why + 0.8, { y: 1070, tOut: T.whyOut, size: 44 });

    /* ------------------------------------------------------ seven questions */
    k.say('Mesura asks seven\nquestions like this.', t, T.seven, { tOut: T.sevenOut, y: 520 });
    const so = E.inOutCubic(seg(t, T.sevenOut, T.sevenOut + 0.35));
    MARKS.forEach((m, i) => {
      const t0 = T.dots + i * 0.14, p = spring(t - t0, 2.6, 0.58);
      if (p <= 0.001 || so >= 1) return;
      const cx = SAFE.l + 50 + i * ((CW - 100) / 6), cy = 860, a = clamp(p * 2) * (1 - so), r = 44 * clamp(p, 0, 1.25);
      const fill = m === 'right' ? P.pineSoft : m === 'wrong' ? mix(NEG, P.surface, 0.86) : P.ochreSoft;
      ctx.save(); ctx.globalAlpha = a; ctx.beginPath(); ctx.arc(cx, cy - so * 40, r, 0, TAU); ctx.fillStyle = fill; ctx.fill(); ctx.restore();
      const mp = E.outCubic(seg(t, t0 + 0.1, t0 + 0.4));
      ctx.globalAlpha = a;
      if (m === 'right') k.check(cx, cy - so * 40, 50, mp, POS, 5.5);
      else if (m === 'wrong') k.cross(cx, cy - so * 40, 50, mp, NEG, 5.5);
      else k.text('?', F.disp(52), cx, cy + 18 - so * 40, P.ochre, a * mp, 'center');
      ctx.globalAlpha = 1;
    });
    const la = seg(t, T.dots + 1.1, T.dots + 1.4) * (1 - so);
    if (la > 0.002) {
      [['Correct', POS], ['Unsure', P.ochre], ['Wrong', NEG]].forEach(([s, c], i) => {
        const lx = SAFE.l + i * 230;
        k.dot(lx + 10, 1002, 10, c, la);
        k.text(s, F.text(34, 500), lx + 34, 1014, P.body, la);
      });
    }

    /* ------------------------------------------------------- tested, not rated */
    k.say('Every other dimension\nis self-rated. This one\nhas *right answers*.', t, T.tested, { tOut: T.testedOut, y: 640, size: 88, lh: 1.1 });

    /* ------------------------------------------------ confidence vs capability */
    k.say('Confidence isn’t\n*capability*.', t, T.conf, { tOut: T.confOut, y: 660, size: 116, lh: 1.05 });
    k.note('Mesura measures both.', t, T.both, { y: 900, tOut: T.confOut, size: 48, color: P.ink });
  },
  events(k) {
    const ev = [{ t: T.hookOut, k: 'out' }, { t: T.card, k: 'card' }];
    OPTS.forEach((o, i) => ev.push({ t: T.opts + i * 0.12, k: 'tick', v: 0.7, f: 3200 + 300 * i, p: -0.2 }));
    [0, 1, 2].forEach(i => ev.push({ t: T.count + i, k: 'beep', m: i }));
    ev.push({ t: T.reveal, k: 'reveal' }, { t: T.reveal + 0.1, k: 'check' }, { t: T.cardOut, k: 'drop2' });
    ev.push({ t: T.why, k: 'in' }, { t: T.why + 0.8, k: 'item', m: 1 }, { t: T.whyOut, k: 'out' }, { t: T.seven, k: 'in' });
    MARKS.forEach((m, i) => ev.push({ t: T.dots + i * 0.14, k: m === 'right' ? 'check' : m === 'wrong' ? 'cross' : 'hmm' }));
    ev.push({ t: T.sevenOut, k: 'out' }, { t: T.tested, k: 'in' }, { t: T.testedOut, k: 'out' });
    ev.push({ t: T.conf, k: 'question' }, { t: T.both, k: 'item', m: 3 }, { t: T.confOut, k: 'out' });
    return ev;
  },
  music: {
    chords: [
      [0, 2.4, 35, [54, 59, 62, 66, 71]], [2.4, 4.8, 43, [55, 59, 62, 67, 71]], [4.8, 7.2, 45, [57, 62, 64, 69, 76]],
      [7.2, 9.6, 38, [57, 62, 66, 69, 74]], [9.6, 12.0, 42, [57, 62, 66, 69, 73]], [12.0, 14.4, 43, [55, 59, 62, 67, 71]],
      [14.4, 16.8, 40, [55, 59, 62, 66, 71]], [16.8, 19.2, 35, [54, 57, 62, 66, 69]], [19.2, 21.6, 45, [57, 61, 64, 69, 76]],
      [21.6, 24.6, 38, [50, 54, 57, 61, 64, 69]],
    ],
    drums: [[0, 2.4, 'groove'], [2.4, 4.2, 'half'], [4.2, 7.2, 'clock'], [7.2, 12.0, 'groove'], [12.0, 16.8, 'pulse'], [16.8, 20.4, 'half'], [20.4, 21.6, 'none']],
    bass: [[0, 2.4, 'eighths'], [2.4, 7.2, 'hold'], [7.2, 12.0, 'eighths'], [12.0, 21.2, 'quarters']],
    arps: [[7.2, 12.0, 0.3], [12.0, 16.8, 0.6]],
  },
});

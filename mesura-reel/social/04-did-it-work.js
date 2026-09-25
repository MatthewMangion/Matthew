// Reel 04 · Did it work? Hook: you ran the AI training. Did it work?
// From the deck: progress requires a second measurement. Baseline (what is happening now?),
// targeted action (what should change?), remeasurement (what actually changed?). The difference
// between two measurements is the evidence. Measurement history: 43 -> 59 -> 71 -> 81.
import { film, P, F, E, SAFE, CW, POS, clamp, lerp, seg, spring, mix, rgba, TAU, ringSec } from './kit.js';

const T = {
  todo: [0.45, 0.75, 1.05], impact: 1.45, hookOut: 2.9,
  base: 3.1, steps: [4.0, 5.2, 6.4], baseOut: 8.9,
  again: 9.2, takes: [9.8, 11.0, 12.2, 13.4], againOut: 14.55,
  diff: 14.8, bracket: 15.9, diffOut: 17.6,
  q: 17.9, qOut: 20.85,
};
const TAKES = [43, 59, 71, 81];
const RING = { x: 540, y: 1050, ro: 210, ri: 176 };
const arcEnd = v => -Math.PI / 2 + (TAU * v) / 100;

export default film({
  id: '04-did-it-work', land: 21.6, T,
  heavy: [[T.baseOut - 0.05, T.baseOut + 0.5, 12]],
  draw(k, t) {
    const { ctx } = k;
    /* ---------------------------------------------------------- hook */
    k.hook('You ran the\nAI training.\n*Did it work?*', t, -0.22, { size: 124, y: 420, lh: 1.07, tOut: T.hookOut });
    const TODO = ['AI workshop', 'New AI policy', 'Tool rollout', 'Impact'];
    TODO.forEach((s, i) => {
      const t0 = i < 3 ? T.todo[i] - 0.25 : T.impact - 0.3, y = 900 + i * 118;
      const p = spring(t - t0 + 0.15, 2.4, 0.65), out = E.inOutCubic(seg(t, T.hookOut + i * 0.04, T.hookOut + 0.3 + i * 0.04));
      if (p <= 0.001 || out >= 1) return;
      const a = clamp(p * 2) * (1 - out), dy = -out * 40;
      ctx.save(); ctx.globalAlpha = a; k.rrect(SAFE.l, y - 44 + dy, 60, 60, 14);
      ctx.fillStyle = i < 3 ? mix(P.surface, P.pineSoft, seg(t, T.todo[i] || 0, (T.todo[i] || 0) + 0.2)) : P.ochreSoft; ctx.fill();
      ctx.lineWidth = 2.5; ctx.strokeStyle = i < 3 ? P.borderStrong : P.ochre; ctx.stroke(); ctx.restore();
      ctx.globalAlpha = a;
      if (i < 3) k.check(SAFE.l + 30, y - 14 + dy, 40, E.outCubic(seg(t, T.todo[i], T.todo[i] + 0.25)), P.pine, 6);
      ctx.globalAlpha = 1;
      if (i === 3) {
        const q = spring(t - T.impact, 2.2, 0.45);
        ctx.save(); ctx.translate(SAFE.l + 30, y - 14 + dy); ctx.scale(clamp(q, 0, 1.4), clamp(q, 0, 1.4));
        k.text('?', F.disp(52), 0, 18, P.ochre, a, 'center'); ctx.restore();
      }
      k.text(s, F.text(48, 500), SAFE.l + 96, y + dy, i < 3 ? P.body : P.ink, a);
    });

    /* ------------------------------------------------ baseline, action, again */
    k.say('Progress needs\n*two* measurements.', t, T.base, { tOut: T.baseOut, y: 470 });
    const STEPS = [['Baseline', 'What is happening now?'], ['Targeted action', 'What should change?'], ['Remeasurement', 'What actually changed?']];
    const sx = SAFE.l + 38, sy = 770, gap = 220;
    const lineP = E.inOutCubic(seg(t, T.steps[0] + 0.2, T.steps[2])) * (1 - E.inOutCubic(seg(t, T.baseOut, T.baseOut + 0.4)));
    if (lineP > 0) { ctx.fillStyle = P.borderStrong; ctx.fillRect(sx - 1.5, sy, 3, 2 * gap * lineP); }
    STEPS.forEach(([title, q], i) => {
      const t0 = T.steps[i], y = sy + i * gap, p = spring(t - t0, 2.4, 0.6);
      const out = E.inOutCubic(seg(t, T.baseOut + i * 0.05, T.baseOut + 0.35 + i * 0.05));
      if (p <= 0.001 || out >= 1) return;
      const a = clamp(p * 2) * (1 - out), r = 36 * clamp(p, 0, 1.2);
      ctx.save(); ctx.globalAlpha = a; ctx.beginPath(); ctx.arc(sx, y, r, 0, TAU); ctx.fillStyle = i === 2 ? P.ochre : P.pine; ctx.fill(); ctx.restore();
      k.text(String(i + 1), F.disp(44), sx, y + 15, i === 2 ? '#3B2E12' : P.onPine, a, 'center');
      k.block(title, F.disp(70), sx + 80, y + 10, 0, P.ink, t, t0 + 0.06, { tOut: T.baseOut + i * 0.05 });
      k.block(q, F.text(40, 400), sx + 82, y + 72, 0, P.body, t, t0 + 0.16, { stagger: 0.03, tOut: T.baseOut + i * 0.05 });
    });

    /* --------------------------------------------------- keep measuring */
    k.say('Measure, act,\nmeasure *again*.', t, T.again, { tOut: T.againOut, y: 470 });
    const rin = spring(t - T.again - 0.3, 1.6, 0.7), rout = E.inCubic(seg(t, T.againOut, T.againOut + 0.4));
    if (rin > 0.001 && rout < 1) {
      const a = clamp(rin * 2) * (1 - rout), s = lerp(0.85, 1, clamp(rin)) * (1 - 0.1 * rout);
      ctx.save(); ctx.translate(RING.x, RING.y); ctx.scale(s, s); ctx.globalAlpha = a;
      ctx.beginPath(); ctx.arc(0, 0, (RING.ro + RING.ri) / 2, 0, TAU); ctx.lineWidth = RING.ro - RING.ri; ctx.strokeStyle = P.track; ctx.stroke();
      // the value steps through the takes
      let v = 0, take = -1;
      T.takes.forEach((t0, i) => { if (t >= t0) take = i; });
      if (take >= 0) {
        const from = take ? TAKES[take - 1] : 0, p = E.outQuint(seg(t, T.takes[take], T.takes[take] + 0.8));
        v = lerp(from, TAKES[take], p);
      }
      if (v > 0.4) { k.pathSec({ a: ringSec(RING.ro, RING.ri, -Math.PI / 2, arcEnd(v)) }, 0, 0, 1, 1); ctx.fillStyle = P.pine; ctx.fill(); }
      if (v > 0.4) { const hr = (RING.ro + RING.ri) / 2, ae = arcEnd(v); k.dot(hr * Math.cos(ae), hr * Math.sin(ae), 13, P.ochre, a); }
      ctx.restore();
      k.num(v, RING.x - 8, RING.y + 50, 150, { intCols: 2, align: 'center', alpha: a, suffixScale: 0.36 });
      k.text(take >= 0 ? `TAKE ${take + 1}` : '', F.text(24, 600), RING.x, RING.y + 104, P.muted, a, 'center', 2.8);
      // delta badges stack up beside the ring
      T.takes.forEach((t0, i) => {
        if (!i) return;
        const bp = spring(t - t0 - 0.35, 2.6, 0.6);
        if (bp <= 0.001) return;
        const s = `▲ ${TAKES[i] - TAKES[i - 1]}`, f = F.text(36, 600), w = k.measure(s, f) + 44;
        const x = lerp(SAFE.l + 80, SAFE.r - 80, (i - 1) / 2), y = RING.y + 300;
        ctx.save(); ctx.translate(x, y); ctx.scale(clamp(bp, 0, 1.2), clamp(bp, 0, 1.2)); ctx.globalAlpha = a;
        k.pill(-w / 2, -32, w, 64); ctx.fillStyle = P.pineSoft; ctx.fill(); ctx.restore();
        k.text(s, f, x, y + 13, POS, a * clamp(bp * 2), 'center');
        k.text(`TAKE ${i} → ${i + 1}`, F.text(24, 600), x, y + 72, P.muted, a * clamp(bp * 2), 'center', 2.4);
      });
    }

    /* ------------------------------------------------------ the evidence */
    k.say('The difference\nbetween two\nmeasurements is\nthe *evidence*.', t, T.diff, { tOut: T.diffOut, y: 460 });
    const bp = E.inOutCubic(seg(t, T.bracket, T.bracket + 0.6)), bo = E.inOutCubic(seg(t, T.diffOut, T.diffOut + 0.35));
    if (t > T.diff + 0.4 && bo < 1) {
      const a = seg(t, T.diff + 0.4, T.diff + 0.7) * (1 - bo), y0 = 1060, y1 = 1260;
      k.text('TAKE 1', F.text(26, 600), SAFE.l, y0 - 62, P.muted, a, 'left', 3);
      k.text('TAKE 4', F.text(26, 600), SAFE.l, y1 - 62, P.muted, a, 'left', 3);
      k.bar(SAFE.l, y0 - 32, CW * 0.8, 44, 0.43, P.faint, P.track, a);
      k.bar(SAFE.l, y1 - 32, CW * 0.8, 44, 0.81, P.pine, P.track, a);
      k.text('43%', F.disp(58), SAFE.l + CW * 0.8 * 0.43 + 20, y0 + 8, P.muted, a);
      k.text('81%', F.disp(58), SAFE.l + CW * 0.8 * 0.81 + 20, y1 + 8, P.ink, a);
      if (bp > 0) {
        const bx = SAFE.l + CW * 0.8 * 0.43, ex = SAFE.l + CW * 0.8 * 0.81;
        ctx.save(); ctx.globalAlpha = a; ctx.setLineDash([10, 8]); ctx.strokeStyle = P.ochre; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(bx, y0 + 12); ctx.lineTo(bx, lerp(y0 + 12, y1 - 36, bp)); ctx.stroke();
        ctx.setLineDash([]); ctx.fillStyle = rgba(P.ochre, 0.22); ctx.fillRect(bx, y1 - 32, (ex - bx) * bp, 44); ctx.restore();
        k.text('+38 points', F.disp(64), bx + 20, y1 + 118, P.ochre, a * seg(t, T.bracket + 0.4, T.bracket + 0.7));
      }
    }

    /* --------------------------------------------------- the question */
    k.hook('How will you\nknow it *worked*?', t, T.q, { size: 122, y: 700, lh: 1.07, tOut: T.qOut });
  },
  events(k) {
    const ev = [];
    T.todo.forEach((t0, i) => ev.push({ t: t0, k: 'check' }));
    ev.push({ t: T.impact, k: 'hmm' }, { t: T.hookOut, k: 'out' }, { t: T.base, k: 'in' });
    T.steps.forEach((t0, i) => ev.push({ t: t0, k: 'item', m: i + 1 }));
    ev.push({ t: T.baseOut, k: 'out' }, { t: T.again, k: 'in' });
    T.takes.forEach((t0, i) => ev.push({ t: t0, k: 'take', m: i }));
    ev.push({ t: T.againOut, k: 'drop2' }, { t: T.diff, k: 'in' }, { t: T.bracket, k: 'tape' }, { t: T.bracket + 0.5, k: 'name' });
    ev.push({ t: T.diffOut, k: 'out' }, { t: T.q, k: 'question' }, { t: T.qOut, k: 'out' });
    return ev;
  },
  music: {
    // A climb from E minor to D: every bar a step up.
    chords: [
      [0, 2.4, 40, [55, 59, 62, 66, 71]], [2.4, 4.8, 42, [57, 61, 64, 66, 69]], [4.8, 7.2, 43, [55, 59, 62, 66, 71]],
      [7.2, 9.6, 45, [57, 62, 64, 69, 74]], [9.6, 12.0, 35, [54, 57, 62, 66, 69]], [12.0, 14.4, 37, [57, 61, 64, 69, 73]],
      [14.4, 16.8, 42, [57, 62, 66, 69, 74]], [16.8, 19.2, 43, [55, 59, 62, 67, 71]], [19.2, 21.6, 45, [57, 61, 64, 69, 76]],
      [21.6, 24.6, 38, [50, 54, 57, 61, 64, 69]],
    ],
    drums: [[0, 3.0, 'groove'], [3.0, 9.6, 'pulse'], [9.6, 14.4, 'groove'], [14.4, 20.4, 'half'], [20.4, 21.6, 'none']],
    bass: [[0, 3.0, 'eighths'], [3.0, 9.6, 'quarters'], [9.6, 14.4, 'eighths'], [14.4, 21.2, 'quarters']],
    arps: [[3.0, 9.6, 0.6], [9.6, 14.4, 0.3]],
  },
});

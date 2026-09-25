// Reel 07 · What you get. Hook: one assessment, here's what you get.
// From the deck's report: one headline score with a named tier and its two comparisons; the
// strongest dimension and focus area called out by name; six dimensions side by side against the
// sector and the Mesura median; findings become named actions; scheduled remeasurement, proof that
// what you did made a difference (history 43 -> 59 -> 71 -> 81).
import { film, P, F, E, SAFE, CW, POS, DIMS, OVERALL, clamp, lerp, seg, spring, mix, rgba, TAU, ringSec } from './kit.js';

const T = {
  peek: 0.35, hookOut: 2.85, rise: 2.9,
  s: [3.1, 6.0, 8.9, 12.0, 15.0], proof: 17.7, out: 20.35,
};
const SH = { x: SAFE.l, y: 590, w: CW, h: 870, r: 30 };
const SCROLL = [0, 0, 590, 1040, 1330];                       // content offset for each section
const HEAD = ['A readiness score\nand a named *tier*.', 'Your strongest area,\nand where to *focus*.', 'Six dimensions,\n*benchmarked*.', 'Named *actions*, tied\nto your answers.', 'Then a scheduled\n*remeasurement*.'];
const HIST = [43, 59, 71, 81];

export default film({
  id: '07-the-report', land: 21.6, T,
  heavy: T.s.slice(2).map(t0 => [t0, t0 + 0.7, 12]).concat([[T.rise, T.rise + 0.5, 12]]),
  draw(k, t) {
    const { ctx } = k;
    k.hook('One assessment.\nHere’s what\nyou *get*.', t, -0.22, { size: 118, y: 400, lh: 1.06, tOut: T.hookOut });
    HEAD.forEach((h, i) => k.say(h, t, T.s[i], { size: 80, y: 400, lh: 1.1, tOut: (i < 4 ? T.s[i + 1] : T.proof) - 0.3 }));
    k.say('Proof that what you\ndid made a *difference*.', t, T.proof, { size: 80, y: 400, lh: 1.1, tOut: T.out });

    /* -------------------------------------------------------- the sheet */
    const peek = spring(t - T.peek, 1.4, 0.8), up = E.inOutCubic(seg(t, T.rise, T.rise + 0.6));
    const gone = E.inCubic(seg(t, T.out, T.out + 0.45));
    if (peek <= 0.001) return;
    const top = lerp(lerp(1960, 1250, clamp(peek)), SH.y, up) + gone * 1400;
    let scroll = 0;
    SCROLL.forEach((s, i) => { if (i) scroll = lerp(scroll, s, E.inOutCubic(seg(t, T.s[i] - 0.1, T.s[i] + 0.55))); });
    k.card(SH.x, top, SH.w, SH.h + 600 * (1 - up), SH.r, P.surface, 1, 0.14, P.border);
    ctx.save(); k.rrect(SH.x, top, SH.w, SH.h + 600 * (1 - up), SH.r); ctx.clip();
    ctx.translate(SH.x, top - scroll);
    const x0 = 44, IW = SH.w - 88;
    const vis = (t0, d = 0.3) => seg(t, t0, t0 + d);
    const div = (y, t0) => { const p = E.outExpo(seg(t, t0, t0 + 0.6)); ctx.fillStyle = P.border; ctx.fillRect(x0, y, IW * p, 2); };
    k.text('MESURA DIAGNOSTIC  ·  TAKE 1', F.text(22, 600), x0, 72, P.muted, 1, 'left', 2.6);

    // 1 · score and tier
    const s1 = T.s[0], rv = OVERALL.score * E.outQuint(seg(t, s1 + 0.1, s1 + 1.1)), rc = { x: x0 + 110, y: 250 };
    ctx.beginPath(); ctx.arc(rc.x, rc.y, 96, 0, TAU); ctx.lineWidth = 22; ctx.strokeStyle = P.track; ctx.stroke();
    if (rv > 0.3) { k.pathSec({ a: ringSec(107, 85, -Math.PI / 2, -Math.PI / 2 + (TAU * rv) / 100) }, rc.x, rc.y, 1, 1); ctx.fillStyle = P.pine; ctx.fill(); }
    k.num(rv, rc.x - 4, rc.y + 22, 64, { intCols: 2, align: 'center', suffixScale: 0.45 });
    k.block('Elite AI Navigator', F.disp(52), x0 + 250, 214, 0, P.ink, t, s1 + 0.3);
    k.block('You are at the front of the field on\nevery measure that feeds your score.', F.text(27, 400), x0 + 252, 266, 38, P.body, t, s1 + 0.45, { stagger: 0.02 });
    [['▲ 5% vs your sector', 0], ['▲ 10% vs Mesura', 1]].forEach(([s, i]) => {
      const bp = spring(t - s1 - 0.8 - i * 0.12, 2.6, 0.6);
      if (bp <= 0.001) return;
      const f = F.text(26, 600), w = k.measure(s, f) + 36, bx = x0 + (i ? k.measure('▲ 5% vs your sector', f) + 36 + 14 : 0);
      ctx.save(); ctx.translate(bx + w / 2, 414); ctx.scale(clamp(bp, 0, 1.2), clamp(bp, 0, 1.2)); k.pill(-w / 2, -24, w, 48); ctx.fillStyle = P.pineSoft; ctx.fill(); ctx.restore();
      k.text(s, f, bx + w / 2, 423, POS, clamp(bp * 2), 'center');
    });
    div(476, s1 + 0.9);

    // 2 · strongest and focus
    const s2 = T.s[1];
    [[DIMS[0], 'is your strongest dimension at 100%.', 548], [DIMS[4], 'is your primary area for\ndevelopment at 67%.', 638]].forEach(([d, rest, y], i) => {
      const t0 = s2 + 0.3 + i * 0.5;
      if (t < t0) return;
      k.dot(x0 + 10, y - 10, 10 * clamp(spring(t - t0, 2.4, 0.6), 0, 1.3), d.color, 1);
      const nm = d.name === 'Affinity (ATI)' ? 'Affinity (ATI)' : d.name;
      const f = F.text(32, 600), nw = k.measure(nm + ' ', f);
      k.block(nm, f, x0 + 36, y, 0, P.ink, t, t0);
      k.block(rest, F.text(32, 400), x0 + 36 + (rest.includes('\n') ? 0 : nw), y + (rest.includes('\n') ? 44 : 0), 44, P.body, t, t0 + 0.15, { stagger: 0.02 });
      const hp = E.inOutCubic(seg(t, t0 + 0.5, t0 + 0.9));
      if (hp > 0) { ctx.fillStyle = rgba(i ? P.ochre : POS, 0.9); ctx.fillRect(x0 + 36, y + 10, nw * hp - 10, 4); }
    });
    div(740, s2 + 1.4);

    // 3 · all six dimensions against sector and Mesura
    const s3 = T.s[2];
    k.text('ALL DIMENSIONS', F.text(22, 600), x0, 812, P.muted, vis(s3 + 0.3), 'left', 2.6);
    DIMS.forEach((d, i) => {
      const t0 = s3 + 0.5 + i * 0.12, y = 880 + i * 92, g = E.outQuint(seg(t, t0, t0 + 0.8)), a = vis(t0, 0.2);
      if (a <= 0) return;
      k.text(d.name, F.text(28, 500), x0, y, P.ink, a);
      k.num(d.score * g, x0 + IW, y, 32, { intCols: d.score === 100 ? 3 : 2, align: 'right', alpha: a, suffixScale: 0.55 });
      k.bar(x0, y + 18, IW, 12, (d.score / 100) * g, d.color, P.track, a);
      [['mesura', d.mesura], ['sector', d.sector], ['org', d.org]].forEach(([kind, v], j) => {
        const mp = spring(t - t0 - 0.45 - j * 0.08, 2.6, 0.6);
        if (mp > 0.001) k.marker(kind, x0 + IW * (v / 100), y + 24, clamp(mp, 0, 1.2) * 0.62, P.ink, a);
      });
    });
    div(1420, s3 + 1.4);

    // 4 · recommended actions
    const s4 = T.s[3];
    k.text('RECOMMENDED ACTIONS', F.text(22, 600), x0, 1492, P.muted, vis(s4 + 0.3), 'left', 2.6);
    [['1', 'Find your organisation’s rules\non AI and customer data', 1580], ['2', 'Verify AI-generated statistics\nbefore using them', 1716]].forEach(([n, s, y], i) => {
      const t0 = s4 + 0.55 + i * 0.6;
      k.block(n, F.disp(56), x0, y + 6, 0, P.ochre, t, t0);
      k.block(s, F.disp(40), x0 + 56, y, 48, P.ink, t, t0 + 0.06);
    });
    div(1830, s4 + 1.6);

    // 5 · remeasurement and history
    const s5 = T.s[4], la = vis(s5 + 0.3);
    if (la > 0) {
      ctx.save(); ctx.translate(x0 + 24, 1906); ctx.rotate(2.2 * Math.max(0, t - s5 - 0.3) + E.outBack(la) * 2);
      ctx.beginPath(); ctx.arc(0, 0, 20, 0.35, TAU - 0.35); ctx.lineWidth = 4; ctx.strokeStyle = rgba(P.ochre, la); ctx.stroke();
      const a2 = TAU - 0.35, hx = 20 * Math.cos(a2), hy = 20 * Math.sin(a2);
      ctx.beginPath(); ctx.moveTo(hx + 9, hy - 2); ctx.lineTo(hx, hy); ctx.lineTo(hx + 3, hy + 10); ctx.stroke(); ctx.restore();
    }
    k.block('Scheduled remeasurement', F.text(34, 600), x0 + 66, 1918, 0, P.ink, t, s5 + 0.35);
    HIST.forEach((v, i) => {
      const t0 = s5 + 0.9 + i * 0.45, cx = x0 + 70 + i * ((IW - 140) / 3), cy = 2040, p = spring(t - t0, 2.4, 0.6);
      if (p <= 0.001) return;
      const g = E.outQuint(seg(t, t0, t0 + 0.7));
      ctx.beginPath(); ctx.arc(cx, cy, 52, 0, TAU); ctx.lineWidth = 12; ctx.strokeStyle = P.track; ctx.stroke();
      k.pathSec({ a: ringSec(58, 46, -Math.PI / 2, -Math.PI / 2 + (TAU * v * g) / 100) }, cx, cy, 1, 1); ctx.fillStyle = i === 3 ? P.pine : P.faint; ctx.fill();
      k.num(v * g, cx - 2, cy + 12, 34, { intCols: 2, align: 'center', suffix: '', alpha: clamp(p * 2) });
      k.text(`TAKE ${i + 1}`, F.text(20, 600), cx, cy + 92, P.muted, clamp(p * 2), 'center', 2.2);
      if (i) k.text(`▲ ${v - HIST[i - 1]}`, F.text(24, 600), cx, cy - 74, POS, seg(t, t0 + 0.4, t0 + 0.6), 'center');
    });
    ctx.restore();
  },
  events(k) {
    const ev = [{ t: T.peek, k: 'card' }, { t: T.hookOut, k: 'out' }, { t: T.rise, k: 'swish', v: 0.8 }];
    T.s.forEach((t0, i) => { ev.push({ t: t0, k: 'in' }); if (i >= 2) ev.push({ t: t0, k: 'scroll' }); });
    ev.push({ t: T.s[0] + 0.1, k: 'take', m: 3 }, { t: T.s[0] + 0.8, k: 'check' });
    ev.push({ t: T.s[1] + 0.3, k: 'note', m: 81, x: 300 }, { t: T.s[1] + 0.8, k: 'note', m: 78, x: 300 });
    DIMS.forEach((d, i) => ev.push({ t: T.s[2] + 0.5 + i * 0.12, k: 'zip', v: 0.3 }));
    ev.push({ t: T.s[3] + 0.55, k: 'item', m: 2 }, { t: T.s[3] + 1.15, k: 'item', m: 3 });
    HIST.forEach((v, i) => ev.push({ t: T.s[4] + 0.9 + i * 0.45, k: 'note', m: [76, 78, 81, 86][i], x: 300 + i * 150 }));
    ev.push({ t: T.proof, k: 'reveal' }, { t: T.out, k: 'drop2' });
    return ev;
  },
  music: {
    chords: [
      [0, 2.4, 38, [57, 62, 66, 69, 74]], [2.4, 4.8, 43, [55, 59, 62, 66, 71]], [4.8, 7.2, 45, [57, 61, 64, 69, 73]],
      [7.2, 9.6, 35, [54, 57, 62, 66, 69]], [9.6, 12.0, 43, [55, 59, 62, 67, 71]], [12.0, 14.4, 42, [57, 62, 66, 69, 74]],
      [14.4, 16.8, 40, [55, 59, 62, 66, 71]], [16.8, 19.2, 43, [55, 59, 62, 67, 74]], [19.2, 21.6, 45, [57, 61, 64, 69, 76]],
      [21.6, 24.6, 38, [50, 54, 57, 61, 64, 69]],
    ],
    drums: [[0, 3.0, 'groove'], [3.0, 8.9, 'pulse'], [8.9, 17.7, 'groove'], [17.7, 20.4, 'half'], [20.4, 21.6, 'none']],
    bass: [[0, 3.0, 'eighths'], [3.0, 8.9, 'quarters'], [8.9, 17.7, 'eighths'], [17.7, 21.2, 'quarters']],
    arps: [[3.0, 8.9, 0.6], [8.9, 17.7, 0.3]],
  },
});

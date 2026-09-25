// Reel 02 · Shadow AI. Hook: there's AI in your company you can't see.
// Eurostat 2025, Malta: 29.5% of people use generative AI for work; 21.6% of enterprises report
// using AI at all (separate surveys). The space in between is shadow AI: unapproved tools,
// unrecorded workflows, sensitive data in consumer apps, outputs nobody verified. Not
// misconduct, people trying to work faster.
import { film, P, F, E, SAFE, CW, clamp, lerp, seg, spring, hash, mix, rgba, TAU } from './kit.js';

const T = {
  hookOut: 2.8,
  p: 3.0, pBar: 3.3, pOut: 5.75,
  c: 6.0, cBar: 6.3, gap: 7.35, cOut: 9.3,
  name: 9.6, shadow: 10.15, items: [11.0, 11.55, 12.1, 12.65], nameOut: 14.1,
  nm: 14.4, strike: 15.0, faster: 15.45, nmOut: 17.1,
  see: 17.4, gather: 19.75, seeOut: 20.35,
};
const INK = P.dInk, HL = P.dOchre;
const SCALE = CW / 32, PEOPLE = 29.5, COS = 21.6;
const BAR = { p: 1000, c: 1140, h: 48 };

// Out-of-focus points drifting in the dark.
const BOKEH = [];
for (let i = 0; i < 64; i++) {
  BOKEH.push({
    x: hash(i, 1) * 1180 - 50, y: hash(i, 2) * 2000 - 40, z: 0.35 + hash(i, 3) * 1.2, s: 5 + hash(i, 4) * 12,
    vx: (hash(i, 5) - 0.5) * 14, vy: -6 - hash(i, 6) * 16, b: 0.25 + hash(i, 7) * 0.55, cream: hash(i, 8) < 0.28,
  });
}

export default film({
  id: '02-shadow-ai', land: 21.6, T, open: 'dark',
  background: k => k.dark(),
  heavy: [[0, 0.9, 12], [19.7, 20.7, 12]],
  draw(k, t) {
    const { ctx } = k;
    /* ------------------------------------------------ the dark field */
    const fast = seg(t, T.faster, T.faster + 0.6) * (1 - seg(t, T.nmOut, T.nmOut + 0.5));   // everyone working faster
    const gather = E.inOutCubic(seg(t, T.gather, T.gather + 0.9));
    const drift = t + 2.2 * fast * (t - T.faster);
    BOKEH.forEach((d, i) => {
      let x = d.x + d.vx * drift / d.z, y = ((d.y + d.vy * drift / d.z) % 2000 + 2000) % 2000 - 40;
      x = lerp(x, 540, gather); y = lerp(y, 640, gather);
      const blur = clamp(Math.abs(d.z - 1.0) * 14, 0, 16) * (1 - gather);
      const a = d.b * clamp((d.z - 0.2) / 0.3) * (1 - seg(gather, 0.7, 1)) * (0.55 + 0.45 * Math.sin(t * 0.9 + i));
      k.softDot(x, y, d.s / d.z * (1 - 0.6 * gather), blur, d.cream ? INK : HL, a);
    });

    /* --------------------------------------------- hook: rack focus */
    const hIn = E.outCubic(seg(t, 0, 0.9)), hOut = E.inCubic(seg(t, T.hookOut, T.hookOut + 0.4));
    const ha = lerp(0.3, 1, E.outCubic(seg(t, 0, 0.45))) * (1 - hOut);
    if (ha > 0.002) {
      const s = lerp(1.07, 1, hIn) + 0.04 * hOut;
      ctx.save(); ctx.translate(540, 700); ctx.scale(s, s); ctx.translate(-540, -700);
      k.focus(24 * (1 - hIn) + 20 * hOut, () => k.rich('There’s AI in\nyour company\nyou can’t *see*.', F.disp(128), SAFE.l, 580, 134, INK, ha, { hl: HL }));
      ctx.restore();
    }

    /* ------------------------------------------------ people vs companies */
    k.eyebrow('MALTA  ·  EUROSTAT 2025', t, T.p, { y: 380, tOut: T.cOut, color: HL });
    k.say('*29.5%* of people\nuse generative AI\nfor work.', t, T.p, { tOut: T.pOut, y: 500, color: INK, hl: HL });
    k.say('Only *21.6%* of\ncompanies report\nusing AI at all.', t, T.c, { tOut: T.cOut, y: 500, color: INK, hl: HL });
    const bOut = E.inOutCubic(seg(t, T.cOut - 0.05, T.cOut + 0.4));
    if (t > T.pBar && bOut < 1) {
      const g1 = E.outQuint(seg(t, T.pBar, T.pBar + 0.9)) * (1 - bOut), g2 = E.outQuint(seg(t, T.cBar, T.cBar + 0.9)) * (1 - bOut);
      const a = 1 - seg(bOut, 0.5, 1);
      k.bar(SAFE.l, BAR.p - BAR.h / 2, PEOPLE * SCALE, BAR.h, g1, INK, null, a);
      if (t > T.cBar) k.bar(SAFE.l, BAR.c - BAR.h / 2, COS * SCALE, BAR.h, g2, '#6F8F85', null, a);
      const l1 = seg(t, T.pBar + 0.1, T.pBar + 0.4) * a, l2 = seg(t, T.cBar + 0.1, T.cBar + 0.4) * a;
      k.text('PEOPLE', F.text(26, 600), SAFE.l, BAR.p - 42, P.dBody, l1, 'left', 3.1);
      k.text('COMPANIES', F.text(26, 600), SAFE.l, BAR.c - 42, P.dBody, l2, 'left', 3.1);
      k.num(PEOPLE * E.outQuint(seg(t, T.pBar, T.pBar + 0.9)), SAFE.l + PEOPLE * SCALE * g1, BAR.p - 38, 60, { dec: 1, align: 'right', alpha: l1, color: INK });
      k.num(COS * E.outQuint(seg(t, T.cBar, T.cBar + 0.9)), SAFE.l + COS * SCALE * Math.max(g2, 0.62), BAR.c - 38, 60, { dec: 1, align: 'right', alpha: l2, color: INK });
      // the space in between, hatched
      const gp = E.inOutCubic(seg(t, T.gap, T.gap + 0.6)) * (1 - seg(bOut, 0, 0.35));
      if (gp > 0) {
        const x0 = SAFE.l + COS * SCALE, x1 = SAFE.l + PEOPLE * SCALE, y0 = BAR.p - BAR.h / 2 - 14, y1 = BAR.c + BAR.h / 2 + 14;
        ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, (x1 - x0) * gp, y1 - y0); ctx.clip();
        ctx.fillStyle = rgba(HL, 0.1); ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
        ctx.strokeStyle = rgba(HL, 0.75); ctx.lineWidth = 3;
        for (let x = x0 - (y1 - y0); x < x1; x += 22) { ctx.beginPath(); ctx.moveTo(x, y1); ctx.lineTo(x + (y1 - y0), y0); ctx.stroke(); }
        ctx.restore();
        ctx.strokeStyle = rgba(HL, gp); ctx.lineWidth = 2; ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
        k.text('THE SPACE IN BETWEEN', F.text(26, 600), x1, y1 + 56, HL, seg(t, T.gap + 0.35, T.gap + 0.6) * (1 - bOut), 'right', 3.1);
      }
    }
    k.source('Source: Eurostat, 2025. People and companies are separate surveys.', t, T.pBar, { tOut: T.cOut, color: P.dMuted });

    /* ------------------------------------------------------ the name */
    k.say('That space\nhas a name:', t, T.name, { tOut: T.nameOut, y: 470, color: INK, hl: HL });
    k.hook('Shadow AI.', t, T.shadow, { size: 150, y: 790, color: HL, tOut: T.nameOut + 0.08 });
    const ITEMS = ['Unapproved tools', 'Unrecorded workflows', 'Sensitive data in consumer apps', 'Outputs nobody verified'];
    ITEMS.forEach((s, i) => {
      const t0 = T.items[i], y = 950 + i * 118;
      const p = spring(t - t0, 2.3, 0.62), out = E.inOutCubic(seg(t, T.nameOut + i * 0.05, T.nameOut + 0.3 + i * 0.05));
      if (p <= 0.001 || out >= 1) return;
      const f = F.text(40, 500), w = k.measure(s, f) + 92, a = clamp(p * 2) * (1 - out);
      const x = SAFE.l - (1 - clamp(p)) * 60;
      ctx.save(); ctx.globalAlpha = a; k.pill(x, y - 58, w, 84); ctx.fillStyle = P.dSurface; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = P.dBorder; ctx.stroke(); ctx.restore();
      k.dot(x + 42, y - 16, 9, HL, a);
      k.text(s, f, x + 66, y - 2, INK, a);
    });

    /* ------------------------------------------------- not misconduct */
    const mc = k.say('It isn’t\nmisconduct.', t, T.nm, { tOut: T.nmOut, y: 520, color: INK });
    const sp = E.inOutCubic(seg(t, T.strike, T.strike + 0.4)) * (1 - seg(t, T.nmOut, T.nmOut + 0.2));
    if (sp > 0) {
      const L = mc[1].L, y = mc[1].y - 32;
      ctx.fillStyle = HL; ctx.fillRect(SAFE.l - 6, y - 3, (L.width + 12) * sp, 6);
    }
    k.say('It’s people trying\nto work *faster*.', t, T.faster, { tOut: T.nmOut, y: 860, color: INK, hl: HL });

    /* --------------------------------------------------- can't see */
    const seeOut = E.inCubic(seg(t, T.seeOut, T.seeOut + 0.35));
    if (t > T.see) k.focus(18 * seeOut, () => k.say('But you can’t\nmanage what you\ncan’t *see*.', t, T.see, { y: 560, color: INK, hl: HL, alpha: 1 - seeOut }));
  },
  events(k) {
    const ev = [{ t: 0.05, k: 'focus', d: 0.8 }, { t: T.hookOut, k: 'defocus' }];
    ev.push({ t: T.p, k: 'in' }, { t: T.pBar, k: 'zip', v: 1 }, { t: T.pOut, k: 'out' });
    ev.push({ t: T.c, k: 'in' }, { t: T.cBar, k: 'zip', v: 0.7 }, { t: T.gap, k: 'hatch', d: 0.6 }, { t: T.cOut, k: 'out' });
    ev.push({ t: T.name, k: 'in' }, { t: T.shadow, k: 'name' });
    T.items.forEach((t0, i) => ev.push({ t: t0, k: 'item', m: i }));
    ev.push({ t: T.nameOut, k: 'out' }, { t: T.nm, k: 'in' }, { t: T.strike, k: 'strike' }, { t: T.faster, k: 'in' }, { t: T.nmOut, k: 'out' });
    ev.push({ t: T.see, k: 'in' }, { t: T.gather, k: 'gather', d: 0.9 }, { t: T.seeOut, k: 'defocus' });
    return ev;
  },
  music: {
    // B minor in the dark, lifting to D as the mark lands.
    chords: [
      [0, 4.8, 35, [54, 59, 61, 62, 66]], [4.8, 7.2, 43, [55, 59, 62, 66]], [7.2, 9.6, 40, [55, 59, 62, 66, 71]],
      [9.6, 12.0, 35, [54, 59, 62, 66]], [12.0, 14.4, 43, [55, 59, 62, 67, 71]], [14.4, 16.8, 42, [57, 62, 66, 69, 74]],
      [16.8, 19.2, 40, [55, 59, 62, 67, 74]], [19.2, 21.6, 45, [57, 62, 64, 69, 76]], [21.6, 24.6, 38, [50, 54, 57, 61, 64, 69]],
    ],
    drums: [[0, 9.6, 'dark'], [9.6, 14.4, 'half'], [14.4, 19.2, 'pulse'], [19.2, 21.6, 'none']],
    bass: [[0, 9.6, 'hold'], [9.6, 19.2, 'quarters'], [19.2, 21.2, 'hold']],
    arps: [[14.4, 19.2, 0.3]],
  },
});

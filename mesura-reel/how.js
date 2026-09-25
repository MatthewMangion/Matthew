// Mesura: How it works. A 9:16 explainer (1080 x 1920, 30 s).
// Same engine as the brand reel: every frame is a pure function of time.
import { WORDMARK } from './logo.js';
import { TAU, clamp, lerp, seg, E, spring, wobble, hash, P, mix, rgba, F, loadFonts, SLOT, buildMark, ringSec } from './lib/core.js';
import { createDraw } from './lib/draw.js';

export const W = 1080, H = 1920, FPS = 60, DUR = 30;
const MX = 96, CW = W - 2 * MX;

/* ============================================================ timeline ==
   100 BPM (0.6 s beats), bars from 0.6 s. Each step is two bars (4.8 s) and
   starts on a downbeat: 3.0, 7.8, 12.6, 17.4; the report at 22.2, the end at 27.0. */
const T = {
  drop: 0.0, land: 0.6, eye0: 1.0, l1: 1.2, l2: 1.5, l3: 1.8, out0: 2.45,
  s1: 3.0, card: 3.1, type0: 3.6, type1: 4.25, size: 4.3, tapMove: 4.35, tap: 4.8, ticket: 4.95, code: 5.4, unique: 6.2, out1: 7.2,
  s2: 7.8, r: [8.1, 9.3, 10.5], send: [8.4, 9.6, 10.8], got: [9.0, 10.2, 11.4], zoom2: 12.0,
  s3: 12.6, qIn: 13.05, point: 13.45, pick: 13.8, next: 14.4, ffwd: 14.55, ffwdEnd: 15.9, done: 16.2, shrink: 16.8,
  s4: 17.4, markIn: 17.5, pour: 17.65, bars: 18.6, weigh: 20.1, score: 20.4, tier: 21.0, badges: 21.3,
  rep: 22.2, rows: 22.75, act1: 23.4, act2: 24.0, remeasure: 24.6,
  end: 27.0, tag1: 27.6, tag2: 27.9, cta: 28.2,
};
const STEPS = [T.s1, T.s2, T.s3, T.s4, T.rep];

export function createHow(canvas) {
  const mainCtx = canvas.getContext('2d', { willReadFrequently: true, alpha: false });
  let ctx = mainCtx;
  const D = createDraw(() => ctx, W, H);
  const { lay, measure, glyphs, rise, text, odometer, scramble, pathSec, markPath, dot, pill, ripple, softDot, reset } = D;
  let MK, WPATH = [], gridPat = null;
  let layer = null, layerCtx = null;       // offscreen layer, for moving a finished screen as one piece

  /* ---------------------------------------------------------- helpers */
  function rrect(x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function card(x, y, w, h, r, fill = P.surface, a = 1, shadow = 0.1, border = P.border) {
    if (a <= 0.002) return;
    ctx.save(); ctx.globalAlpha = a;
    ctx.shadowColor = `rgba(20,32,28,${shadow})`; ctx.shadowBlur = 56; ctx.shadowOffsetY = 20;
    rrect(x, y, w, h, r); ctx.fillStyle = fill; ctx.fill();
    ctx.shadowColor = 'transparent';
    if (border) { ctx.lineWidth = 2; ctx.strokeStyle = border; ctx.stroke(); }
    ctx.restore();
  }
  function wrap(str, font, maxW) {
    const out = []; let cur = '';
    for (const w of str.split(' ')) { const t = cur ? cur + ' ' + w : w; if (cur && measure(t, font) > maxW) { out.push(cur); cur = w; } else cur = t; }
    if (cur) out.push(cur);
    return out;
  }
  // Multi-line editorial reveal: each line rises out of its own baseline mask.
  function riseLines(lines, font, x, y0, lh, color, t, tIn, o = {}) {
    lines.forEach((ln, i) => {
      const L = lay(ln, font);
      const lx = o.align === 'center' ? x - L.width / 2 : x;
      rise(L, lx, y0 + i * lh, color, t, tIn + i * (o.lineStagger ?? 0.08), { stagger: 0.04, ...o, tOut: (o.tOut ?? Infinity) + i * 0.03, colorOf: o.colorOf ? (ci => o.colorOf(i, ci)) : undefined });
    });
  }
  // Centred scramble-decode. While it decodes, characters land in the slots of the finished line
  // (left-aligned from its final left edge), so the line never slides as it grows.
  function decode(str, p, t, font, cx, y, color, a, ls) {
    if (p >= 1) return text(str, font, cx, y, color, a, 'center', ls);
    // canvas centring counts the trailing letter-spacing that measure() leaves out
    text(scramble(str, p, t, true), font, cx - (measure(str, font, ls) + ls) / 2, y, color, a, 'left', ls);
  }
  const paper = (x, y, r) => { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fillStyle = P.paper; ctx.fill(); };
  function lockIcon(x, y, s, color) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.strokeStyle = color; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(0, -4, 5.5, Math.PI, 0); ctx.lineTo(5.5, 1); ctx.moveTo(-5.5, 1); ctx.lineTo(-5.5, -4); ctx.stroke();
    rrect(-8, 0, 16, 12, 3); ctx.fillStyle = color; ctx.fill(); ctx.restore();
  }
  function checkPath(cx, cy, r, p, color, width) {
    if (p <= 0) return;
    const pts = [[-0.42, 0.02], [-0.12, 0.3], [0.44, -0.3]];
    const l1 = Math.hypot(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]), l2 = Math.hypot(pts[2][0] - pts[1][0], pts[2][1] - pts[1][1]);
    const d = p * (l1 + l2);
    ctx.beginPath(); ctx.moveTo(cx + pts[0][0] * r, cy + pts[0][1] * r);
    if (d <= l1) { const f = d / l1; ctx.lineTo(cx + lerp(pts[0][0], pts[1][0], f) * r, cy + lerp(pts[0][1], pts[1][1], f) * r); }
    else { const f = (d - l1) / l2; ctx.lineTo(cx + pts[1][0] * r, cy + pts[1][1] * r); ctx.lineTo(cx + lerp(pts[1][0], pts[2][0], f) * r, cy + lerp(pts[1][1], pts[2][1], f) * r); }
    ctx.lineWidth = width; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = color; ctx.stroke(); ctx.lineCap = 'butt';
  }
  function loopIcon(cx, cy, r, rot, color) {
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot);
    ctx.beginPath(); ctx.arc(0, 0, r, 0.35, TAU - 0.35); ctx.lineWidth = 4; ctx.strokeStyle = color; ctx.stroke();
    const a = TAU - 0.35, hx = r * Math.cos(a), hy = r * Math.sin(a);
    ctx.beginPath(); ctx.moveTo(hx + 9, hy - 2); ctx.lineTo(hx, hy); ctx.lineTo(hx + 3, hy + 10); ctx.stroke();
    ctx.restore();
  }
  // A finger: translucent touch point that presses and releases.
  function touch(x, y, press, a) {
    if (a <= 0.002) return;
    const s = 1 - 0.18 * press;
    ctx.save(); ctx.globalAlpha = a;
    // light fill for dark surfaces, dark ring for light ones
    ctx.beginPath(); ctx.arc(x, y, 38 * s, 0, TAU); ctx.fillStyle = 'rgba(246,242,233,0.4)'; ctx.fill();
    ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(34,54,47,0.4)'; ctx.stroke();
    ctx.restore();
  }
  function paperGrid(a) {
    if (a <= 0.002) return;
    ctx.globalAlpha = a; ctx.fillStyle = gridPat; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
  }
  function wordmark(cx, cy, Dm, color, o = {}) {
    // Traced wordmark, positioned relative to a (virtual) mark centre.
    WORDMARK.forEach((g, i) => {
      const st = o.glyph ? o.glyph(i, g) : null;
      if (st === false) return;
      ctx.save(); ctx.translate(cx + (st?.dx || 0), cy + (st?.dy || 0)); ctx.scale(Dm, Dm);
      ctx.globalAlpha = st?.a ?? 1; ctx.fillStyle = g.color === 'pine' ? color : P.ochre;
      ctx.fill(WPATH[i], 'evenodd'); ctx.restore();
    });
    ctx.globalAlpha = 1;
  }

  /* ------------------------------------------------------- light / dark
     The film goes dark for the diagnosis and the report: an iris opens from
     the rings at 17.4 and a paper iris closes it again at 27.0. */
  const IRIS1 = { x: 540, y: 950 }, IRIS2 = { x: 540, y: 880 };
  const irisR1 = t => 1250 * E.inOutCubic(seg(t, T.s4, T.s4 + 0.55));
  const irisR2 = t => 1250 * E.inOutCubic(seg(t, T.end, T.end + 0.55));
  function darkAt(x, y, t) {
    if (t < T.s4 || t > T.end + 0.6) return 0;
    const a = clamp((irisR1(t) - Math.hypot(x - IRIS1.x, y - IRIS1.y)) / 60 + 0.5);
    const b = clamp((irisR2(t) - Math.hypot(x - IRIS2.x, y - IRIS2.y)) / 60 + 0.5);
    return a * (1 - b);
  }
  function darkBg() {
    const g = ctx.createRadialGradient(540, 860, 60, 540, 960, 1300);
    g.addColorStop(0, '#1D2D27'); g.addColorStop(0.55, '#15211D'); g.addColorStop(1, '#0C1512');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  function background(t) {
    ctx.fillStyle = P.paper; ctx.fillRect(0, 0, W, H);
    paperGrid(0.5);
    const r1 = irisR1(t);
    if (t >= T.s4 && t < T.end + 0.6 && r1 > 0) {
      ctx.save(); ctx.beginPath(); ctx.arc(IRIS1.x, IRIS1.y, r1, 0, TAU); ctx.clip(); darkBg(); ctx.restore();
    }
    const r2 = irisR2(t);
    if (t >= T.end && r2 > 0) {
      ctx.save(); ctx.beginPath(); ctx.arc(IRIS2.x, IRIS2.y, r2, 0, TAU); ctx.clip();
      ctx.fillStyle = P.paper; ctx.fillRect(0, 0, W, H); paperGrid(0.5 * (1 - seg(t, T.end + 0.6, T.end + 1.2))); ctx.restore();
    }
  }

  /* ============================================================== intro
     The ochre point drops in and grows into the mark; three lines state the model. */
  const MARK0 = { x: 540, y: 800, D: 150 };
  const LOCK = { x: 122, y: 200, D: 22 };               // small header lockup
  const END = { mx: 540, my: 760, mD: 116, wx: 90, wy: 985, wD: 68 };  // stacked end lockup
  const WMID = (WORDMARK[0].bbox[0] + Math.max(...WORDMARK.map(g => g.bbox[2]))) / 2;   // wordmark centre, in mark units
  function markPose(t) {
    // where the mark is and how big: intro -> header lockup -> (end) stacked lockup
    const p = E.brand(seg(t, T.out0, T.s1 + 0.1));
    const q = E.brand(seg(t, T.end + 0.05, T.end + 0.75));
    let x = lerp(MARK0.x, LOCK.x, p), y = lerp(MARK0.y, LOCK.y, p), Dm = lerp(MARK0.D, LOCK.D, p);
    x = lerp(x, END.mx, q); y = lerp(y, END.my, q); Dm = lerp(Dm, END.mD, q);
    return { x, y, D: Dm * (1 + 0.06 * wobble(t - T.end - 0.75, 3, 8)) };
  }
  function intro(t) {
    // the drop
    if (t < T.land + 0.05) {
      const u = seg(t, T.drop, T.land), p = u * u;                  // falls under gravity from frame one
      const y = lerp(70, MARK0.y, p), vy = (2 * u * (MARK0.y - 70)) / (T.land - T.drop);
      dot(MARK0.x, y, 18, P.ochre, 1, 0, vy);
    }
    ripple(MARK0.x, MARK0.y, t, T.land, 16, 170, P.ochre, 0.8, 2.5);
    ripple(MARK0.x, MARK0.y, t, T.land + 0.1, 16, 280, P.ochre, 1.0, 1.5);
    // lines
    const f = F.disp(84), tOut = T.out0;
    const lines = [['One code.', T.l1, P.ink], ['One assessment.', T.l2, P.ink], ['One benchmarked report.', T.l3, P.pine]];
    lines.forEach(([s, t0, c], i) => { const L = lay(s, f); rise(L, 540 - L.width / 2, 1150 + i * 100, c, t, t0, { tOut: tOut + i * 0.04, stagger: 0.05 }); });
    if (t > T.eye0 && t < T.out0 + 0.4) {
      const p = seg(t, T.eye0, T.eye0 + 0.4), a = 1 - seg(t, T.out0, T.out0 + 0.3);
      decode('HOW IT WORKS', p, t, F.text(26, 600), 540, 1030, P.ochre, a, 3.1);
    }
  }
  // the mark (drawn over everything; it lives the whole film except the diagnosis, where it is the engine)
  function drawMark(t) {
    if (t < T.land) return;
    const g = spring(t - T.land, 1.6, 0.55);             // grows out of the point
    const pose = markPose(t);
    if (t < T.land + 0.9) {
      // morph from the point (a tiny ring with a slot-sized gap) into the mark
      const gap = 0.36, a0 = SLOT + gap / 2, a1 = SLOT - gap / 2 + TAU;
      const S = ringSec(12, 3, a0, a1);
      pathSec({ a: S, b: MK.sec }, pose.x, pose.y, 1, pose.D * clamp(g, 0, 1.2), 0, clamp(g * 1.05, 0, 1.15), clamp(g * 1.1, 0, 1));
    } else markPath(MK, pose.x, pose.y, pose.D);
    ctx.fillStyle = P.ochre; ctx.fill();
  }
  function drawLockupWordmark(t) {
    // small header wordmark (reveals from behind the mark as it settles), later the stacked end wordmark
    if (t < T.out0 + 0.2) return;
    const q = E.brand(seg(t, T.end - 0.02, T.end + 0.66));   // leads the mark slightly, so the two never overlap
    const pose = markPose(t);
    // In the header it rides with the mark. For the end card it travels by its own visual centre,
    // so it grows straight into place instead of swinging out towards the frame edge.
    const Dm = q > 0 ? lerp(LOCK.D, END.wD, q) : pose.D;
    const cx = q > 0 ? lerp(LOCK.x + WMID * LOCK.D, END.wx + WMID * END.wD, q) - WMID * Dm : pose.x;
    const cy = q > 0 ? lerp(LOCK.y, END.wy, q) : pose.y;
    const rev = E.outCubic(seg(t, T.s1 - 0.25, T.s1 + 0.3));
    const col = mix(P.pine, P.dInk, darkAt(cx + 5 * Dm, cy, t));   // cream on the dark, pine on paper
    ctx.save();
    if (q <= 0) { ctx.beginPath(); ctx.rect(pose.x + pose.D * 0.9, 0, 12 * pose.D * rev, H); ctx.clip(); }
    wordmark(cx, cy, Dm, col, { glyph: (i, g) => ({ dx: q > 0 ? 0 : -(1 - rev) * 4 * Dm, a: 1 }) });
    ctx.restore();
  }

  /* ============================================================ step 01
     A sign-up card: type an email, pick a size, tap "Get your Diagnostic";
     the card turns into a ticket holding the organisation's code. */
  const CODE = 'K7Q-4XM';
  const EMAIL = 'you@company.com';
  function codeBox(t) {
    const cin = spring(t - T.card, 1.5, 0.78);
    const tk = E.inOutCubic(seg(t, T.ticket, T.ticket + 0.5));
    const pl = E.inOutCubic(seg(t, T.out1, T.s2));
    let x = 96, y = lerp(600 + (1 - cin) * 160, 770, tk), w = 888, h = lerp(660, 420, tk), r = 32;
    x = lerp(x, 540 - 160, pl); y = lerp(y, 950 - 46, pl); w = lerp(w, 320, pl); h = lerp(h, 92, pl); r = lerp(r, 46, pl);
    return { x, y, w, h, r, cin, tk, pl };
  }
  function step1(t) {
    if (t < T.card - 0.01 || t > T.zoom2 + 0.4) return;
    const b = codeBox(t);
    const fade = t > T.zoom2 ? 1 - seg(t, T.zoom2, T.zoom2 + 0.3) : 1;
    const flood = E.inOutCubic(seg(t, T.tap + 0.04, T.ticket + 0.42));   // the tap floods the card with pine
    card(b.x, b.y, b.w, b.h, b.r, flood >= 1 ? P.pine : P.surface, clamp(b.cin * 2) * fade, 0.12 * (1 - b.pl) + 0.06, b.tk < 0.5 ? P.border : null);
    // form content
    const fa = clamp(b.cin * 1.5) * (1 - seg(t, T.ticket, T.ticket + 0.18));
    if (fa > 0.002) {
      const x0 = 152, oy = b.y - 600;
      ctx.save(); rrect(b.x, b.y, b.w, b.h, b.r); ctx.clip();
      text('NEW DIAGNOSTIC', F.text(22, 600), x0, 690 + oy, P.muted, fa, 'left', 2.6);
      text('Work email', F.text(28, 600), x0, 758 + oy, P.ink, fa);
      const focus = t > T.type0 - 0.1 && t < T.type1 + 0.2 ? 1 : 0;
      rrect(x0, 776 + oy, 776, 92, 18); ctx.globalAlpha = fa;
      if (focus) { ctx.lineWidth = 8; ctx.strokeStyle = P.pineSoft; ctx.stroke(); }
      ctx.lineWidth = 2; ctx.strokeStyle = focus ? P.pine : P.borderStrong; ctx.stroke(); ctx.globalAlpha = 1;
      const n = Math.floor(EMAIL.length * seg(t, T.type0, T.type1));
      const typed = EMAIL.slice(0, n);
      text(typed || 'you@company.com', F.text(32, 400), x0 + 26, 833 + oy, typed ? P.ink : P.faint, fa);
      if (focus && Math.floor(t / 0.3) % 2 === 0) { const cx = x0 + 28 + (typed ? measure(typed, F.text(32, 400)) : 0); ctx.globalAlpha = fa; ctx.fillStyle = P.pine; ctx.fillRect(cx, 800 + oy, 2.5, 44); ctx.globalAlpha = 1; }
      text('Organisation size', F.text(28, 600), x0, 938 + oy, P.ink, fa);
      rrect(x0, 956 + oy, 776, 92, 18); ctx.globalAlpha = fa; ctx.lineWidth = 2; ctx.strokeStyle = P.borderStrong; ctx.stroke(); ctx.globalAlpha = 1;
      const sa = seg(t, T.size, T.size + 0.2);
      text(sa > 0 ? '50 to 249 employees' : 'Select', F.text(32, 400), x0 + 26, 1013 + oy - (1 - E.outCubic(sa)) * 10 * (sa > 0 ? 1 : 0), sa > 0 ? P.ink : P.faint, fa * (sa > 0 ? sa : 1));
      ctx.globalAlpha = fa; ctx.beginPath(); ctx.moveTo(x0 + 730, 995 + oy); ctx.lineTo(x0 + 742, 1007 + oy); ctx.lineTo(x0 + 754, 995 + oy); ctx.lineWidth = 3; ctx.strokeStyle = P.muted; ctx.stroke(); ctx.globalAlpha = 1;
      // button
      const press = Math.exp(-Math.max(0, t - T.tap) * 9) * (t > T.tap ? 1 : 0);
      const bs = 1 - 0.03 * press;
      ctx.save(); ctx.translate(540, 1152 + oy); ctx.scale(bs, bs); ctx.translate(-540, -(1152 + oy));
      rrect(x0, 1102 + oy, 776, 100, 50); ctx.globalAlpha = fa; ctx.fillStyle = mix(P.pine, '#102C28', press); ctx.fill();
      ctx.restore(); ctx.globalAlpha = 1;
      text('Get your Diagnostic', F.text(34, 500), 540, 1164 + oy, P.onPine, fa, 'center');
      ctx.save(); rrect(x0, 1102 + oy, 776, 100, 50); ctx.clip(); ripple(540, 1152 + oy, t, T.tap, 20, 420, P.onPine, 0.5, 60); ctx.restore();
      ctx.restore();
    }
    if (flood > 0 && flood < 1) {
      // from the button outwards (the button sits 108 px above the card's bottom edge)
      ctx.save(); rrect(b.x, b.y, b.w, b.h, b.r); ctx.clip();
      ctx.beginPath(); ctx.arc(540, b.y + b.h - 108, 760 * flood, 0, TAU); ctx.fillStyle = P.pine; ctx.fill(); ctx.restore();
    }
    // the finger
    if (t > T.tapMove && t < T.tap + 0.45) {
      const p = E.inOutCubic(seg(t, T.tapMove, T.tap - 0.06));
      const press = t > T.tap - 0.06 ? Math.sin(Math.PI * seg(t, T.tap - 0.06, T.tap + 0.18)) : 0;
      touch(lerp(900, 560, p), lerp(1600, 1160, p), press, seg(t, T.tapMove, T.tapMove + 0.1) * (1 - seg(t, T.tap + 0.2, T.tap + 0.45)));
    }
    // ticket content
    const ta = seg(b.tk, 0.55, 1) * (1 - seg(t, T.out1, T.out1 + 0.25)) * fade;
    if (ta > 0.002) {
      text('Your organisation code', F.text(28, 500), 540, b.y + 92, rgba(P.onPine, 0.72), ta, 'center');
      // notches + perforation
      const py = b.y + b.h - 128;
      ctx.save(); ctx.globalAlpha = ta; paper(b.x, py, 24); paper(b.x + b.w, py, 24);
      ctx.setLineDash([10, 10]); ctx.beginPath(); ctx.moveTo(b.x + 44, py); ctx.lineTo(b.x + b.w - 44, py); ctx.lineWidth = 2; ctx.strokeStyle = rgba(P.onPine, 0.3); ctx.stroke(); ctx.setLineDash([]); ctx.restore();
      const ua = seg(t, T.unique, T.unique + 0.3) * ta;
      if (ua > 0) { dot(540 - 196, py + 70, 9, P.ochre, ua); text('Unique to your organisation', F.text(28, 500), 540 - 176, py + 80, P.onPine, ua); }
    }
    // the code: decodes in the ticket, then shrinks into the pill
    const ca = seg(t, T.code - 0.15, T.code + 0.05) * fade;
    if (ca > 0.002) {
      const sz = lerp(116, 46, b.pl), cy = lerp(b.y + 238, b.y + 62, b.pl);
      decode(CODE, seg(t, T.code - 0.1, T.code + 0.55), t, F.mono(sz, 500), 540, cy, P.onPine, ca, lerp(4, 1, b.pl));
    }
  }

  /* ============================================================ step 02
     The code reaches a team, a department, then the whole workforce: rings of
     people light up as it arrives. */
  const RINGS = [[8, 205], [14, 290], [20, 372], [26, 446]];
  const PEOPLE = [];
  let HERO = null;
  function initPeople() {
    RINGS.forEach(([n, r], ri) => {
      for (let k = 0; k < n; k++) {
        const a = -Math.PI / 2 + (k + (ri % 2) * 0.5) * TAU / n;
        const grp = ri < 2 ? ri : 2;
        PEOPLE.push({ x: IRIS1.x + r * Math.cos(a), y: IRIS1.y + r * Math.sin(a), a, r, grp, k, n,
          gt: T.got[grp] + ((k / n) * 0.18), pt: T.r[grp] + (k / n) * 0.22, dn: T.shrink + 0.15 + hash(ri * 40 + k, 3) * 0.45 });
      }
    });
    // the person we follow into step 03: a department member, lower right
    HERO = PEOPLE.filter(p => p.grp === 1).reduce((b, p) => (Math.abs(p.a - 0.62) < Math.abs(b.a - 0.62) ? p : b));
  }
  const HERO_PHONE = { x: 540, y: 990, w: 440, h: 820, r: 66 };
  // After step 02 the rings come back smaller and lower, clear of the two-line titles.
  const compact = (t, p) => (t > T.zoom2 + 0.4 ? { x: 540 + (p.x - 540) * 0.84, y: 1000 + (p.y - IRIS1.y) * 0.84 } : { x: p.x, y: p.y });
  function heroGeom(t, m) {
    // the hero dot's rounded rect on its way to (and back from) the phone, plus its screen inset
    const home = compact(t, HERO);
    const x = lerp(home.x, HERO_PHONE.x, m), y = lerp(home.y, HERO_PHONE.y, m);
    const w = lerp(20, HERO_PHONE.w, m), h = lerp(20, HERO_PHONE.h, m), r = lerp(10, HERO_PHONE.r, m);
    return { x, y, w, h, r, sx: x - w / 2 + 12 * m, sy: y - h / 2 + 12 * m, sw: w - 24 * m, sh: h - 24 * m, sr: r - 10 * m };
  }
  function phoneMorph(t) {
    // 0 = the hero dot on its ring, 1 = the phone
    return E.inOutCubic(seg(t, T.zoom2 + 0.05, T.s3 + 0.35)) * (1 - E.inOutCubic(seg(t, T.shrink, T.shrink + 0.5)));
  }
  function step2(t) {
    if (t < T.s2 - 0.3 || t > T.s4 + 1.4) return;
    const leave = seg(t, T.zoom2, T.zoom2 + 0.35) * (1 - seg(t, T.shrink + 0.1, T.shrink + 0.45));
    const back = t > T.shrink;
    // connection lines + travelling packets
    PEOPLE.forEach(p => {
      if (p === HERO && t > T.zoom2) return;
      const g = p.grp, ts = T.send[g] + (p.k / p.n) * 0.18;
      const lp = E.inOutCubic(seg(t, ts, p.gt));
      if (lp <= 0 || back) return;
      const x0 = IRIS1.x + 150 * Math.cos(p.a) * 1.1, y0 = IRIS1.y + 46 * Math.sin(p.a) * 1.4;
      const la = (1 - leave) * (t > p.gt ? 0.22 : 0.4);
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(lerp(x0, p.x, lp), lerp(y0, p.y, lp));
      ctx.lineWidth = 1.5; ctx.strokeStyle = rgba(P.ochre, la); ctx.stroke();
      if (lp < 1) dot(lerp(x0, p.x, lp), lerp(y0, p.y, lp), 5.5, P.ochre, 1 - leave);
    });
    // people
    PEOPLE.forEach(p0 => {
      const p = { ...p0, ...compact(t, p0) };
      if (p0 === HERO && t > T.zoom2 && t < T.shrink + 0.5) return;
      const pop = spring(t - p.pt, 2.4, 0.55);
      if (pop <= 0.001) return;
      const got = t >= p.gt;
      let col = got ? P.ochre : '#C9C0AC', r = 10;
      const a = back ? seg(t, T.shrink + 0.05, T.shrink + 0.35) : 1 - leave;
      if (back) {
        // everyone has answered: filled pine with a completion ring
        const dp = seg(t, p.dn - 0.3, p.dn);
        col = mix(P.ochre, P.pine, dp); r = 10;
        if (dp > 0 && dp < 1) { ctx.beginPath(); ctx.arc(p.x, p.y, 17, -Math.PI / 2, -Math.PI / 2 + TAU * dp); ctx.lineWidth = 3; ctx.strokeStyle = rgba(P.pine, 0.7 * a); ctx.stroke(); }
      }
      const dk = darkAt(p.x, p.y, t);
      if (dk > 0) col = mix(col, P.dInk, dk);
      if (t > T.pour - 0.05) return;   // handed over to step 4
      dot(p.x, p.y, r * pop, col, a);
      if (!back && got) ripple(p.x, p.y, t, p.gt, 10, 34, P.ochre, 0.5, 1.4);
    });
    // the hero dot travelling to become the phone (and back)
    if (t > T.zoom2 && t < T.shrink + 0.6) {
      const m = phoneMorph(t);
      if (m < 0.999) {
        const { x, y, w, h, r, sx, sy, sw, sh, sr } = heroGeom(t, m);
        // ochre -> blank white screen -> the bezel darkens (a straight ochre-to-ink blend would pass through olive)
        const body = t >= T.shrink ? mix(P.pine, P.ink, seg(m, 0.15, 0.6))
          : m < 0.42 ? mix(P.ochre, P.surface, seg(m, 0.08, 0.42)) : mix(P.surface, P.ink, seg(m, 0.42, 0.8));
        ctx.save(); ctx.shadowColor = `rgba(20,32,28,${0.22 * m})`; ctx.shadowBlur = 60 * m; ctx.shadowOffsetY = 26 * m;
        rrect(x - w / 2, y - h / 2, w, h, r); ctx.fillStyle = body; ctx.fill(); ctx.restore();
        // the screen stays solid white while the bezel darkens around it (fades out again on the way back)
        const sa = t >= T.shrink ? seg(m, 0.4, 0.9) : m > 0.42 ? 1 : 0;
        if (m > 0.35 && sa > 0) { rrect(sx, sy, sw, sh, sr); ctx.fillStyle = rgba(P.surface, sa); ctx.fill(); }
        if (m > 0.6) { rrect(x - 55 * m, y - h / 2 + 30 * m, 110 * m, 32 * m, 16 * m); ctx.fillStyle = rgba(P.ink, seg(m, 0.6, 0.95)); ctx.fill(); }
      }
    }
  }

  /* ============================================================ step 03
     One person's phone: the assessment itself. Tap an answer, then the other
     questions flick past until the survey is submitted, anonymously. */
  const Q1 = 'AI chatbots sometimes give different answers when asked the same question twice. Why is that?';
  const OPTS = ['The connection changes', 'It predicts likely wording', 'It is faulty', 'It remembers you', "I'm not sure"];
  const QS = [
    ['ORGANISATION', 'My organisation has a clear direction on AI.'],
    ['ADOPTION', 'How often did you use an AI tool for work in the last 30 days?'],
    ['LITERACY', 'How would you rate your own AI knowledge?'],
    ['DEMONSTRATED', 'How often do you check a fact from AI somewhere else?'],
    ['AWARENESS', 'Which of these AI tools do you recognise?'],
    ['AFFINITY (ATI)', 'I like testing the functions of new technical systems.'],
    ['ADOPTION', 'What would you use AI for at work?'],
    ['ORGANISATION', 'I know who to ask about AI at work.'],
  ];
  const SCALE = ['Never', 'Rarely', 'Sometimes', 'Often', 'Always'];
  function step3(t) {
    const m = phoneMorph(t);
    if (m >= 0.999) return phoneScreen(t, true);
    // On the way back the finished screen shrinks with the phone and fades into the dot:
    // draw it once on the layer, then place it inside the morphing screen.
    if (t < T.shrink || m < 0.45) return;
    const g = heroGeom(t, m), s = Math.min(g.sw / (HERO_PHONE.w - 24), g.sh / (HERO_PHONE.h - 24));
    ctx = layerCtx; reset(); ctx.clearRect(0, 0, W, H); phoneScreen(t, false); ctx = mainCtx;
    ctx.save(); rrect(g.sx, g.sy, g.sw, g.sh, g.sr); ctx.clip(); ctx.globalAlpha = seg(m, 0.45, 0.9);
    ctx.translate(g.x, g.y); ctx.scale(s, s); ctx.translate(-HERO_PHONE.x, -HERO_PHONE.y); ctx.drawImage(layer, 0, 0);
    ctx.restore();
  }
  function phoneScreen(t, body) {
    const { x: px, y: py, w, h, r } = HERO_PHONE;
    const X0 = px - w / 2, Y0 = py - h / 2;
    const sx = X0 + 12, sy = Y0 + 12, sw = w - 24, sh = h - 24;
    if (body) {
      ctx.save(); ctx.shadowColor = 'rgba(20,32,28,0.22)'; ctx.shadowBlur = 60; ctx.shadowOffsetY = 26;
      rrect(X0, Y0, w, h, r); ctx.fillStyle = P.ink; ctx.fill(); ctx.restore();
      rrect(sx, sy, sw, sh, r - 10); ctx.fillStyle = P.surface; ctx.fill();
      rrect(px - 55, Y0 + 30, 110, 32, 16); ctx.fillStyle = P.ink; ctx.fill();
    }
    ctx.save(); rrect(sx, sy, sw, sh, r - 10); ctx.clip();
    const cx0 = sx + 30, cw = sw - 60;
    const ca = seg(t, T.qIn - 0.05, T.qIn + 0.25);
    // status row: anonymous chip + counter
    const chipY = sy + 78;
    ctx.globalAlpha = ca; pill(cx0, chipY - 22, 178, 44); ctx.fillStyle = P.pineSoft; ctx.fill(); ctx.globalAlpha = 1;
    lockIcon(cx0 + 26, chipY - 2, 1.05, rgba(P.pine, ca));
    text('Anonymous', F.text(22, 600), cx0 + 46, chipY + 8, P.pine, ca);
    const qv = 1 + 8 * E.inOutCubic(seg(t, T.ffwd, T.ffwdEnd));
    const done = seg(t, T.done - 0.1, T.done + 0.15);
    text('of 9', F.mono(22, 500), cx0 + cw, chipY + 8, P.muted, ca * (1 - done), 'right');
    odometer(qv, { x: cx0 + cw - measure(' of 9', F.mono(22, 500)) - 4, y: chipY + 8, font: F.mono(22, 500), size: 22, intCols: 1, color: P.muted, align: 'right', alpha: ca * (1 - done) });
    // progress
    const pgY = chipY + 40;
    ctx.globalAlpha = ca; pill(cx0, pgY, cw, 8); ctx.fillStyle = P.sunken; ctx.fill();
    pill(cx0, pgY, Math.max(8, cw * (done > 0 ? 1 : qv / 9)), 8); ctx.fillStyle = P.ochre; ctx.fill(); ctx.globalAlpha = 1;
    // question carousel
    const slide = E.inOutCubic(clamp(qv - 1 - Math.floor(qv - 1)));
    const blockA = done > 0 ? 1 - done : 1;
    for (let j = 0; j < 2; j++) {
      const qi = Math.floor(qv - 1) + j;         // 0 = first question
      if (qi > 8) continue;
      const off = (j - slide) * (sw + 40);
      if (Math.abs(off) > sw + 40) continue;
      qBlock(qi, cx0 + off, pgY + 58, cw, t, ca * blockA);
    }
    // submitted
    if (done > 0) {
      const cp = spring(t - T.done, 2.2, 0.6);
      ctx.beginPath(); ctx.arc(px, py - 40, 70 * cp, 0, TAU); ctx.fillStyle = P.pine; ctx.fill();
      checkPath(px, py - 40, 70, E.outCubic(seg(t, T.done + 0.08, T.done + 0.4)), P.surface, 9);
      rise(lay('Submitted', F.sub(40)), px - measure('Submitted', F.sub(40)) / 2, py + 90, P.ink, t, T.done + 0.12, {});
      text('Anonymously. Thank you.', F.text(24, 400), px, py + 134, P.muted, seg(t, T.done + 0.3, T.done + 0.5), 'center');
    }
    ctx.restore();
    // the finger comes in from outside the phone, so it is drawn after the screen clip
    if (t > T.point - 0.05 && t < T.next + 0.4) {
      const opt1Y = OPT_Y[1], nextY = NEXT_Y;
      const p1 = E.inOutCubic(seg(t, T.point, T.pick - 0.06));
      const p2 = E.inOutCubic(seg(t, T.pick + 0.2, T.next - 0.06));
      const x = lerp(lerp(760, cx0 + 120, p1), px, p2), y = lerp(lerp(1500, opt1Y, p1), nextY, p2);
      const press = Math.max(Math.sin(Math.PI * seg(t, T.pick - 0.06, T.pick + 0.16)), Math.sin(Math.PI * seg(t, T.next - 0.06, T.next + 0.16)));
      touch(x, y, press, seg(t, T.point - 0.05, T.point + 0.1) * (1 - seg(t, T.next + 0.15, T.next + 0.4)));
    }
  }
  const OPT_Y = [];
  let NEXT_Y = 0;
  function qBlock(qi, x0, y0, cw, t, a) {
    if (a <= 0.002) return;
    const first = qi === 0;
    const [cat, q] = first ? ['DEMONSTRATED', Q1] : QS[qi - 1];
    text(cat, F.text(18, 600), x0, y0 + 26, P.muted, a, 'left', 2.2);
    const lines = wrap(q, F.sub(28), cw);
    lines.forEach((ln, i) => text(ln, F.sub(28), x0, y0 + 76 + i * 38, P.ink, a));
    const oy = y0 + 76 + lines.length * 38 + 30;
    const opts = first ? OPTS : SCALE;
    const picked = first ? (t >= T.pick ? 1 : -1) : Math.floor(hash(qi, 5) * 5);
    opts.forEach((o, k) => {
      const y = oy + k * 48;
      if (first) OPT_Y[k] = y;
      const sel = k === picked;
      const selP = first ? spring(t - T.pick, 3, 0.55) : 1;
      if (sel) { ctx.globalAlpha = a * clamp(selP); rrect(x0 - 10, y - 20, cw + 20, 44, 12); ctx.fillStyle = P.pineSoft; ctx.fill(); ctx.globalAlpha = 1; }
      ctx.beginPath(); ctx.arc(x0 + 12, y + 2, 11, 0, TAU); ctx.lineWidth = 2; ctx.strokeStyle = rgba(sel ? P.pine : P.faint, a); ctx.stroke();
      if (sel) { ctx.beginPath(); ctx.arc(x0 + 12, y + 2, 6 * clamp(selP, 0, 1.3), 0, TAU); ctx.fillStyle = rgba(P.pine, a); ctx.fill(); }
      text(o, F.text(21, sel ? 500 : 400), x0 + 36, y + 9, sel ? P.ink : P.body, a);
    });
    const by = oy + opts.length * 48 + 14;
    if (first) NEXT_Y = by + 24;
    const enabled = first ? seg(t, T.pick + 0.05, T.pick + 0.25) : 1;
    const press = first && t > T.next ? Math.exp(-(t - T.next) * 9) : 0;
    ctx.globalAlpha = a; pill(x0, by, cw, 48); ctx.fillStyle = mix(mix(P.border, P.pine, enabled), '#102C28', press); ctx.fill(); ctx.globalAlpha = 1;
    text('Next', F.text(22, 500), x0 + cw / 2, by + 32, enabled > 0.5 ? P.onPine : P.muted, a, 'center');
  }

  /* ============================================================ step 04
     In the dark, every answer pours into the mark. Six dimensions come out,
     then the mark turns back into a ring: one readiness score. */
  const DIMS = [['Awareness', 100], ['Adoption', 83], ['Literacy', 100], ['Organisation', 79], ['Affinity (ATI)', 67], ['Demonstrated', 100]];
  const ENG = { x: 540, y: 690, D: 100 };
  const RING = { x: 540, y: 990, ro: 212, ri: 178 };
  const arcEnd = v => -Math.PI / 2 + (TAU * v) / 100;
  const GAP88 = (arcEnd(88) - Math.PI / 2 + TAU) / 2;
  const ROT88 = (() => { let r = SLOT - GAP88; while (r < 0) r += TAU; while (r > Math.PI) r -= TAU; return r; })();
  function engineState(t) {
    const m = 1 - E.inOutCubic(seg(t, T.weigh, T.weigh + 0.6));            // 1 = mark, 0 = ring
    const mv = E.inOutCubic(seg(t, T.weigh, T.weigh + 0.6));
    const x = lerp(ENG.x, RING.x, mv), y = lerp(ENG.y, RING.y, mv);
    const Dm = lerp(ENG.D, RING.ro * 1.05, mv);
    const spin = TAU * E.inOutCubic(seg(t, T.pour + 0.2, T.bars + 0.6));
    return { m, x, y, D: Dm, spin };
  }
  function step4(t) {
    if (t < T.s4 + 0.05 || t > T.rep + 0.9) return;
    const es = engineState(t);
    const appear = spring(t - T.markIn, 1.8, 0.6);
    // answers pour into the mark
    PEOPLE.forEach((p0, i) => {
      const p = compact(t, p0);
      const t0 = T.pour + hash(i, 11) * 0.45, t1 = t0 + 0.5;
      const q = seg(t, t0, t1);
      if (q >= 1) return;
      const e = E.inCubic(q);
      const ang = Math.atan2(p.y - ENG.y, p.x - ENG.x) + e * 1.6;
      const rad = Math.hypot(p.x - ENG.x, p.y - ENG.y) * (1 - e);
      const x = ENG.x + rad * Math.cos(ang), y = ENG.y + rad * Math.sin(ang);
      dot(x, y, 10 * (1 - 0.6 * e), mix(P.pine, P.dInk, darkAt(p.x, p.y, t)), 1);
    });
    // the engine: mark -> ring
    if (appear > 0.001) {
      if (es.m > 0.999) {
        ctx.save(); ctx.translate(es.x, es.y); ctx.rotate(es.spin); markPath(MK, 0, 0, ENG.D * appear); ctx.restore();
        ctx.fillStyle = P.ochre; ctx.fill();
      } else {
        const S = ringSec(RING.ro, RING.ri, -Math.PI / 2, arcEnd(88));
        // track
        ctx.beginPath(); ctx.arc(RING.x, RING.y, (RING.ro + RING.ri) / 2, 0, TAU); ctx.lineWidth = RING.ro - RING.ri; ctx.strokeStyle = rgba('#2B3D37', seg(es.m, 0.6, 0) * (1 - seg(t, T.rep + 0.2, T.rep + 0.5))); ctx.stroke();
        pathSec({ a: S, b: MK.sec }, es.x, es.y, 1, ENG.D * lerp(RING.ro * 1.05 / ENG.D, 1, es.m), ROT88 * es.m, es.m, es.m);
        ctx.fillStyle = mix(P.ochre, P.dInk, seg(es.m, 0.8, 0.2)); ctx.globalAlpha = 1 - seg(t, T.rep + 0.2, T.rep + 0.5); ctx.fill(); ctx.globalAlpha = 1;
      }
      ripple(ENG.x, ENG.y, t, T.markIn + 0.1, 40, 220, P.dOchre, 0.8, 2);
    }
    // six dimensions
    const outB = seg(t, T.weigh - 0.05, T.weigh + 0.35);
    DIMS.forEach(([name, v], k) => {
      const t0 = T.bars + k * 0.12, y = 870 + k * 84;
      if (t < t0) return;
      const a = seg(t, t0, t0 + 0.2) * (1 - seg(outB, k * 0.08, k * 0.08 + 0.5));
      if (a <= 0.002) return;
      const g = E.outQuint(seg(t, t0 + 0.05, t0 + 0.85)) * (1 - E.inOutCubic(seg(outB, k * 0.08, k * 0.08 + 0.6)));
      text(name, F.text(28, 500), MX, y, P.dBody, a);
      odometer(v * E.outQuint(seg(t, t0 + 0.05, t0 + 0.85)), { x: W - MX, y: y + 2, font: F.disp(40), size: 40, intCols: v === 100 ? 3 : 2, color: k === 4 ? P.dOchre : P.dInk, align: 'right', alpha: a });
      ctx.globalAlpha = a; pill(MX, y + 18, CW, 10); ctx.fillStyle = '#2B3D37'; ctx.fill();
      pill(MX, y + 18, Math.max(10, CW * (v / 100) * g), 10); ctx.fillStyle = k === 4 ? P.dOchre : P.dInk; ctx.fill(); ctx.globalAlpha = 1;
    });
    // the score
    const sa = seg(t, T.weigh + 0.42, T.weigh + 0.62) * (1 - seg(t, T.rep + 0.15, T.rep + 0.45));
    if (sa > 0.002) {
      odometer(88 * E.outQuint(seg(t, T.weigh + 0.42, T.score + 0.9)), { x: RING.x - 6, y: RING.y + 50, font: F.disp(150), size: 150, intCols: 2, color: P.dInk, align: 'center', alpha: sa, suffix: '%', suffixFont: F.disp(56), gap: 6 });
      text('READINESS', F.text(18, 600), RING.x, RING.y + 104, P.dMuted, sa, 'center', 2.6);
      const ha = spring(t - T.score - 0.25, 2.4, 0.6);
      const a = arcEnd(88), hr = (RING.ro + RING.ri) / 2;
      if (ha > 0) dot(RING.x + hr * Math.cos(a), RING.y + hr * Math.sin(a), 12 * ha, P.dOchre, sa);
    }
    const ta = 1 - seg(t, T.rep + 0.15, T.rep + 0.45);
    rise(lay('Elite AI Navigator', F.sub(46)), RING.x - measure('Elite AI Navigator', F.sub(46)) / 2, 1270, P.dInk, t, T.tier, { alpha: ta });
    const badges = ['▲ 5% vs your sector', '▲ 10% vs Mesura'];
    const bw = badges.map(s => measure(s, F.text(24, 600)) + 44);
    let bx = RING.x - (bw[0] + bw[1] + 16) / 2;
    badges.forEach((s, i) => {
      const bp = spring(t - T.badges - i * 0.12, 2.6, 0.6);
      if (bp > 0.001) {
        ctx.save(); ctx.translate(bx + bw[i] / 2, 1340); ctx.scale(bp, bp); ctx.globalAlpha = ta;
        pill(-bw[i] / 2, -26, bw[i], 52); ctx.fillStyle = '#24352F'; ctx.fill(); ctx.restore();
        text(s, F.text(24, 600), bx + bw[i] / 2, 1349, '#8FC0B3', ta * clamp(bp), 'center');
      }
      bx += bw[i] + 16;
    });
  }

  /* ============================================================ report
     A white report sheet rises over the dark: summary, named actions and the
     next measurement. */
  const SHEET = { x: 72, w: 936, h: 900, top: 572 };
  function sheetY(t) {
    const up = spring(t - T.rep, 1.35, 0.82), down = E.inCubic(seg(t, T.end - 0.2, T.end + 0.35));
    return lerp(H + 40, SHEET.top, up) + down * 1500;
  }
  function report(t) {
    if (t < T.rep || t > T.end + 0.4) return;
    const y0 = sheetY(t), x0 = SHEET.x + 56;
    card(SHEET.x, y0, SHEET.w, SHEET.h, 36, P.surface, 1, 0.45, null);
    ctx.save(); rrect(SHEET.x, y0, SHEET.w, SHEET.h, 36); ctx.clip();
    const R = (s, y, t0, font, color, o = {}) => rise(lay(s, font, o.ls || 0), o.x ?? x0, y0 + y, color, t, t0, o);
    R('MESURA DIAGNOSTIC  ·  TAKE 1', 74, T.rows, F.text(20, 600), P.muted, { ls: 2.4 });
    // summary: mini ring + tier + badges
    const ra = seg(t, T.rows + 0.1, T.rows + 0.3);
    const rv = 88 * E.outQuint(seg(t, T.rows + 0.1, T.rows + 0.8));
    const rcx = x0 + 88, rcy = y0 + 214;
    ctx.globalAlpha = ra; ctx.beginPath(); ctx.arc(rcx, rcy, 79, 0, TAU); ctx.lineWidth = 16; ctx.strokeStyle = P.track; ctx.stroke(); ctx.globalAlpha = 1;
    if (rv > 0.3) { ctx.save(); ctx.translate(rcx, rcy); pathSec({ a: ringSec(87, 71, -Math.PI / 2, arcEnd(rv)) }, 0, 0, 1, 1); ctx.fillStyle = rgba(P.pine, ra); ctx.fill(); ctx.restore(); }
    odometer(rv, { x: rcx - 2, y: rcy + 17, font: F.disp(46), size: 46, intCols: 2, color: P.ink, align: 'center', alpha: ra, suffix: '%', suffixFont: F.disp(22), gap: 2 });
    R('Elite AI Navigator', 196, T.rows + 0.2, F.disp(46), P.ink, { x: x0 + 216 });
    const bt = ['▲ 5% vs your sector', '▲ 10% vs Mesura'];
    let bx = x0 + 216;
    bt.forEach((s, i) => {
      const bw = measure(s, F.text(22, 600)) + 36, bp = spring(t - T.rows - 0.45 - i * 0.1, 2.6, 0.6);
      if (bp > 0.001) {
        ctx.save(); ctx.translate(bx + bw / 2, y0 + 262); ctx.scale(bp, bp); pill(-bw / 2, -23, bw, 46); ctx.fillStyle = P.pineSoft; ctx.fill(); ctx.restore();
        text(s, F.text(22, 600), bx + bw / 2, y0 + 270, P.positive, clamp(bp), 'center');
      }
      bx += bw + 12;
    });
    const dv = (y, t0) => { const p = E.outExpo(seg(t, t0, t0 + 0.6)); ctx.fillStyle = P.border; ctx.fillRect(x0, y0 + y, (SHEET.w - 112) * p, 2); };
    dv(340, T.rows + 0.5);
    R('RECOMMENDED ACTIONS', 404, T.act1 - 0.15, F.text(20, 600), P.muted, { ls: 2.4 });
    const acts = [['1', ['Find your organisation’s rules', 'on AI and customer data'], 474, T.act1], ['2', ['Verify AI-generated statistics', 'before using them'], 610, T.act2]];
    acts.forEach(([n, lines, y, t0]) => {
      R(n, y + 8, t0, F.disp(52), P.ochre);
      riseLines(lines, F.sub(34), x0 + 64, y0 + y, 44, P.ink, t, t0 + 0.05);
    });
    dv(730, T.act2 + 0.3);
    const la = seg(t, T.remeasure, T.remeasure + 0.25);
    if (la > 0) loopIcon(x0 + 22, y0 + 790, 19, 2.2 * Math.max(0, t - T.remeasure) + E.outBack(la) * 2, rgba(P.ochre, la));
    R('Scheduled remeasurement', 802, T.remeasure, F.text(30, 600), P.ink, { x: x0 + 64 });
    R('Proof that what you did made a difference.', 846, T.remeasure + 0.12, F.text(24, 400), P.muted, { x: x0 + 64 });
    ctx.restore();
  }

  /* ================================================================ end */
  function endCard(t) {
    if (t < T.end) return;
    const tf = F.sub(56);
    const L1 = lay('Measure where you stand.', tf), L2 = lay('Keep measuring.', tf);
    rise(L1, 540 - L1.width / 2, 1160, P.ink, t, T.tag1, { stagger: 0.05 });
    rise(L2, 540 - L2.width / 2, 1232, P.ochre, t, T.tag2, { stagger: 0.07 });
    const bp = spring(t - T.cta, 1.9, 0.62);
    if (bp > 0.001) {
      const bw = 560, bh = 104, by = 1360;
      ctx.save(); ctx.translate(540, by); ctx.scale(lerp(0.9, 1, clamp(bp)), lerp(0.9, 1, clamp(bp))); ctx.globalAlpha = clamp(bp * 1.5);
      pill(-bw / 2, -bh / 2, bw, bh); ctx.fillStyle = P.pine; ctx.fill();
      // one soft highlight sweeps across the button
      const sp = seg(t, T.cta + 0.6, T.cta + 1.3);
      if (sp > 0 && sp < 1) {
        ctx.save(); pill(-bw / 2, -bh / 2, bw, bh); ctx.clip();
        const hx = lerp(-bw / 2 - 120, bw / 2 + 120, E.inOutCubic(sp));
        const g = ctx.createLinearGradient(hx - 90, 0, hx + 90, 0);
        g.addColorStop(0, 'rgba(246,242,233,0)'); g.addColorStop(0.5, 'rgba(246,242,233,0.22)'); g.addColorStop(1, 'rgba(246,242,233,0)');
        ctx.fillStyle = g; ctx.fillRect(-bw / 2, -bh / 2, bw, bh); ctx.restore();
      }
      ctx.restore();
      text('Get your Diagnostic', F.text(36, 500), 540, by + 13, P.onPine, clamp(bp * 1.5), 'center');
    }
    text('mesura.ai', F.text(30, 500), 540, 1488, P.muted, seg(t, T.cta + 0.3, T.cta + 0.6), 'center', 1);
    ripple(END.mx, END.my, t, T.end + 0.75, END.mD * 0.9, END.mD * 2.6, P.ochre, 0.9, 2);
  }

  /* ========================================================= headlines */
  const HEADS = [
    { t0: T.s1, eyebrow: 'STEP 01 OF 04', lines: ['Sign up.'], body: 'Register and get a unique code for your organisation.' },
    { t0: T.s2, eyebrow: 'STEP 02 OF 04', lines: ['Share the code.'], body: 'Share it with a team, a department or your whole workforce.' },
    { t0: T.s3, eyebrow: 'STEP 03 OF 04', lines: ['Answer', 'anonymously.'], body: 'Each person answers on their own phone or browser, anonymously.' },
    { t0: T.s4, eyebrow: 'STEP 04 OF 04', lines: ['Diagnose and', 'generate.'], body: 'Mesura scores readiness, attitudes and usage, then writes the report.' },
    { t0: T.rep, eyebrow: 'WHAT YOU GET', lines: ['Findings become', 'named actions.'], body: '' },
  ];
  const HL = ['a team', 'a department', 'your whole workforce'];
  function headlines(t) {
    HEADS.forEach((hd, i) => {
      const t1 = (HEADS[i + 1]?.t0 ?? T.end) - 0.3;
      if (t < hd.t0 - 0.05 || t > t1 + 0.6) return;
      const dk = darkAt(540, 420, t);
      const two = hd.lines.length === 2;
      const tf = F.disp(104);
      const b0 = two ? 412 : 468;
      // eyebrow
      const ea = seg(t, hd.t0, hd.t0 + 0.1) * (1 - seg(t, t1, t1 + 0.25));
      text(scramble(hd.eyebrow, seg(t, hd.t0, hd.t0 + 0.45), t, true), F.text(26, 600), MX, b0 - 128, mix(P.ochre, P.dOchre, dk), ea, 'left', 3.1);
      hd.lines.forEach((ln, j) => rise(lay(ln, tf), MX, b0 + j * 100, mix(P.ink, P.dInk, dk), t, hd.t0 + 0.08 + j * 0.08, { tOut: t1 + j * 0.04, stagger: 0.05 }));
      if (hd.body) {
        const bf = F.text(38, 400), lines = wrap(hd.body, bf, CW);
        const bdk = darkAt(540, 1490, t);
        const starts = lines.map((_, li) => lines.slice(0, li).reduce((n, l) => n + l.length + 1, 0));
        const spans = HL.map((w, k) => { const at = hd.body.indexOf(w); return [at, at + w.length, T.got[k]]; });
        riseLines(lines, bf, MX, 1482, 54, mix(P.body, P.dBody, bdk), t, hd.t0 + 0.45, {
          tOut: t1, lineStagger: 0.08, dur: 0.7,
          colorOf: i === 1 ? (li, ci) => {
            // "a team" / "a department" / "your whole workforce" light up as the code reaches them
            const g = starts[li] + ci;
            for (const [a0, a1, at] of spans) if (g >= a0 && g < a1 && t >= at) return mix(P.body, P.ochre, seg(t, at, at + 0.15));
            return P.body;
          } : undefined,
        });
      }
    });
  }

  /* =============================================================== HUD */
  const hudA = t => seg(t, T.s1 - 0.1, T.s1 + 0.3) * (1 - seg(t, T.end - 0.2, T.end + 0.1));
  function hudLabel(t) {
    const a = hudA(t);
    if (a > 0.002) text('HOW IT WORKS', F.mono(22, 500), W - MX, 208, mix(P.muted, P.dMuted, darkAt(900, 200, t)), a, 'right', 2);
  }
  function hud(t) {
    const a = hudA(t);
    if (a <= 0.002) return;
    // four step segments
    const y = 1664, gap = 12, sw = (CW - gap * 3) / 4;
    const labels = ['Sign up', 'Share', 'Answer', 'Diagnose'];
    labels.forEach((lb, i) => {
      const x = MX + i * (sw + gap);
      const f = E.inOutCubic(seg(t, STEPS[i], STEPS[i + 1] - 0.1));
      const dki = darkAt(x + sw / 2, y, t);
      ctx.globalAlpha = a; pill(x, y, sw, 6); ctx.fillStyle = mix(P.border, '#2B3D37', dki); ctx.fill();
      if (f > 0) { pill(x, y, Math.max(6, sw * f), 6); ctx.fillStyle = mix(P.ochre, P.dOchre, dki); ctx.fill(); }
      ctx.globalAlpha = 1;
      const cur = t >= STEPS[i] && t < STEPS[i + 1];
      text(lb.toUpperCase(), F.text(18, 600), x, y + 40, mix(cur ? P.ink : P.faint, cur ? P.dInk : P.dFaint, dki), a, 'left', 2);
    });
  }

  /* ============================================================= frame */
  function drawFrame(t) {
    t = clamp(t, 0, DUR - 1e-6);
    reset();
    background(t);
    intro(t);
    step2(t);
    step1(t);
    step3(t);
    step4(t);
    headlines(t);
    hud(t);
    report(t);
    endCard(t);
    drawLockupWordmark(t);
    drawMark(t);
    hudLabel(t);
    reset();
  }

  const post = frame => D.post(frame, [540, 960, 700, 1500], 0.07);
  const FAST = [[0, 1.5], [2.4, 3.8], [4.3, 5.6], [7.1, 8.0], [8.0, 11.7], [11.95, 13.2], [13.4, 14.6], [16.1, 18.8], [18.6, 19.6], [20.0, 21.6], [22.1, 23.0], [26.7, 28.0], [28.1, 29.2]];
  const HEAVY = [[T.ffwd, T.ffwdEnd, 16], [T.drop + 0.2, T.land + 0.02, 16]];
  const samplesAt = t => { for (const [a, b, n] of HEAVY) if (t >= a && t <= b) return n; return FAST.some(([a, b]) => t >= a && t <= b) ? 10 : 4; };
  const shutterAt = () => 0.55;
  function renderFrame(frame, opt = {}) {
    const t0 = frame / FPS;
    const n = opt.samples ?? samplesAt(t0), shutter = opt.shutter ?? shutterAt(t0);
    D.accumulate(t0, n, shutter, FPS, drawFrame);
    post(frame);
    return n;
  }

  // Event sheet for the soundtrack.
  function cues() {
    const keys = []; for (let i = 1; i <= EMAIL.length; i++) keys.push(+(T.type0 + (i / EMAIL.length) * (T.type1 - T.type0)).toFixed(4));
    const qTicks = []; let last = 1;
    for (let t = T.ffwd; t <= T.ffwdEnd; t += 0.001) { const q = Math.floor(1 + 8 * E.inOutCubic(seg(t, T.ffwd, T.ffwdEnd)) + 1e-6); if (q !== last) { qTicks.push(+t.toFixed(4)); last = q; } }
    const pour = PEOPLE.map((p, i) => +(T.pour + hash(i, 11) * 0.45 + 0.5).toFixed(4)).sort((a, b) => a - b);
    const ring = []; let lr = 0;
    for (let t = T.weigh + 0.42; t <= T.score + 0.9; t += 0.001) { const v = Math.floor(88 * E.outQuint(seg(t, T.weigh + 0.42, T.score + 0.9))); if (v !== lr) { if (!ring.length || t - ring[ring.length - 1] > 0.02) ring.push(+t.toFixed(4)); lr = v; } }
    return {
      T, DUR, keys, qTicks, pour, ring,
      got: PEOPLE.map(p => ({ t: +p.gt.toFixed(4), x: p.x, grp: p.grp })),   // step 02 layout
      pop: PEOPLE.map(p => ({ t: +p.pt.toFixed(4), x: p.x, grp: p.grp })),
      done: PEOPLE.map(p => +p.dn.toFixed(4)),
      bars: DIMS.map((d, k) => +(T.bars + k * 0.12).toFixed(3)),
    };
  }

  async function init() {
    await loadFonts();
    const pc = document.createElement('canvas'); pc.width = pc.height = 48;
    const pg = pc.getContext('2d'); pg.fillStyle = P.gridDot; pg.beginPath(); pg.arc(24, 24, 1.25, 0, TAU); pg.fill();
    gridPat = ctx.createPattern(pc, 'repeat');
    MK = buildMark();
    WPATH = WORDMARK.map(g => new Path2D(g.d));
    layer = document.createElement('canvas'); layer.width = W; layer.height = H; layerCtx = layer.getContext('2d');
    initPeople();
    drawFrame(0); post(0);
  }

  return { W, H, FPS, DUR, init, drawFrame: t => { drawFrame(t); post(Math.floor(t * FPS)); }, renderFrame, samplesAt, cues };
}

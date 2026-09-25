// Shared engine: pure maths, colour, type and logo geometry for the Mesura films.
import { MARK } from '../logo.js';

export const TAU = Math.PI * 2;

/* ------------------------------------------------------------------ math */
export const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
export const lerp = (a, b, t) => a + (b - a) * t;
export const seg = (t, a, b) => clamp((t - a) / (b - a));
export const E = {
  inCubic: t => t * t * t,
  outCubic: t => 1 - (1 - t) ** 3,
  inOutCubic: t => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2),
  inQuart: t => t ** 4,
  outQuart: t => 1 - (1 - t) ** 4,
  inOutQuart: t => (t < 0.5 ? 8 * t ** 4 : 1 - (-2 * t + 2) ** 4 / 2),
  outQuint: t => 1 - (1 - t) ** 5,
  inOutQuint: t => (t < 0.5 ? 16 * t ** 5 : 1 - (-2 * t + 2) ** 5 / 2),
  inExpo: t => (t <= 0 ? 0 : 2 ** (10 * t - 10)),
  outExpo: t => (t >= 1 ? 1 : 1 - 2 ** (-10 * t)),
  inOutExpo: t => (t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? 2 ** (20 * t - 10) / 2 : (2 - 2 ** (-20 * t + 10)) / 2),
  outBack: (t, s = 1.70158) => 1 + (s + 1) * (t - 1) ** 3 + s * (t - 1) ** 2,
  inOutSine: t => -(Math.cos(Math.PI * t) - 1) / 2,
};
// CSS-style cubic-bezier, used for the brand's --ease curve.
export function bezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sx = u => ((ax * u + bx) * u + cx) * u, sy = u => ((ay * u + by) * u + cy) * u;
  const dx = u => (3 * ax * u + 2 * bx) * u + cx;
  return x => {
    if (x <= 0) return 0; if (x >= 1) return 1;
    let u = x;
    for (let i = 0; i < 8; i++) { const e = sx(u) - x, d = dx(u); if (Math.abs(e) < 1e-6 || Math.abs(d) < 1e-6) break; u -= e / d; }
    return sy(clamp(u));
  };
}
E.brand = bezier(0.4, 0, 0.2, 1);
// Damped spring step response: 0 -> 1 with overshoot. f = natural freq (Hz), z = damping ratio.
export function spring(dt, f = 2, z = 0.5) {
  if (dt <= 0) return 0;
  const w = TAU * f;
  if (z < 1) { const wd = w * Math.sqrt(1 - z * z); return 1 - Math.exp(-z * w * dt) * (Math.cos(wd * dt) + (z * w / wd) * Math.sin(wd * dt)); }
  return 1 - Math.exp(-w * dt) * (1 + w * dt);
}
// Decaying wobble for impacts: starts at 0, rings, settles to 0.
export const wobble = (dt, f = 7, k = 9) => (dt <= 0 ? 0 : Math.exp(-dt * k) * Math.sin(dt * f * TAU));
export function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export const hash = (a, b = 0) => { let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

/* ---------------------------------------------------------------- colour */
export const P = {
  paper: '#F2EDE3', sunken: '#EAE4D6', surface: '#FFFFFF', border: '#E3DCCC', borderStrong: '#D3CBB9',
  ink: '#22362F', body: '#45534D', muted: '#6E7A73', faint: '#A5A199',
  pine: '#1D4A43', pineSoft: '#DCE5DF', onPine: '#F6F2E9',
  ochre: '#D19C3F', ochreSoft: '#F3E6C9', positive: '#2E7D5B',
  dPaper: '#15211D', dSunken: '#101A17', dSurface: '#1D2C27', dBorder: '#2B3D37',
  dInk: '#EFEAE0', dBody: '#C2CAC4', dMuted: '#8D9891', dFaint: '#66716B', dOchre: '#DFAC52',
  track: '#E5DDCC', gridDot: '#CBC2AE',
};
export const RGB = {};
export const toRGB = h => RGB[h] || (RGB[h] = h[0] === '#' ? [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)] : h.slice(h.indexOf('(') + 1, -1).split(',').slice(0, 3).map(Number));
export const s2l = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
export const l2s = c => { const v = c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055; return Math.round(clamp(v) * 255); };
export const LAB = {};
export function toLab(h) {
  if (LAB[h]) return LAB[h];
  const [r, g, b] = toRGB(h).map(s2l);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return (LAB[h] = [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s]);
}
// Perceptual (OKLab) blend between two brand colours.
export function mix(a, b, t) {
  t = clamp(t); if (t <= 0) return a; if (t >= 1) return b;
  const A = toLab(a), B = toLab(b);
  const L = lerp(A[0], B[0], t), aa = lerp(A[1], B[1], t), bb = lerp(A[2], B[2], t);
  const l_ = L + 0.3963377774 * aa + 0.2158037573 * bb, m_ = L - 0.1055613458 * aa - 0.0638541728 * bb, s_ = L - 0.0894841775 * aa - 1.291485548 * bb;
  const l = l_ ** 3, m = m_ ** 3, s = s_ ** 3;
  return `rgb(${l2s(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s)},${l2s(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s)},${l2s(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s)})`;
}
export const rgba = (h, a) => { const [r, g, b] = toRGB(h); return `rgba(${r},${g},${b},${clamp(a)})`; };

/* ------------------------------------------------------------------ type */
export const F = {
  disp: (s, w = 500) => `${w} ${s}px SSD`,
  sub: s => `500 ${s}px SSS`,
  text: (s, w = 500) => `${w} ${s}px IT`,
  mono: (s, w = 400) => `${w} ${s}px JBM`,
};
export const FONT_FILES = [
  ['SSD', 'SerifDisplay-500', '500'], ['SSS', 'SerifSubhead-500', '500'],
  ['IT', 'InterText-400', '400'], ['IT', 'InterText-500', '500'], ['IT', 'InterText-600', '600'],
  ['JBM', 'Mono-400', '400'], ['JBM', 'Mono-500', '500'],
];

export async function loadFonts() {
  await Promise.all(FONT_FILES.map(([fam, file, w]) => new FontFace(fam, `url(${new URL(`../fonts/${file}.woff2`, import.meta.url)})`, { weight: w }).load().then(f => document.fonts.add(f))));
  await document.fonts.ready;
}

/* ------------------------------------------------------ mark geometry */
// The Mesura mark: an eight-point star with a centre hole and a slot at
// 45°, rebuilt from the logo artwork. Sampled in four sections so it can
// morph point-for-point with a progress ring (which has the same topology).
export const SLOT = -Math.PI / 4;
export const NS = [420, 48, 220, 48];
export function fillet(verts, nArc = 18) {
  const out = [], N = verts.length;
  for (let i = 0; i < N; i++) {
    const p0 = verts[(i - 1 + N) % N], p1 = verts[i], p2 = verts[(i + 1) % N], r = p1.r;
    if (!r) { out.push({ x: p1.x, y: p1.y, k: p1.k }); continue; }
    const v1x = p0.x - p1.x, v1y = p0.y - p1.y, v2x = p2.x - p1.x, v2y = p2.y - p1.y;
    const l1 = Math.hypot(v1x, v1y), l2 = Math.hypot(v2x, v2y);
    const u1x = v1x / l1, u1y = v1y / l1, u2x = v2x / l2, u2y = v2y / l2;
    const ang = Math.acos(clamp(u1x * u2x + u1y * u2y, -1, 1));
    let d = r / Math.tan(ang / 2);
    d = Math.min(d, l1 * p1.f, l2 * p1.f);
    const re = d * Math.tan(ang / 2);
    const ax = p1.x + u1x * d, ay = p1.y + u1y * d, bx = p1.x + u2x * d, by = p1.y + u2y * d;
    let bix = u1x + u2x, biy = u1y + u2y; const bl = Math.hypot(bix, biy); bix /= bl; biy /= bl;
    const h = re / Math.sin(ang / 2), cx = p1.x + bix * h, cy = p1.y + biy * h;
    const a0 = Math.atan2(ay - cy, ax - cx), a1 = Math.atan2(by - cy, bx - cx);
    let da = a1 - a0; while (da > Math.PI) da -= TAU; while (da < -Math.PI) da += TAU;
    for (let j = 0; j <= nArc; j++) { const a = a0 + (da * j) / nArc; out.push({ x: cx + re * Math.cos(a), y: cy + re * Math.sin(a), k: p1.k }); }
  }
  return out;
}
export function buildMark() {
  const { rh, w, rt, rc, rmU, rmL, rjU, rjL } = MARK;
  const ri = Math.cos(Math.PI / 4) / Math.cos(Math.PI / 8);
  const star = [];
  for (let k = 0; k < 16; k++) { const a = (k * Math.PI) / 8, r = k % 2 ? ri : 1; star.push({ x: r * Math.cos(a), y: r * Math.sin(a), k: k % 2 ? 'cc' : 'tip' }); }
  const dx = Math.cos(SLOT), dy = Math.sin(SLOT), nx = -dy, ny = dx;
  const hit = s => {
    let best = null;
    for (let k = 0; k < 16; k++) {
      const a = star[k], b = star[(k + 1) % 16];
      // t*d + s*w*n = a + u*(b-a)
      const m00 = dx, m01 = a.x - b.x, m10 = dy, m11 = a.y - b.y;
      const rx = a.x - s * w * nx, ry = a.y - s * w * ny;
      const det = m00 * m11 - m01 * m10; if (Math.abs(det) < 1e-12) continue;
      const tt = (rx * m11 - m01 * ry) / det, u = (m00 * ry - rx * m10) / det;
      if (u >= 0 && u <= 1 && tt > 0 && (!best || tt > best.t)) best = { t: tt, k };
    }
    return { x: best.t * dx + s * w * nx, y: best.t * dy + s * w * ny, k: best.k };
  };
  const U = hit(1), L = hit(-1);
  const ht = Math.sqrt(rh * rh - w * w);
  const Uh = { x: ht * dx + w * nx, y: ht * dy + w * ny }, Lh = { x: ht * dx - w * nx, y: ht * dy - w * ny };
  const V = [{ x: U.x, y: U.y, r: rmU, f: 0.8, k: 'U' }];
  for (let k = (U.k + 1) % 16; ; k = (k + 1) % 16) {
    V.push({ x: star[k].x, y: star[k].y, r: star[k].k === 'tip' ? rt : rc, f: star[k].k === 'cc' ? 0.2 : 0.49, k: 'star' });
    if (k === L.k) break;
  }
  V.push({ x: L.x, y: L.y, r: rmL, f: 0.8, k: 'L' });
  V.push({ x: Lh.x, y: Lh.y, r: rjL, f: 0.49, k: 'Lh' });
  const a0 = Math.atan2(Lh.y, Lh.x); let a1 = Math.atan2(Uh.y, Uh.x) - TAU; while (a1 > a0) a1 -= TAU;
  for (let i = 1; i < 160; i++) { const a = a0 + ((a1 - a0) * i) / 160; V.push({ x: rh * Math.cos(a), y: rh * Math.sin(a), r: 0, k: 'hole' }); }
  V.push({ x: Uh.x, y: Uh.y, r: rjU, f: 0.49, k: 'Uh' });
  const pts = fillet(V);
  const idx = k => pts.map((p, i) => (p.k === k ? i : -1)).filter(i => i >= 0);
  const iU = idx('U'), iL = idx('L'), iLh = idx('Lh'), iUh = idx('Uh');
  const s1 = pts.slice(iU[iU.length - 1], iL[0] + 1);
  const s2 = pts.slice(iL[0], iLh[iLh.length - 1] + 1);
  const s3 = pts.slice(iLh[iLh.length - 1], iUh[0] + 1);
  const s4 = pts.slice(iUh[0]).concat(pts.slice(0, iU[iU.length - 1] + 1));
  return { outline: pts, sec: [byAngle(s1, NS[0]), byLength(s2, NS[1]), byAngle(s3, NS[2]), byLength(s4, NS[3])] };
}
export function byLength(pts, n) {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  const tot = cum[cum.length - 1], out = [];
  let j = 0;
  for (let i = 0; i < n; i++) {
    const s = (tot * i) / (n - 1);
    while (j < pts.length - 2 && cum[j + 1] < s) j++;
    const f = (s - cum[j]) / Math.max(1e-9, cum[j + 1] - cum[j]);
    out.push([lerp(pts[j].x, pts[j + 1].x, f), lerp(pts[j].y, pts[j + 1].y, f)]);
  }
  return out;
}
export function byAngle(pts, n) {
  const ang = [Math.atan2(pts[0].y, pts[0].x)];
  for (let i = 1; i < pts.length; i++) { let a = Math.atan2(pts[i].y, pts[i].x); while (a - ang[i - 1] > Math.PI) a -= TAU; while (a - ang[i - 1] < -Math.PI) a += TAU; ang.push(a); }
  const a0 = ang[0], a1 = ang[ang.length - 1], dir = Math.sign(a1 - a0), out = [];
  let j = 0;
  for (let i = 0; i < n; i++) {
    const a = lerp(a0, a1, i / (n - 1));
    while (j < pts.length - 2 && (ang[j + 1] - a) * dir < 0) j++;
    const f = clamp((a - ang[j]) / (ang[j + 1] - ang[j] || 1e-9));
    out.push([lerp(pts[j].x, pts[j + 1].x, f), lerp(pts[j].y, pts[j + 1].y, f)]);
  }
  return out;
}
// Progress ring (arc a0 -> a1, clockwise on screen) with round caps, same section layout as the mark.
export function ringSec(ro, ri, a0, a1) {
  const rc = (ro + ri) / 2, cr = (ro - ri) / 2;
  const s1 = [], s2 = [], s3 = [], s4 = [];
  for (let i = 0; i < NS[0]; i++) { const a = lerp(a0, a1, i / (NS[0] - 1)); s1.push([ro * Math.cos(a), ro * Math.sin(a)]); }
  for (let i = 0; i < NS[1]; i++) { const f = a1 + (Math.PI * i) / (NS[1] - 1); s2.push([rc * Math.cos(a1) + cr * Math.cos(f), rc * Math.sin(a1) + cr * Math.sin(f)]); }
  for (let i = 0; i < NS[2]; i++) { const a = lerp(a1, a0, i / (NS[2] - 1)); s3.push([ri * Math.cos(a), ri * Math.sin(a)]); }
  for (let i = 0; i < NS[3]; i++) { const f = a0 + Math.PI + (Math.PI * i) / (NS[3] - 1); s4.push([rc * Math.cos(a0) + cr * Math.cos(f), rc * Math.sin(a0) + cr * Math.sin(f)]); }
  return [s1, s2, s3, s4];
}

// sRGB <-> linear lookup tables for the motion-blur accumulator.
export const LIN = new Float32Array(256);
for (let i = 0; i < 256; i++) LIN[i] = s2l(i);
export const OUTN = 16384;
export const OUT = new Uint8ClampedArray(OUTN + 1);
for (let i = 0; i <= OUTN; i++) OUT[i] = l2s(i / OUTN);

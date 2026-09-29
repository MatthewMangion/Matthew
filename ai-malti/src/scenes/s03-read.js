// S03 — READ (8–12s): "L-EWWEL: QRAJT." → the title shatters into words that print a typographic map of Malta
//                      → "TRILJUNI TA' KLIEM." → dive into the highlighted word "ħobż" (match-cut to yellow)
(function (G) {
  const { W, H, C, TAU, clamp, lerp, prog, Ease, rgba, mix, noise1, rnd, rndr, fitSize, layout, drawGlyphs, shake, spring, text, buf } = M;
  const XL = 72, XW = W - 144;
  const T = TL.S.read[0];

  // map placement
  const MS = 980, MX = 50, MY = 575;
  const rings = MALTA.rings.map((r) => {
    const pts = [];
    for (let i = 0; i < r.length; i += 2) pts.push([MX + r[i] * MS, MY + r[i + 1] * MS]);
    return pts;
  });
  function inside(x, y) {
    for (const pts of rings) {
      let c = false;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const [xi, yi] = pts[i], [xj, yj] = pts[j];
        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
      }
      if (c) return true;
    }
    return false;
  }
  function mapPath(ctx) {
    ctx.beginPath();
    for (const pts of rings) {
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.closePath();
    }
  }

  const WORDS = ('il- u ta\' li fil- Malta baħar xemx festa nanna pastizzi knisja Għawdex bajja lampuki ftira ġbejna kafè Valletta karozza ' +
    'traffiku skola xogħol familja ħbieb mużika kelma ktieb storja ilsien Malti the and of language world sentenza ħsieb għaliex kif meta fejn min ' +
    'xi ħaġa dar triq raħal belt ġnien fjura qalb imħabba ħajja żmien sena jum lejl dawl dlam ilma nar riħ art sema stilla qamar kelb qattus fenek ' +
    'ħuta għasfur tifel tifla raġel mara re reġina flus bank ħanut suq Marsaxlokk l-Imdina il-Birgu tas-Sliema ir-Rabat il-Mellieħa Ħaż-Żebbuġ ' +
    'iż-Żejtun luzzu kappillan banda murtali kannoli imqarrun timpana bigilla qassatat ħelwa bonġu grazzi saħħa ejja mela uwejja ajma ħeqq ' +
    'żgħir kbir sabiħ ġdid qadim ħafna ftit dejjem qatt issa illum għada ilbieraħ ferħ rabja biża\' tama ħolma kliem ittra poeżija kanzunetta').split(' ');

  // rows of text for the typographic map
  const ROW_H = 19, FS = 16.5;
  let rows = [], hobz = null, accents = [], parts = [];
  const QRAJT_Y = 1080;
  let sQ = 300;

  (G.prepare = G.prepare || []).push(async () => {
    const probe = buf('probe').x;
    probe.font = M.fontStr('A', 600, FS, 84);
    let wi = 0;
    for (let y = MY + 8, r = 0; y < MY + 0.87 * MS; y += ROW_H, r++) {
      let s = '', x = 0;
      const items = [];
      while (x < 1080) {
        const wd = WORDS[(wi * 7 + r * 13) % WORDS.length];
        wi++;
        const w0 = probe.measureText(s).width;
        s += wd + ' ';
        items.push({ w: wd, x0: w0, x1: probe.measureText(s.trimEnd()).width });
        x = probe.measureText(s).width;
      }
      rows.push({ y, s, items, r });
    }
    // place highlighted "ħobż" near the centre of the main island, plus colour accents
    const target = [MX + 0.69 * MS, MY + 0.6 * MS];
    let best = null;
    for (const row of rows) {
      for (const it of row.items) {
        const cx = 20 + (it.x0 + it.x1) / 2, cy = row.y - FS * 0.35;
        if (!inside(20 + it.x0 - 6, cy) || !inside(20 + it.x1 + 6, cy)) continue;
        const d = Math.hypot(cx - target[0], cy - target[1]);
        if (!best || d < best.d) best = { d, row, it };
      }
    }
    // rewrite that word to "ħobż"
    {
      const { row, it } = best;
      const before = row.s.slice(0, row.s.indexOf(' ', 0) >= 0 ? 0 : 0);
      // rebuild row string replacing the chosen item
      let s = '';
      const items = [];
      for (const x of row.items) {
        const wd = x === it ? 'ħobż' : x.w;
        const w0 = probe.measureText(s).width;
        s += wd + ' ';
        items.push({ w: wd, x0: w0, x1: probe.measureText(s.trimEnd()).width, hi: x === it });
      }
      row.s = s;
      row.items = items;
      const h = items.find((x) => x.hi);
      hobz = { x0: 20 + h.x0, x1: 20 + h.x1, y: row.y, row };
    }
    // colour accents (deterministic picks, must be inside the islands)
    const want = { pastizzi: C.red, festa: C.green, luzzu: C.sky, Malti: C.red, imħabba: C.pink, lampuki: C.green, Għawdex: C.yellow };
    for (const row of rows) {
      for (const it of row.items) {
        if (want[it.w] && inside(20 + it.x0, row.y - 6) && inside(20 + it.x1, row.y - 6) && rnd(row.r * 31 + it.x0, 2) > 0.35) {
          accents.push({ x: 20 + it.x0, y: row.y, w: it.w, col: want[it.w], ww: it.x1 - it.x0 });
        }
      }
    }
    // particles: sample points inside the "QRAJT." glyphs, targets inside the map
    sQ = fitSize(probe, 'QRAJT.', XW, 'A', 900, 100);
    const b = buf('qsample');
    M.text(b.x, 'QRAJT.', XL, QRAJT_Y, { f: 'A', w: 900, s: sQ, wd: 100, color: '#fff' });
    const img = b.x.getImageData(0, 0, W, H).data;
    let n = 0, tries = 0;
    while (n < 420 && tries < 200000) {
      tries++;
      const x = Math.floor(rnd(tries, 11) * W), y = Math.floor(rnd(tries, 12) * H);
      if (img[(y * W + x) * 4 + 3] < 128) continue;
      // target on map
      let tx, ty, k = 0;
      do {
        tx = MX + rnd(n * 97 + k, 13) * MS;
        ty = MY + rnd(n * 89 + k, 14) * MS * 0.87;
        k++;
      } while (!inside(tx, ty) && k < 400);
      parts.push({ x, y, tx, ty, w: WORDS[(n * 11) % WORDS.length], d: rnd(n, 15), s: rndr(n, 16, 12, 22), c: rnd(n, 17) });
      n++;
    }
  });

  addScene({
    name: 'read',
    t0: TL.S.read[0],
    t1: TL.S.read[1],
    draw(ctx, lt, t) {
      ctx.fillStyle = C.ink;
      ctx.fillRect(0, 0, W, H);
      L.bgDots(ctx, t, { alpha: 0.06 });

      // camera: slow push, then the dive into "ħobż"
      const dive = Ease.inExpo(prog(lt, 3.4, 3.96));
      const hx = hobz.x1 + 12, hy = hobz.y - FS * 0.3; // aim at the yellow box's right padding
      const zoom = Math.exp(Math.log(240) * dive);
      const push = 1 + 0.06 * Ease.inOutQuad(prog(lt, 0.8, 3.4));
      const sh = shake(lt, [[0, 1.3]], 22, 7);
      ctx.save();
      ctx.translate(W / 2 + sh.dx, H / 2 + sh.dy);
      ctx.scale(push, push);
      ctx.translate(-W / 2, -H / 2);
      // zoom around the ħobż box (and drift it to screen centre)
      ctx.translate(lerp(hx, W / 2, dive), lerp(hy, H / 2, dive));
      ctx.scale(zoom, zoom);
      ctx.translate(-hx, -hy);

      // map dims under the big stat
      const dim = 1 - 0.62 * Ease.inOutQuad(prog(lt, 1.95, 2.3)) * (1 - prog(lt, 3.3, 3.5));

      // 1) typographic map rows (clipped by the coastline, revealed row by row)
      const rv0 = 0.75;
      ctx.save();
      mapPath(ctx);
      ctx.clip();
      ctx.font = M.fontStr('A', 600, FS, 84);
      ctx.textBaseline = 'alphabetic';
      for (const row of rows) {
        const p = Ease.outCubic(prog(lt, rv0 + row.r * 0.022, rv0 + row.r * 0.022 + 0.55));
        if (p <= 0) continue;
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, row.y - ROW_H, 20 + 1080 * p, ROW_H + 4);
        ctx.clip();
        ctx.fillStyle = rgba(C.paper, (0.55 + 0.25 * rnd(row.r, 3)) * dim);
        ctx.fillText(row.s, 20, row.y);
        ctx.restore();
      }
      // accents
      for (const a of accents) {
        const p = prog(lt, 1.4 + rnd(a.x, 4) * 0.5, 1.6 + rnd(a.x, 4) * 0.5);
        if (p <= 0) continue;
        ctx.fillStyle = rgba(C.ink, 0.9 * p);
        ctx.fillRect(a.x - 2, a.y - FS * 0.82, a.ww + 4, FS * 1.05);
        ctx.fillStyle = rgba(a.col, p * dim);
        ctx.fillText(a.w, a.x, a.y);
      }
      ctx.restore();
      // highlighted ħobż
      {
        const p = Ease.snap(prog(lt, 1.7, 2.0));
        if (p > 0) {
          const pad = 5;
          ctx.fillStyle = C.yellow;
          ctx.fillRect(hobz.x0 - pad, hobz.y - FS * 0.9, (hobz.x1 - hobz.x0 + pad * 2) * p + 14 * p, FS * 1.2);
          ctx.fillStyle = C.ink;
          ctx.font = M.fontStr('A', 800, FS, 84);
          if (p > 0.6) ctx.fillText('ħobż', hobz.x0, hobz.y);
        }
      }
      // coastline draw-on
      {
        const p = prog(lt, 0.6, 1.8);
        if (p > 0) {
          ctx.save();
          ctx.lineWidth = 3.2 / Math.max(1, zoom * 0.5);
          ctx.strokeStyle = rgba(C.yellow, 0.95 * dim + 0.05);
          ctx.setLineDash([3200 * Ease.inOutCubic(p), 99999]);
          mapPath(ctx);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.restore();
        }
      }
      // island labels
      const lp = Ease.snap(prog(lt, 1.5, 1.9));
      if (lp > 0) {
        const lab = (s, x, y) => text(ctx, s, x, y - (1 - lp) * 20, { f: 'JB', w: 700, s: 22, color: C.yellow, alpha: lp * dim, track: 4 });
        lab('GĦAWDEX', MX + 0.08 * MS, MY - 16);
        lab('KEMMUNA', MX + 0.37 * MS, MY + 0.2 * MS);
        lab('MALTA', MX + 0.78 * MS, MY + 0.3 * MS);
        lab('35.9°N  14.4°E', MX + 0.55 * MS, MY + 0.93 * MS);
      }

      // 2) particles: title letters → words flying onto the map
      for (let i = 0; i < parts.length; i++) {
        const q = parts[i];
        const st = 0.42 + q.d * 0.35;
        const p = prog(lt, st, st + 0.55 + q.c * 0.3);
        if (p <= 0 || p >= 1) continue;
        const e = Ease.inOutCubic(p);
        const cx = lerp(q.x, q.tx, e) + Math.sin(p * Math.PI) * (q.c - 0.5) * 380;
        const cy = lerp(q.y, q.ty, e) - Math.sin(p * Math.PI) * 180 * q.d;
        const s = lerp(q.s * 1.6, FS * 0.9, e);
        ctx.font = M.fontStr('A', 700, s, 84);
        ctx.fillStyle = q.c > 0.86 ? rgba(C.yellow, 1 - p * 0.6) : rgba(C.paper, 1 - p * 0.7);
        ctx.fillText(q.w, cx, cy);
      }
      ctx.restore();

      // 3) title (slams on the drop, then shatters)
      {
        const out = prog(lt, 0.42, 0.8);
        if (out < 1) {
          const slam = Ease.outExpo(prog(lt, 0, 0.25));
          const sc = lerp(1.25, 1, slam);
          ctx.save();
          ctx.translate(W / 2, QRAJT_Y - sQ * 0.36);
          ctx.scale(sc, sc);
          ctx.translate(-W / 2, -(QRAJT_Y - sQ * 0.36));
          ctx.globalAlpha = 1 - out;
          text(ctx, 'L-EWWEL:', XL, QRAJT_Y - sQ * 0.72 - 50, { f: 'A', w: 900, s: 96, wd: 100, color: C.yellow });
          drawGlyphs(ctx, 'QRAJT.', XL, QRAJT_Y, { f: 'A', w: 900, s: sQ, wd: 100, color: C.paper }, (i, g, n) => ({
            dy: -Ease.inCubic(clamp((lt - 0.42 - i * 0.04) / 0.4)) * 120,
            alpha: 1 - clamp((lt - 0.42 - i * 0.04) / 0.3),
            color: i === n - 1 ? C.red : undefined,
          }));
          ctx.restore();
        }
      }

      // 4) the stat
      const s1 = lt - 2.0;
      const leave = Ease.inQuart(prog(lt, 3.3, 3.5));
      if (s1 > 0 && leave < 1) {
        ctx.save();
        ctx.globalAlpha = 1 - leave;
        const sT = fitSize(ctx, 'TRILJUNI', XW, 'A', 900, 70);
        const y1 = 900;
        drawGlyphs(ctx, 'TRILJUNI', XL, y1, { f: 'A', w: 900, s: sT, wd: 70, color: C.paper }, (i) => {
          const p = Ease.snap(clamp((s1 - i * 0.025) / 0.35));
          return { dy: (1 - p) * 90, alpha: p, sy: lerp(1.6, 1, p) };
        });
        const s2 = fitSize(ctx, "TA' KLIEM.", XW, 'A', 900, 125);
        drawGlyphs(ctx, "TA' KLIEM.", XL, y1 + s2 * 0.9, { f: 'A', w: 900, s: s2, wd: 125, color: C.yellow }, (i, g, n) => {
          const p = Ease.snap(clamp((s1 - 0.12 - i * 0.02) / 0.35));
          return { dy: (1 - p) * 90, alpha: p, color: i === n - 1 ? C.red : undefined };
        });
        // odometer strip
        const op = prog(lt, 2.05, 2.3);
        if (op > 0) {
          const digits = 15;
          ctx.font = M.fontStr('JB', 700, 44);
          for (let d = 0; d < digits; d++) {
            const speed = 6 + (digits - d) * 3.2;
            const v = (s1 * speed + d * 0.37) % 10;
            const x = XL + d * 38 + Math.floor(d / 3) * 14;
            const yb = y1 - sT * 0.8 - 30;
            ctx.save();
            ctx.beginPath();
            ctx.rect(x - 4, yb - 44, 36, 56);
            ctx.clip();
            for (let k = -1; k <= 1; k++) {
              const dig = (Math.floor(v) + k + 10) % 10;
              ctx.fillStyle = rgba(C.paper, 0.75 * op);
              ctx.fillText(String(dig), x, yb + (k - (v % 1)) * 50 * -1);
            }
            ctx.restore();
          }
          text(ctx, 'tokens+', XL + digits * 38 + 4 * 14 + 8, y1 - sT * 0.8 - 30, { f: 'JB', w: 500, s: 28, color: C.yellow, alpha: op });
        }
        // serif line
        const s3 = lt - 3.0;
        if (s3 > 0) {
          const p = Ease.snap(clamp(s3 / 0.4));
          const y3 = y1 + s2 * 0.9 + 140;
          text(ctx, "aktar milli taqra", XL + 4, y3 + (1 - p) * 40, { f: 'IS', s: 92, color: C.paper, alpha: p });
          text(ctx, "f'elf ħajja.", XL + 4, y3 + 100 + (1 - p) * 60, { f: 'IS', s: 92, color: C.paper, alpha: clamp((s3 - 0.08) / 0.3) });
        }
        ctx.restore();
      }
      // at the very end the screen is pure yellow (inside the ħobż box)
      if (dive > 0.75) {
        ctx.fillStyle = rgba(C.yellow, prog(dive, 0.75, 0.95));
        ctx.fillRect(0, 0, W, H);
      }
    },
    fx(fx, lt) {
      fx.flash = Math.max(fx.flash, 0.55 * Math.exp(-lt * 14));
      const dive = prog(lt, 3.4, 3.96);
      fx.warp = dive * 0.35;
      fx.ca += dive * 1.4;
    },
    mb(lt) {
      if (lt < 0.3) return 6;
      if (lt > 3.4) return 8;
      if (lt > 0.4 && lt < 1.4) return 4;
      return 3;
    },
  });
})(window);

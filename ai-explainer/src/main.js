/* Timeline runner: composites scenes, HUD and post FX; drives preview + offline render. */
(function () {
  'use strict';
  const { W, H, C, Ease, clamp, lerp, inv, alpha, rr, setFont, STY, grain, paper, vignette } = M;
  const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d', { alpha: false });
  const FPS = 60;
  const SCENES = window.SCENES, CHAPTERS = window.CHAPTERS, DURATION = window.DURATION;

  /* ---------- HUD: story-style progress + chapter label ---------- */
  function hud(ctx, T) {
    const first = CHAPTERS[0], last = CHAPTERS[CHAPTERS.length - 1];
    const a = clamp((T - first.start) / 0.4) * (1 - clamp((T - (last.end - 0.35)) / 0.35));
    if (a <= 0) return;
    const bg = window.bgAt ? window.bgAt(T) : C.cream;
    const dark = [C.ink, C.night, C.tomato, C.cobalt].includes(bg);
    const fg = dark ? C.cream : C.ink;
    const n = CHAPTERS.length, segW = 100, gap = 12, total = n * segW + (n - 1) * gap, x0 = (W - total) / 2, y = 226;
    ctx.save();
    ctx.globalAlpha = a;
    const drop = (1 - Ease.outCubic(clamp((T - first.start) / 0.5))) * -40;
    ctx.translate(0, drop);
    for (let i = 0; i < n; i++) {
      const ch = CHAPTERS[i];
      const p = clamp((T - ch.start) / (ch.end - ch.start));
      const x = x0 + i * (segW + gap);
      ctx.fillStyle = alpha(dark ? C.cream : C.ink, 0.18);
      rr(ctx, x, y, segW, 8, 4); ctx.fill();
      if (p > 0) { ctx.fillStyle = fg; rr(ctx, x, y, Math.max(8, segW * p), 8, 4); ctx.fill(); }
    }
    // chapter label with a masked roll between chapters
    let idx = CHAPTERS.findIndex((c) => T >= c.start && T < c.end);
    if (idx < 0) idx = T < first.start ? 0 : n - 1;
    const ch = CHAPTERS[idx];
    const k = Ease.snap(clamp((T - ch.start) / 0.55));
    ctx.save();
    ctx.beginPath(); ctx.rect(0, y + 22, W, 46); ctx.clip();
    const label = (c, i, dy, al) => {
      setFont(ctx, STY.mo, 33); ctx.letterSpacing = '5px';
      ctx.fillStyle = fg; ctx.globalAlpha = a * al; ctx.textAlign = 'center';
      ctx.fillText(`${String(i + 1).padStart(2, '0')}  ·  ${c.name}`, W / 2, y + 56 + dy);
    };
    if (idx > 0 && k < 1) label(CHAPTERS[idx - 1], idx - 1, -46 * k, 1 - k);
    label(ch, idx, 46 * (1 - k), idx === 0 ? 1 : k);
    ctx.restore();
    ctx.restore();
  }

  function renderFrame(T, frame) {
    if (frame == null) frame = Math.round(T * FPS);
    const RS = window.RENDER_SCALE || 1;
    ctx.setTransform(RS, 0, 0, RS, 0, 0);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
    ctx.fillStyle = C.cream; ctx.fillRect(0, 0, W, H);
    for (const s of SCENES) {
      if (T >= s.start - (s.pre || 0) && T < s.end + (s.post || 0)) {
        ctx.save();
        if (s.clip) {
          const ok = s.clip(ctx, T);
          if (ok === false) { ctx.restore(); continue; }
        }
        s.draw(ctx, T, T - s.start);
        ctx.restore();
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none'; ctx.shadowBlur = 0; ctx.setLineDash([]);
      }
    }
    if (window.overlays) for (const o of window.overlays) { ctx.save(); o(ctx, T); ctx.restore(); }
    hud(ctx, T);
    // post
    const pf = window.postAt ? window.postAt(T) : { paper: 0.5, grain: 0.05, vig: 0.2 };
    if (pf.paper) paper(ctx, pf.paper);
    if (pf.vig) vignette(ctx, pf.vig);
    if (pf.grain) grain(ctx, frame, pf.grain);
  }

  window.renderFrame = renderFrame;
  window.FPS = FPS;

  /* ---------- ready promise: fonts loaded ---------- */
  const fontList = [
    '900 100px "Inter Tight"', '800 100px "Inter Tight"', '700 100px "Inter Tight"', '600 100px "Inter Tight"', '500 100px "Inter Tight"',
    'italic 900 100px "Inter Tight"', 'italic 400 100px "Instrument Serif"', '400 100px "Instrument Serif"',
    '700 100px "JetBrains Mono"', '800 100px "JetBrains Mono"', '500 100px "JetBrains Mono"', '700 100px Caveat',
  ];
  window.ready = Promise.all(fontList.map((f) => document.fonts.load(f, 'AaBb09'))).then(() => document.fonts.ready).then(() => {
    if (window.onReady) window.onReady();
    return true;
  });

  /* ---------- modes ---------- */
  const params = new URLSearchParams(location.search);
  if (params.has('render')) {
    document.body.className = 'render';
    return;
  }
  if (window.NO_PREVIEW_UI) return;
  document.body.className = 'preview';
  const play = document.getElementById('play'), scrub = document.getElementById('scrub'), time = document.getElementById('time');
  const music = document.getElementById('music');
  music.src = window.AUDIO_SRC || params.get('audio') || 'out/soundtrack.m4a';
  let playing = false, t0 = 0, startWall = 0, cur = parseFloat(params.get('t') || '0');
  const now = () => (playing ? (music.readyState >= 2 && !music.paused ? music.currentTime : cur + (performance.now() - startWall) / 1000) : cur);
  function tick() {
    let T = now();
    if (T >= DURATION) { // seamless loop
      T = T % DURATION; cur = T; startWall = performance.now();
      if (music.readyState >= 2) { music.currentTime = T; }
    }
    renderFrame(T);
    scrub.value = T / DURATION; time.textContent = T.toFixed(2);
    requestAnimationFrame(tick);
  }
  play.onclick = () => {
    if (playing) { cur = now(); playing = false; music.pause(); play.textContent = 'Play'; return; }
    playing = true; startWall = performance.now(); play.textContent = 'Pause';
    try { music.currentTime = cur; music.play().catch(() => {}); } catch (e) {}
  };
  scrub.oninput = () => { cur = parseFloat(scrub.value) * DURATION; startWall = performance.now(); try { music.currentTime = cur; } catch (e) {} };
  window.ready.then(() => requestAnimationFrame(tick));
  void t0; void lerp; void inv;
})();

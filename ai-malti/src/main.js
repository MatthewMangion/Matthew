// main.js — scene registry, sub-frame motion blur, FX timeline, HUD, preview + render entry points
(function (G) {
  const { W, H, FPS, C, clamp, prog, Ease, rgba, text, lerp } = M;
  const SCN = [];
  G.addScene = (s) => SCN.push(s);
  G.DURATION = 64;

  let post, sc, sx;
  const state = { debug: false };

  async function init(opts = {}) {
    state.debug = !!opts.debug;
    await loadFonts();
    const out = document.getElementById('out');
    post = new Post(out);
    G.POSTREF = post;
    sc = document.createElement('canvas');
    sc.width = W;
    sc.height = H;
    sx = sc.getContext('2d', { alpha: false, willReadFrequently: true });
    SCN.sort((a, b) => (a.z || 0) - (b.z || 0));
    if (G.prepare) for (const f of G.prepare) await f();
    return { floatOK: post.floatOK, scenes: SCN.map((s) => s.name) };
  }

  // Paint one scene at an explicit local time (used by drawScene and by transitions that composite scenes)
  function paintSceneAt(ctx, s, lt) {
    ctx.save();
    if (s.push !== false) {
      const k = 1 + (s.push || 0.03) * (lt / (s.t1 - s.t0));
      ctx.translate(W / 2, H / 2);
      ctx.scale(k, k);
      ctx.translate(-W / 2, -H / 2);
    }
    s.draw(ctx, lt, s.t0 + lt);
    ctx.restore();
  }
  const sceneByName = (n) => SCN.find((s) => s.name === n);

  function drawScene(t) {
    sx.setTransform(1, 0, 0, 1, 0, 0);
    sx.globalAlpha = 1;
    sx.globalCompositeOperation = 'source-over';
    sx.filter = 'none';
    sx.fillStyle = C.ink;
    sx.fillRect(0, 0, W, H);
    // an active scene flagged `exclusive` (e.g. a transition that paints other scenes itself) hides the rest
    const active = SCN.filter((s) => t >= s.t0 && t < s.t1);
    const ex = active.filter((s) => s.exclusive);
    for (const s of ex.length ? ex : active) paintSceneAt(sx, s, t - s.t0);
    if (G.drawHUD) {
      sx.save();
      G.drawHUD(sx, t);
      sx.restore();
    }
  }

  function fxAt(t) {
    const fx = { ca: 0.14, glitch: 0, bloom: 0.2, bloomThr: 0.78, vig: 0.38, grain: 0.012, flash: 0, flashCol: [1, 1, 1], invert: 0, expo: 1, sat: 1.04, warp: 0 };
    for (const s of SCN) if (s.fx && t >= s.t0 && t < s.t1) s.fx(fx, t - s.t0, t);
    if (G.globalFx) G.globalFx(fx, t);
    return fx;
  }

  function samplesAt(t) {
    let n = 3;
    for (const s of SCN) if (s.mb && t >= s.t0 && t < s.t1) n = Math.max(n, s.mb(t - s.t0, t));
    return n;
  }

  // Render one output frame. Sub-frames sample the forward shutter window [t, t + 180°] and are averaged
  // on the CPU in (gamma-2) linear light with float precision, then uploaded once.
  let acc = null, lin = null, outU8 = null;
  function renderFrame(frame, forceSamples) {
    const t = frame / FPS;
    const n = forceSamples || samplesAt(t);
    const shutter = 0.5 / FPS;
    if (n <= 1) {
      drawScene(t);
      post.upload(sc);
    } else {
      if (!acc) {
        acc = new Float32Array(W * H * 3);
        outU8 = new Uint8ClampedArray(W * H * 4);
        lin = new Float32Array(256);
        for (let i = 0; i < 256; i++) lin[i] = (i / 255) * (i / 255);
      }
      acc.fill(0);
      for (let i = 0; i < n; i++) {
        drawScene(t + (i / n) * shutter);
        const d = sx.getImageData(0, 0, W, H).data;
        for (let p = 0, q = 0; p < d.length; p += 4, q += 3) {
          acc[q] += lin[d[p]];
          acc[q + 1] += lin[d[p + 1]];
          acc[q + 2] += lin[d[p + 2]];
        }
      }
      const k = 1 / n;
      for (let p = 0, q = 0; q < acc.length; p += 4, q += 3) {
        outU8[p] = Math.sqrt(acc[q] * k) * 255;
        outU8[p + 1] = Math.sqrt(acc[q + 1] * k) * 255;
        outU8[p + 2] = Math.sqrt(acc[q + 2] * k) * 255;
        outU8[p + 3] = 255;
      }
      post.upload(outU8);
    }
    const fx = fxAt(t);
    post.finish(fx, frame);
    if (state.debug) {
      const d = document.getElementById('dbg');
      if (d) d.textContent = `f${frame}  t=${t.toFixed(2)}s  n=${n}`;
    }
    return n;
  }

  let pxBuf = null;
  function readPixels() {
    const gl = post.gl;
    if (!pxBuf) pxBuf = new Uint8Array(W * H * 4);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, pxBuf);
    return pxBuf;
  }

  // Draw the raw scene (no post) into the output canvas — used for quick thumbnails
  function sceneCanvas() {
    return sc;
  }

  // Real-time preview (for the web player)
  function play(audio, samples = 1) {
    let raf;
    const loop = () => {
      const t = audio ? audio.currentTime : (performance.now() / 1000) % G.DURATION;
      renderFrame(Math.floor(t * FPS), samples);
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(raf);
  }

  function readYUV() {
    return post.readYUV();
  }
  function setPresent(v) {
    post.present = v;
  }

  G.ENGINE = { init, renderFrame, drawScene, paintSceneAt, sceneByName, fxAt, samplesAt, play, sceneCanvas, readPixels, readYUV, setPresent, SCN };
})(window);

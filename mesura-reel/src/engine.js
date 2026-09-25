/* Mesura reel engine · engine.js
   Reel registry, frame renderer with temporal super-sampling (true motion blur),
   and helpers shared by the studio preview and the offline renderer. */
(function (G) {
  'use strict';
  const M = G.M;
  const R = (G.R = { reels: {}, order: [] });

  // spec: { title, duration, beats, draw(ctx, t), blur(t) → samples, cues, post(ctx, t, frame), cover }
  R.define = (id, spec) => {
    spec.id = id;
    spec.beat = spec.duration / spec.beats;
    spec.bpm = 60 / spec.beat;
    R.reels[id] = spec;
    if (!R.order.includes(id)) R.order.push(id);
    return spec;
  };

  let vis, vctx, sc, sctx;
  R.attach = (canvas) => {
    vis = canvas;
    vis.width = M.W;
    vis.height = M.H;
    vctx = vis.getContext('2d');
    sc = document.createElement('canvas');
    sc.width = M.W;
    sc.height = M.H;
    sctx = sc.getContext('2d');
  };

  const reset = (ctx) => {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.filter = 'none';
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'miter';
    ctx.setLineDash([]);
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
    ctx.letterSpacing = '0px';
    ctx.textRendering = 'geometricPrecision';
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
  };

  R.drawAt = (reel, ctx, t) => {
    reset(ctx);
    reel.draw(ctx, M.mod(t, reel.duration));
  };

  // Render frame f of a reel into the visible canvas.
  // Motion blur: n samples spread over the shutter interval (fraction of a frame, 0.5 = 180°),
  // blended with a running mean so no float buffers or read-backs are needed.
  R.frame = (id, f, o = {}) => {
    const reel = R.reels[id];
    const fps = o.fps || 60;
    const t = f / fps;
    const n = Math.max(1, Math.round(o.samples ?? (reel.blur ? reel.blur(M.mod(t, reel.duration)) : 1)));
    const shutter = o.shutter ?? 0.5;
    if (n === 1) {
      R.drawAt(reel, vctx, t);
    } else {
      for (let i = 0; i < n; i++) {
        const ts = t + ((i + 0.5) / n - 0.5) * (shutter / fps);
        R.drawAt(reel, sctx, ts);
        vctx.setTransform(1, 0, 0, 1, 0, 0);
        vctx.globalCompositeOperation = 'source-over';
        vctx.filter = 'none';
        vctx.globalAlpha = 1 / (i + 1);
        vctx.drawImage(sc, 0, 0);
      }
      vctx.globalAlpha = 1;
    }
    if (o.post !== false && reel.post) {
      reset(vctx);
      reel.post(vctx, M.mod(t, reel.duration), f);
    }
    return n;
  };

  // Cue sheet in seconds (for the audio composer)
  R.cues = (id) => {
    const reel = R.reels[id];
    return {
      id,
      title: reel.title,
      duration: reel.duration,
      beats: reel.beats,
      bpm: reel.bpm,
      beat: reel.beat,
      music: reel.music || null,
      cues: (reel.cues || []).map((c) => Object.assign({}, c, { t: c.b * reel.beat })).sort((a, b) => a.t - b.t),
    };
  };
})(typeof window !== 'undefined' ? window : globalThis);

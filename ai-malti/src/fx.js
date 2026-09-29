// fx.js — global finishing accents driven by the audio cue list (so picture and sound hit together)
(function (G) {
  const { clamp, pulse } = M;
  const hits = TL.CUES.filter((c) => ['impact', 'hit', 'stab', 'drop'].includes(c[1]));
  const glitches = TL.CUES.filter((c) => c[1] === 'glitch');

  G.globalFx = function (fx, t) {
    let ca = 0, bl = 0;
    for (const [ct, type, p] of hits) {
      const dt = t - ct;
      if (dt < -0.05 || dt > 1.2) continue;
      const k = type === 'impact' ? (p.size || 1) : type === 'drop' ? 0.6 : 0.45;
      ca += pulse(t, ct, 0.02, 0.16) * 0.9 * k;
      bl += pulse(t, ct, 0.02, 0.3) * 0.22 * k;
    }
    for (const [ct, , p] of glitches) {
      if (t >= ct && t < ct + (p.dur || 0.2)) fx.glitch = Math.max(fx.glitch, 0.85);
    }
    fx.ca += ca;
    fx.bloom += bl;
  };
})(window);

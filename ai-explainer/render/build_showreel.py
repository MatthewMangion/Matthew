#!/usr/bin/env python3
"""Build the live showreel page: the same engine + scenes, inlined, playing in real time with the soundtrack.

Writes showreel/index.html (+ showreel/soundtrack.m4a). The page is published as a private Artifact.
"""
import json, os, subprocess
import imageio_ffmpeg

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DST = os.path.join(ROOT, 'showreel')
os.makedirs(DST, exist_ok=True)
read = lambda p: open(os.path.join(ROOT, p), encoding='utf-8').read()
cues = json.load(open(os.path.join(ROOT, 'out', 'cues.json')))

subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(), '-hide_banner', '-loglevel', 'error', '-y', '-i', os.path.join(ROOT, 'out', 'soundtrack_raw.wav'),
                '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', os.path.join(DST, 'soundtrack.m4a')], check=True)

CHAPTERS = [
    (0, 'Hook', 'Go brush your ▮', 'Kinetic slam, confetti burst, dot-zoom match cut'),
    (7, '01 · Predict', 'It guesses the next word', 'Live probability bars, word-by-word chain'),
    (15, '02 · Read', 'It read. A lot.', 'Spiral vortex of 150 pages, rolling odometer'),
    (25, '03 · Practice', 'Guess, check, tweak', 'Stamp FX, powers-of-ten zoom into the character'),
    (33, '04 · Meaning', 'A map of meaning', '3D word constellations, orbit camera, warp jump'),
    (39, '05 · Attention', 'Pay attention', 'Attention arcs resolve “it” and “she”'),
    (47, 'Layers', 'The T in ChatGPT', 'Isometric Transformer stack, layer counter'),
    (51, '06 · Manners', 'A sticker chart for robots', 'Thumbs rain, 20 rhythmic star pops'),
    (59, '07 · Think', 'Think before you talk', 'Handwritten scratchpad in a thought bubble'),
    (65, 'But…', 'Confidently wrong', 'Glitch cut, RGB split, sunglasses'),
    (73, 'Outro', 'Is it magic? Nope.', 'Recap equation, family of five, seamless loop'),
]
def fmt(t): return f'{int(t // 60)}:{int(t % 60):02d}'
chapters_html = '\n'.join(
    f'''      <li><button class="chap" type="button" data-t="{t}" id="chap-{i}">
        <span class="ts">{fmt(t)}</span>
        <span class="ct"><span class="cn">{name}</span> <span class="cl">{line}</span><span class="cx">{tech}</span></span>
      </button></li>''' for i, (t, name, line, tech) in enumerate(CHAPTERS))
marks_html = ''.join(f'<i style="left:{t / cues["duration"] * 100:.3f}%"></i>' for t, *_ in CHAPTERS[1:])

PAGE = r'''<title>Raising an AI</title>
<meta name="description" content="A live, code-rendered motion graphics explainer: how ChatGPT-style AI works, for parents.">
<style>
__FONTS__
  :root {
    --ground: #2E4BFF; --deep: #1D34C9; --ink: #15120F; --cream: #F4EDE1; --soft: rgba(244, 237, 225, .74);
    --faint: rgba(244, 237, 225, .18); --sun: #FFC53D; --tomato: #FF4D2E;
    --display: 'Inter Tight', 'Helvetica Neue', Arial, sans-serif; --serif: 'Instrument Serif', Georgia, serif;
    --mono: 'JetBrains Mono', ui-monospace, Menlo, monospace;
    color-scheme: dark;
  }
  * { box-sizing: border-box; }
  body { background: var(--ground); color: var(--cream); font: 400 17px/1.55 var(--display); margin: 0; }
  .wrap { max-width: 1180px; margin: 0 auto; padding-inline: clamp(16px, 4vw, 48px); padding-block: clamp(20px, 4vw, 56px) 72px;
          display: grid; grid-template-columns: minmax(260px, 400px) minmax(0, 1fr); gap: clamp(28px, 5vw, 80px); }
  @media (max-width: 860px) { .wrap { grid-template-columns: minmax(0, 1fr); } .stage { position: static !important; max-width: 420px; width: 100%; justify-self: center; } }
  .stage { position: sticky; top: calc(env(safe-area-inset-top, 0px) + 24px); align-self: start; display: grid; gap: 14px; }
  .phone { position: relative; border-radius: 36px; background: var(--ink); padding: 9px; box-shadow: 0 2px 0 rgba(255,255,255,.08) inset, 0 40px 80px -20px rgba(6, 10, 70, .6); }
  canvas { display: block; width: 100%; height: auto; aspect-ratio: 9 / 16; border-radius: 28px; background: var(--cream); }
  .big-play { position: absolute; inset: 9px; border: 0; border-radius: 28px; background: transparent; cursor: pointer; display: grid; place-items: end center; padding-bottom: 7%; }
  .big-play span { display: inline-flex; align-items: center; gap: 10px; background: var(--tomato); color: var(--cream); font: 800 17px/1 var(--display); letter-spacing: .01em;
                   padding: 16px 22px 16px 18px; border-radius: 999px; box-shadow: 0 10px 24px rgba(21,18,15,.35); transition: transform .15s ease; }
  .big-play:hover span, .big-play:focus-visible span { transform: scale(1.05); }
  .big-play:focus-visible { outline: 3px solid var(--sun); outline-offset: 3px; }
  .controls { display: grid; grid-template-columns: auto minmax(0, 1fr) auto auto; align-items: center; gap: 12px; }
  .btn { width: 44px; height: 44px; border-radius: 50%; border: 0; background: var(--cream); color: var(--ink); display: grid; place-items: center; cursor: pointer; }
  .btn.ghost { background: transparent; color: var(--cream); border: 2px solid var(--faint); }
  .btn:focus-visible, .chap:focus-visible, input[type=range]:focus-visible { outline: 3px solid var(--sun); outline-offset: 2px; }
  .track { position: relative; }
  .track input { width: 100%; accent-color: var(--sun); margin: 0; }
  .marks { position: absolute; inset: auto 0 -10px 0; height: 6px; pointer-events: none; }
  .marks i { position: absolute; width: 2px; height: 6px; background: var(--faint); transform: translateX(-1px); }
  .time { font: 500 13px/1 var(--mono); font-variant-numeric: tabular-nums; color: var(--soft); min-width: 7.5ch; text-align: right; }
  .hint { font: 500 12px/1.4 var(--mono); color: var(--soft); letter-spacing: .04em; margin: 0; text-align: center; }

  .copy { display: grid; gap: 40px; align-content: start; min-width: 0; }
  .eyebrow { font: 700 12px/1 var(--mono); letter-spacing: .16em; text-transform: uppercase; color: var(--sun); margin: 0 0 18px; }
  h1 { font: 900 clamp(52px, 8.4vw, 112px)/.9 var(--display); letter-spacing: -.045em; margin: 0; text-wrap: balance; }
  h1 em { font: italic 400 1.08em/.9 var(--serif); letter-spacing: -.01em; color: var(--sun); }
  .lede { font: italic 400 clamp(24px, 2.6vw, 32px)/1.2 var(--serif); margin: 18px 0 0; max-width: 30ch; }
  .body { color: var(--soft); max-width: 60ch; margin: 16px 0 0; }
  h2 { font: 700 12px/1 var(--mono); letter-spacing: .16em; text-transform: uppercase; color: var(--soft); margin: 0 0 14px; }
  ol.chapters { list-style: none; margin: 0; padding: 0; border-top: 1px solid var(--faint); }
  .chap { width: 100%; display: grid; grid-template-columns: 5.2ch minmax(0, 1fr); gap: 14px; align-items: baseline; text-align: left; background: none; border: 0;
          border-bottom: 1px solid var(--faint); color: var(--cream); padding: 13px 4px; cursor: pointer; font: inherit; }
  .chap:hover { background: rgba(244,237,225,.06); }
  .chap .ts { font: 500 13px/1.4 var(--mono); font-variant-numeric: tabular-nums; color: var(--soft); }
  .chap .cn { font: 800 17px/1.3 var(--display); letter-spacing: -.01em; }
  .chap .cl { font: italic 400 19px/1.3 var(--serif); color: var(--soft); }
  .chap .cx { display: block; font: 500 13px/1.45 var(--display); color: var(--soft); margin-top: 3px; }
  .chap.on { background: rgba(21,18,15,.18); }
  .chap.on .ts, .chap.on .cn { color: var(--sun); }
  dl.specs { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 18px 24px; margin: 0; }
  dl.specs div { border-top: 2px solid var(--cream); padding-top: 10px; }
  dt { font: 700 11px/1 var(--mono); letter-spacing: .14em; text-transform: uppercase; color: var(--soft); }
  dd { margin: 8px 0 0; font: 800 20px/1.2 var(--display); letter-spacing: -.01em; font-variant-numeric: tabular-nums; }
  dd small { display: block; font: 500 13px/1.4 var(--display); color: var(--soft); letter-spacing: 0; margin-top: 3px; }
  ul.why { margin: 0; padding: 0; list-style: none; display: grid; gap: 12px; }
  ul.why li { display: grid; grid-template-columns: 26px minmax(0, 1fr); gap: 10px; color: var(--soft); }
  ul.why li b { color: var(--cream); font-weight: 800; }
  ul.why li::before { content: ''; width: 12px; height: 12px; margin-top: 7px; border-radius: 50%; background: var(--sun); }
  .note { font: 400 21px/1.35 'Caveat', cursive; color: var(--sun); transform: rotate(-2deg); margin: 0; }
  footer { grid-column: 1 / -1; border-top: 1px solid var(--faint); padding-top: 18px; font: 500 12px/1.6 var(--mono); color: var(--soft); letter-spacing: .03em; }
  @media (prefers-reduced-motion: reduce) { .big-play span { transition: none; } }
</style>

<div class="wrap">
  <section class="stage" aria-label="Video player">
    <div class="phone">
      <canvas id="c" width="720" height="1280" role="img" aria-label="Raising an AI: an 81-second animated explainer about how ChatGPT-style AI works, for parents. Chapters are listed alongside."></canvas>
      <button class="big-play" id="bigplay" type="button" aria-label="Play with sound"><span><svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M4 2.5v13l11-6.5z" fill="currentColor"/></svg>Play with sound</span></button>
    </div>
    <div class="controls">
      <button class="btn" id="play" type="button" aria-label="Play"><svg id="ico" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 2v12l10-6z" fill="currentColor"/></svg></button>
      <div class="track"><input id="scrub" type="range" min="0" max="__DUR__" step="0.01" value="0" aria-label="Seek"><div class="marks" aria-hidden="true">__MARKS__</div></div>
      <span class="time" id="time">0:00</span>
      <button class="btn ghost" id="mute" type="button" aria-label="Mute" aria-pressed="false"><svg id="snd" width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M2 6.5h3l4-3.5v12l-4-3.5H2z" fill="currentColor"/><path id="wave" d="M12 5.5c1.3 1 1.3 6 0 7M14.2 3.5c2.4 2 2.4 9 0 11" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg></button>
    </div>
    <p class="hint">Rendered live in your browser · Space to play</p>
  </section>

  <main class="copy">
    <header>
      <p class="eyebrow">Motion design · vertical explainer · 1:21</p>
      <h1>Raising <em>an</em> AI</h1>
      <p class="lede">How ChatGPT-style AI works, explained for busy parents.</p>
      <p class="body">Every frame is drawn in code by a small canvas motion engine, and the version on this page plays live from that same code. The music and all __CUES__ sound effects are original, synthesized from scratch and locked to the animation's cue sheet. The story is one idea: raising an AI is weirdly like raising a kid.</p>
    </header>

    <section aria-labelledby="h-ch">
      <h2 id="h-ch">Chapters</h2>
      <ol class="chapters">
__CHAPTERS__
      </ol>
    </section>

    <section aria-labelledby="h-sp">
      <h2 id="h-sp">Spec</h2>
      <dl class="specs">
        <div><dt>Format</dt><dd>1080 × 1920<small>9:16 at 60 fps, loops seamlessly</small></dd></div>
        <div><dt>Frames</dt><dd>4,860<small>deterministic, frame-accurate render</small></dd></div>
        <div><dt>Sound</dt><dd>__CUES__ cues<small>120 BPM score in D major, −13 LUFS</small></dd></div>
        <div><dt>Type</dt><dd>4 families<small>Inter Tight, Instrument Serif, JetBrains Mono, Caveat</small></dd></div>
      </dl>
    </section>

    <section aria-labelledby="h-why">
      <h2 id="h-why">Built to be shared</h2>
      <ul class="why">
        <li><span><b>Fill-in-the-blank hook.</b> “Go brush your ▮” gets the viewer answering before the video does.</span></li>
        <li><span><b>Seven numbered steps</b> with a story-style progress bar, so viewers know how much is left.</span></li>
        <li><span><b>Works on mute.</b> The type carries the whole script, and critical text stays clear of the app buttons.</span></li>
        <li><span><b>A parenting joke in every chapter</b>, from “tantrum ≈ meltdown” to “a sticker chart. For robots.”</span></li>
        <li><span><b>A share prompt aimed at a person</b>, and an ending that loops straight back into the hook.</span></li>
      </ul>
    </section>
    <p class="note">3 kids × 2 cookies = 6… wait, the dog ate one.</p>
  </main>

  <footer>Canvas 2D motion engine · headless Chromium frame render · numpy/scipy synthesis · H.264 master for TikTok, Reels and Shorts</footer>
</div>

<script>window.RENDER_SCALE = 720 / 1080; window.NO_PREVIEW_UI = true;</script>
<script>
__ENGINE__
</script>
<script>
__SCENES__
</script>
<script>
__MAIN__
</script>
<script>
__COVER__
</script>
<script>
(function () {
  'use strict';
  const D = window.DURATION;
  const $ = (id) => document.getElementById(id);
  const scrub = $('scrub'), time = $('time'), big = $('bigplay'), play = $('play'), ico = $('ico'), mute = $('mute'), wave = $('wave');
  const chaps = [...document.querySelectorAll('.chap')];
  const audio = new Audio(); audio.preload = 'auto';
  let audioOk = false;
  fetch('soundtrack.m4a').then((r) => (r.ok ? r.blob() : Promise.reject())).then((b) => { audio.src = URL.createObjectURL(b); audioOk = true; }).catch(() => {});
  let playing = false, started = false, cur = 0, wall = 0, dirty = true;
  const fmt = (t) => Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0');
  const now = () => {
    if (!playing) return cur;
    if (audioOk && !audio.paused && audio.readyState >= 2) return audio.currentTime;
    return cur + (performance.now() - wall) / 1000;
  };
  function setIcon() {
    ico.innerHTML = playing ? '<path d="M3.5 2h3.2v12H3.5zM9.3 2h3.2v12H9.3z" fill="currentColor"/>' : '<path d="M3.5 2v12l10-6z" fill="currentColor"/>';
    play.setAttribute('aria-label', playing ? 'Pause' : 'Play');
  }
  function start() {
    started = true; big.hidden = true; playing = true; wall = performance.now();
    if (audioOk) { try { audio.currentTime = cur; } catch (e) {} audio.play().catch(() => {}); }
    setIcon();
  }
  function pause() { cur = now(); playing = false; audio.pause(); setIcon(); }
  function seek(t) {
    cur = Math.max(0, Math.min(D - 0.001, t)); wall = performance.now(); dirty = true; started = true; big.hidden = true;
    if (audioOk) { try { audio.currentTime = cur; } catch (e) {} }
  }
  big.addEventListener('click', start);
  play.addEventListener('click', () => (playing ? pause() : start()));
  mute.addEventListener('click', () => {
    audio.muted = !audio.muted; mute.setAttribute('aria-pressed', String(audio.muted));
    mute.setAttribute('aria-label', audio.muted ? 'Unmute' : 'Mute'); wave.style.opacity = audio.muted ? '0.15' : '1';
  });
  scrub.addEventListener('input', () => seek(parseFloat(scrub.value)));
  chaps.forEach((b) => b.addEventListener('click', () => { seek(parseFloat(b.dataset.t)); if (!playing) start(); }));
  document.addEventListener('keydown', (e) => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON')) return;
    if (e.key === ' ') { e.preventDefault(); playing ? pause() : start(); }
    if (e.key === 'ArrowRight') seek(now() + 5);
    if (e.key === 'ArrowLeft') seek(now() - 5);
  });
  let lastChap = -1;
  function tick() {
    let T = now();
    if (T >= D) { T = T % D; cur = T; wall = performance.now(); if (audioOk) { try { audio.currentTime = T; } catch (e) {} } }
    if (!started) { if (dirty) { window.renderCover({ footer: false }); dirty = false; } }
    else if (playing || dirty) { window.renderFrame(T); dirty = false; }
    scrub.value = T.toFixed(2); time.textContent = fmt(T) + ' / ' + fmt(D);
    let ci = 0; chaps.forEach((b, i) => { if (T >= parseFloat(b.dataset.t)) ci = i; });
    if (ci !== lastChap && started) { chaps.forEach((b, i) => b.classList.toggle('on', i === ci)); lastChap = ci; }
    requestAnimationFrame(tick);
  }
  window.ready.then(() => { dirty = true; requestAnimationFrame(tick); });
})();
</script>
'''

import base64
def face(fam, file, weight='400', style='normal'):
    b = base64.b64encode(open(os.path.join(ROOT, 'fonts', file), 'rb').read()).decode()
    return f"  @font-face {{ font-family: '{fam}'; src: url(data:font/woff2;base64,{b}) format('woff2'); font-weight: {weight}; font-style: {style}; font-display: block; }}\n"
FONTS = (face('Inter Tight', 'InterTight-Var.woff2', '400 900') + face('Inter Tight', 'InterTight-Italic-Var.woff2', '400 900', 'italic')
         + face('Instrument Serif', 'InstrumentSerif-Regular.woff2') + face('Instrument Serif', 'InstrumentSerif-Italic.woff2', '400', 'italic')
         + face('JetBrains Mono', 'JetBrainsMono-Var.woff2', '400 800') + face('Caveat', 'Caveat-Var.woff2', '400 700'))
html = (PAGE.replace('__FONTS__', FONTS).replace('__ENGINE__', read('src/engine.js')).replace('__SCENES__', read('src/scenes.js'))
        .replace('__MAIN__', read('src/main.js')).replace('__COVER__', read('src/cover.js'))
        .replace('__CHAPTERS__', chapters_html).replace('__MARKS__', marks_html)
        .replace('__DUR__', str(cues['duration'])).replace('__CUES__', str(len(cues['cues']))))
open(os.path.join(DST, 'index.html'), 'w', encoding='utf-8').write(html)
print('showreel ->', os.path.join(DST, 'index.html'), f'{len(html) / 1024:.0f} KB;',
      'audio', f"{os.path.getsize(os.path.join(DST, 'soundtrack.m4a')) / 1e6:.2f} MB")

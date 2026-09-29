# AI bil-Malti

Vertical (9:16) motion-graphics explainers about AI, written in Maltese. Picture, typography and music are all generated from code: no stock, no samples, no templates.

| Episode | Film | Cover | Captions | Breakdown |
|---|---|---|---|---|
| **EP. 01 — *Kif Naħdem*** · how an LLM works | `out/ai-bil-malti.mp4` | `out/cover.png` | `out/ai-bil-malti.{mt,en}.srt` | `STORYBOARD.md` |
| **EP. 02 — *7 Qwiel tan-Nanna*** · seven Maltese proverbs that explain AI | `out/ep02/ai-bil-malti-ep02.mp4` | `out/ep02/cover.png` | `out/ep02/ai-bil-malti-ep02.{mt,en}.srt` | `STORYBOARD-EP02.md` |

- **Soundtracks:** `out/ai-bil-malti-soundtrack.m4a` · `out/ep02/ai-bil-malti-ep02-soundtrack.m4a`
- **Showreel page:** `showreel/showreel.html` with web encodes in `showreel/media/`

## How it's built

| Part | Where | What it does |
|---|---|---|
| Timeline | `src/timeline.js` · `src/ep02/timeline.js` | Scene windows, the Maltese script and the sound-design cue list. The single source of truth for picture and sound. |
| Engine | `src/core.js`, `src/main.js` | Pure-function-of-time Canvas 2D renderer: easing, springs, keyframes, noise, glyph layout, 3D projection; motion blur by averaging 3–10 sub-frames per frame in linear light (float accumulation) |
| Finishing | `src/post.js` | WebGL2: bloom, chromatic aberration, glitch, grade, vignette, grain, and a GPU YUV 4:2:0 pack that streams frames to ffmpeg over a WebSocket |
| Type | `src/fonts.js` | Archivo registered as 64 fixed-width faces (62–125%) so canvas can animate the width axis; Instrument Serif; JetBrains Mono |
| Scenes | `src/scenes/s01…s12` · `src/ep02/scenes/` | One file per scene; the cover scenes render the thumbnails |
| EP02 kit | `src/ep02/kit.js`, `src/ep02/cards.js` | Maltese cement-tile (*madum*) generator, tile-flip transitions, number cards, and the illustrated objects (ġarra, head, cat, gallariji, domes, glasses, *bizzilla* lace) |
| Music + SFX | `audio/synth.py` · `audio/ep02.py` | numpy/numba synthesizer and master chain; EP02 adds a Karplus-Strong guitar, a *żaqq*-like reed, tanbur and tile-clack sound design |

## Render it

```bash
# fonts are vendored in assets/fonts; only Playwright (global) + ffmpeg are needed
pip install numpy scipy numba imageio-ffmpeg pillow
# EP. 01
node -e "const TL=require('./src/timeline.js');require('fs').writeFileSync('audio/cues.json',JSON.stringify({CUES:TL.CUES,S:TL.S,DURATION:TL.DURATION}))"
python3 audio/synth.py                  # → audio/mix.wav
./tools/render_all.sh 3                 # every scene → lossless segments (headless Chromium)
./tools/export.sh                       # master MP4, web MP4, cover
./tools/upload.sh                       # <30 MB two-pass copy for sharing
# EP. 02 (same tools, EP=02)
node -e "const TL=require('./src/ep02/timeline.js');require('fs').writeFileSync('audio/cues-ep02.json',JSON.stringify({CUES:TL.CUES,S:TL.S,DURATION:TL.DURATION}))"
python3 audio/ep02.py                   # → audio/mix-ep02.wav
EP=02 ./tools/render_all.sh 3           # or: EP=02 ./tools/render_all.sh 3 p5   (one scene)
EP=02 ./tools/export.sh && EP=02 ./tools/upload.sh
node tools/captions-ep02.mjs
```

Stills for review: `node tools/render.mjs --page ep02.html --frames 12.5,20,38.4 --out /tmp/stills`

Preview live in a browser: serve the folder (`npx serve .`) and open `index.html?t=38.4` (or `ep02.html?t=21`) to render one frame.

Coastline data: geoBoundaries gbOpen MLT ADM0 (CC BY 4.0). Fonts under the SIL Open Font License. EP02 proverb sources are listed in `STORYBOARD-EP02.md`.

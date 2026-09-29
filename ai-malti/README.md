# AI bil-Malti · EP. 01 — *Kif Naħdem*

A 64-second vertical motion-graphics explainer about how LLMs work, written in Maltese. Picture, typography and music are all generated from code.

- **Film:** `out/ai-bil-malti.mp4` (master: 1080×1920, 30 fps, H.264 + AAC, ~6.6 Mbps)
- **Soundtrack:** `out/ai-bil-malti-soundtrack.m4a` (original score + sound design, 64 s)
- **Captions:** `out/ai-bil-malti.mt.srt` (Maltese) and `out/ai-bil-malti.en.srt` (English)
- **Cover:** `out/cover.png`
- **Breakdown and posting kit:** `STORYBOARD.md`
- **Showreel page:** `showreel/showreel.html` with a web encode in `showreel/media/`

## How it's built

| Part | Where | What it does |
|---|---|---|
| Timeline | `src/timeline.js` | Scene windows, the Maltese script and the sound-design cue list. The single source of truth for picture and sound. |
| Engine | `src/core.js`, `src/main.js` | Pure-function-of-time Canvas 2D renderer: easing, springs, keyframes, noise, glyph layout, 3D projection; motion blur by averaging 3–10 sub-frames per frame in linear light (float accumulation) |
| Finishing | `src/post.js` | WebGL2: bloom, chromatic aberration, glitch, grade, vignette, grain, and a GPU YUV 4:2:0 pack that streams frames to ffmpeg over a WebSocket |
| Type | `src/fonts.js` | Archivo registered as 64 fixed-width faces (62–125%) so canvas can animate the width axis; Instrument Serif; JetBrains Mono |
| Scenes | `src/scenes/s01…s12` | One file per scene; `s99-cover.js` is the thumbnail |
| Music + SFX | `audio/synth.py` | numpy/numba synthesizer: drums, bass, supersaws, plucks, lead, 40+ cues, mix, true-peak limiter |

## Render it

```bash
# fonts are vendored in assets/fonts; only Playwright (global) + ffmpeg are needed
pip install numpy scipy numba imageio-ffmpeg pillow
node -e "const TL=require('./src/timeline.js');require('fs').writeFileSync('audio/cues.json',JSON.stringify({CUES:TL.CUES,S:TL.S,DURATION:TL.DURATION}))"
python3 audio/synth.py           # → audio/mix.wav
./tools/render_all.sh 3          # every scene → lossless segments (headless Chromium)
./tools/render_all.sh 3 tokens   # …or re-render just one scene
./tools/export.sh                # master MP4, web MP4, cover
```

Stills for review: `node tools/render.mjs --frames 12.5,20,38.4 --out /tmp/stills`

Preview live in a browser: serve the folder (`npx serve .`) and open `index.html?t=38.4` to render one frame.

Coastline data: geoBoundaries gbOpen MLT ADM0 (CC BY 4.0). Fonts under the SIL Open Font License.

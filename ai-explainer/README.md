# Raising an AI: how ChatGPT-style AI works, explained for parents

An 81-second vertical motion-graphics explainer built as a showreel piece. Every frame is drawn in code on an
HTML canvas and rendered frame-accurately at 1080×1920, 60 fps. The music and all 290 sound effects are original,
synthesized from scratch in Python and locked to the animation's cue sheet.

| Deliverable | File |
|---|---|
| Main cut (TikTok / Reels / Shorts) | [`out/raising-an-ai_9x16.mp4`](out/raising-an-ai_9x16.mp4) |
| 15-second cut-down (Stories / ads) | [`out/raising-an-ai_teaser-15s.mp4`](out/raising-an-ai_teaser-15s.mp4) |
| Cover / thumbnail (9:16 and 3:4 grid crop) | [`out/cover.jpg`](out/cover.jpg), [`out/cover_3x4.jpg`](out/cover_3x4.jpg) |
| Storyboard, beat sheet, fact check | [`STORYBOARD.md`](STORYBOARD.md) |

## The story in one line

*Raising an AI is weirdly like raising a kid.* It learns to talk by reading everything (10 trillion+ words).
It practises a guessing game with hundreds of billions of little dials. It learns to pay attention (unlike some kids).
It gets a sticker chart for manners (RLHF). And sometimes it makes things up with total confidence,
like a 4-year-old explaining where babies come from.

## What's on screen (the showreel part)

- **Kinetic typography**: masked rises, slams, per-character pops and scramble morphs. A grotesk + serif-italic
  system (Inter Tight × Instrument Serif), JetBrains Mono for data, and Caveat for handwritten asides.
- **Match cuts**: the final period zooms into the next background, the dial grid pulls back into the
  character, and the attention sentence flattens into a layer of the stack.
- **Data viz**: next-word probability bars, a rolling odometer (10,000,000,000,000+), and a layer counter.
- **Simulation and 3D**: an analytic particle vortex of books and web pages, a 3D "map of meaning" with a
  depth-faded orbit camera and warp jump, and an isometric Transformer stack.
- **Character animation**: Bub, a chat-bubble mascot with squash and stretch, blinks, eye darts, glasses,
  a sticker, a thought bubble and sunglasses, plus a family of five for the send-off.
- **Transitions**: diagonal band wipes, an iris, blinds, a page turn, a glitch/RGB-split cut, and a powers-of-ten zoom.
- **Finish**: paper texture, film grain, vignette and impact camera shake.

## Built for engagement

- **0:00 hook**: "PARENTS, FINISH THIS SENTENCE: Go brush your ▮". The viewer answers "teeth" before the video does.
- **Open loop**: a story-style progress bar with 7 numbered steps, so viewers know how much is left.
- **Readable muted**: the type carries the whole script, since a lot of feed video is watched with the sound off.
- **A joke every chapter**, including "tantrum ≈ meltdown", "PAY ATTENTION", "a sticker chart. For robots.",
  "3 kids × 2 cookies… the dog ate one" and "the baby store".
- **A share prompt aimed at a person**: "Send this to a parent who thinks it's magic." It gives viewers someone
  specific to send it to.
- **Seamless loop**: it ends on "now, kids… Go brush your ▮", the opening line again.
- **Safe zones**: critical type stays clear of the TikTok and Reels UI (right-hand buttons, bottom caption).

## Posting kit

**Caption (TikTok / Reels)**
> Every parent is secretly a language model 🤯 Here's how ChatGPT actually works, in 80 seconds and with a sticker chart.
> Send this to a parent who still thinks it's magic ✨
> #AIforParents #ChatGPT #HowAIWorks #ParentingTips #MomTok #DadTok #TechExplained #LearnOnTikTok

**YouTube Shorts title**: How ChatGPT Actually Works (Explained for Parents) #shorts

**Pinned first comment**: Which one got you: the sticker chart or the baby store? 😂

**Tips**
- Post the main cut natively on each platform (no watermarks), with `cover.jpg` as the cover and `cover_3x4.jpg` for the grid.
- Use the 15-second teaser for Stories or paid placements, pointing back to the full video.
- Early comments drive reach. Reply to "which step surprised you?" style comments within the first hour.

## Rebuild from source

Requires Node 18+ (Playwright + Chromium), Python 3.10+ with `numpy scipy pillow imageio-ffmpeg`.

```bash
cd ai-explainer
npm install                     # playwright (uses a local Chromium)
node render/cues.mjs            # export the SFX cue sheet from the animation
python3 audio/score.py          # synthesize music + sound design -> out/soundtrack_raw.wav
node render/frames.mjs          # 4,860 PNG frames (parallel headless Chromium)
python3 render/encode.py        # main cut + 15 s teaser (H.264/AAC, BT.709, faststart)
node render/cover.mjs           # cover / thumbnail
```

To preview live, serve the folder (for example `npx http-server`) and open `index.html`. It plays the
same code in real time with the soundtrack, and you can scrub or add `?t=33` to jump to a time.

## Project layout

```
index.html        live player / render host
src/engine.js     motion engine: easing, springs, noise, rich kinetic type, shapes, character, particles, post FX
src/scenes.js     the 11 scenes, transitions and SFX cue sheet
src/main.js       timeline compositor, HUD, preview player
src/cover.js      cover/thumbnail composition
audio/score.py    synthesizer, arrangement, sound design and mastering (BS.1770 loudness, -13 LUFS)
render/*.mjs|py   frame renderer, stills and contact sheets, cue export, encoder
fonts/            Inter Tight, Instrument Serif, JetBrains Mono, Caveat (SIL Open Font License)
```

## Accuracy notes

The numbers are rounded down on purpose: 10T+ training words, 75,000+ years of reading at 250 wpm, "hundreds of billions" of
parameters, and "dozens" of layers. The probability percentages are illustrative. See [`STORYBOARD.md`](STORYBOARD.md#fact-check-kept-deliberately-conservative).

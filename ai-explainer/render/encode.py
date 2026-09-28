#!/usr/bin/env python3
"""Encode rendered frames + soundtrack into social-ready deliverables.

  out/raising-an-ai_9x16.mp4       main cut, 1080x1920 60fps, H.264 High + AAC (TikTok / Reels / Shorts)
  out/raising-an-ai_teaser-15s.mp4 15 s cut-down on bar boundaries (Stories / ads)
"""
import os, subprocess, sys, json
import imageio_ffmpeg

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'out')
FF = imageio_ffmpeg.get_ffmpeg_exe()
FPS = 60
MAIN = os.path.join(OUT, 'raising-an-ai_9x16.mp4')
TEASER = os.path.join(OUT, 'raising-an-ai_teaser-15s.mp4')
CRF = sys.argv[1] if len(sys.argv) > 1 else '18'

def run(args):
    print('$ ffmpeg', ' '.join(args[:12]), '...')
    subprocess.run([FF, '-hide_banner', '-loglevel', 'error', '-y'] + args, check=True)

video_flags = ['-c:v', 'libx264', '-preset', 'slow', '-tune', 'animation', '-crf', CRF, '-profile:v', 'high', '-level:v', '4.2',
               '-pix_fmt', 'yuv420p', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
               '-g', '120', '-bf', '3', '-movflags', '+faststart']
audio_flags = ['-c:a', 'aac', '-b:a', '256k', '-ar', '48000']

# 1) main cut
run(['-framerate', str(FPS), '-i', os.path.join(OUT, 'frames', 'f%05d.png'), '-i', os.path.join(OUT, 'soundtrack_raw.wav'),
     '-map', '0:v', '-map', '1:a', '-vf', 'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p', *video_flags, *audio_flags,
     '-metadata', 'title=Raising an AI: how ChatGPT-style AI works, explained for parents', '-shortest', MAIN])

# 2) 15 s teaser: hook + sticker chart + confident nonsense + share prompt (every cut lands on the beat grid)
SEGS = [(0.0, 7.0), (56.5, 58.5), (69.0, 73.0), (77.0, 79.0)]
parts = []
for i, (a, b) in enumerate(SEGS):
    parts.append(f'[0:v]trim={a}:{b},setpts=PTS-STARTPTS[v{i}];'
                 f'[0:a]atrim={a}:{b},asetpts=PTS-STARTPTS,afade=t=in:d=0.012,afade=t=out:st={b - a - 0.02}:d=0.02[a{i}];')
concat = ''.join(f'[v{i}][a{i}]' for i in range(len(SEGS))) + f'concat=n={len(SEGS)}:v=1:a=1[v][a]'
run(['-i', MAIN, '-filter_complex', ''.join(parts) + concat, '-map', '[v]', '-map', '[a]', *video_flags, *audio_flags, TEASER])

# 3) standalone soundtrack for the live preview player (index.html)
run(['-i', os.path.join(OUT, 'soundtrack_raw.wav'), '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', os.path.join(OUT, 'soundtrack.m4a')])

for f in (MAIN, TEASER):
    probe = subprocess.run([FF, '-hide_banner', '-i', f], capture_output=True, text=True).stderr
    dur = [l for l in probe.splitlines() if 'Duration' in l]
    print(os.path.basename(f), f'{os.path.getsize(f) / 1e6:.1f} MB', dur[0].strip() if dur else '')

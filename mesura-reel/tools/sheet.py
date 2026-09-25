#!/usr/bin/env python3
"""Contact sheet: python3 sheet.py out.png cols thumbWidth frame1.png frame2.png ..."""
import os
import re
import sys

from PIL import Image, ImageDraw, ImageFont

out, cols, tw = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
files = sys.argv[4:]
th = tw * 16 // 9
pad, label = 6, 22
rows = (len(files) + cols - 1) // cols
sheet = Image.new("RGB", (cols * (tw + pad) + pad, rows * (th + pad + label) + pad), (30, 34, 32))
draw = ImageDraw.Draw(sheet)
try:
    font = ImageFont.truetype("DejaVuSansMono.ttf", 15)
except OSError:
    font = ImageFont.load_default()
for i, f in enumerate(files):
    im = Image.open(f).convert("RGB").resize((tw, th), Image.LANCZOS)
    x = pad + (i % cols) * (tw + pad)
    y = pad + (i // cols) * (th + pad + label)
    sheet.paste(im, (x, y + label))
    m = re.search(r"_(\d+\.\d+)\.png$", os.path.basename(f))
    draw.text((x + 2, y + 3), (m.group(1).lstrip("0") or "0") + "s" if m else os.path.basename(f), fill=(230, 225, 210), font=font)
sheet.save(out)

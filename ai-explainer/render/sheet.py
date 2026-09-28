"""Build a labelled contact sheet from rendered frames: sheet.py out.jpg f1.png f2.png ..."""
import sys, os
from PIL import Image, ImageDraw, ImageFont

out, files = sys.argv[1], sys.argv[2:]
cols = min(6, len(files))
rows = (len(files) + cols - 1) // cols
tw, th = 270, 480
sheet = Image.new('RGB', (cols * tw, rows * (th + 26)), (20, 20, 20))
d = ImageDraw.Draw(sheet)
try:
    font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf', 16)
except Exception:
    font = ImageFont.load_default()
for i, f in enumerate(files):
    im = Image.open(f).convert('RGB').resize((tw, th), Image.LANCZOS)
    x, y = (i % cols) * tw, (i // cols) * (th + 26)
    sheet.paste(im, (x, y + 26))
    label = os.path.basename(f).replace('.png', '').lstrip('t').lstrip('0') or '0'
    d.text((x + 8, y + 4), label + 's', fill=(255, 200, 60), font=font)
sheet.save(out, quality=88)
print('sheet ->', out)

# contact sheet: python3 tools/sheet.py <dir> <out.jpg> [cols] [scale]
import sys, os, glob
from PIL import Image, ImageDraw, ImageFont
d, out = sys.argv[1], sys.argv[2]
cols = int(sys.argv[3]) if len(sys.argv) > 3 else 6
scale = float(sys.argv[4]) if len(sys.argv) > 4 else 0.25
files = sorted(glob.glob(os.path.join(d, 'f_*.*')))
if len(sys.argv) > 5:
    lo, hi = float(sys.argv[5]), float(sys.argv[6])
    files = [f for f in files if lo <= int(os.path.basename(f)[2:7]) / 30 < hi]
ims = [Image.open(f) for f in files]
w, h = int(1080 * scale), int(1920 * scale)
rows = (len(ims) + cols - 1) // cols
sheet = Image.new('RGB', (cols * w, rows * (h + 22)), (40, 40, 40))
dr = ImageDraw.Draw(sheet)
for i, (f, im) in enumerate(zip(files, ims)):
    x, y = (i % cols) * w, (i // cols) * (h + 22)
    sheet.paste(im.resize((w, h), Image.LANCZOS), (x, y + 22))
    fr = int(os.path.basename(f)[2:7])
    dr.text((x + 4, y + 4), f'{fr/30:.2f}s  f{fr}', fill=(255, 255, 0))
sheet.save(out, quality=88)
print(out, sheet.size, len(ims))

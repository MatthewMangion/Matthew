"""Build a storyboard sheet (key frames + timecodes) from a rendered frame sequence.

    python3 render/storyboard.py <frames_dir> <out.png>
"""
import io
import sys
from pathlib import Path

from fontTools.ttLib import TTFont
from PIL import Image, ImageDraw, ImageFont

FRAMES = Path(sys.argv[1])
OUT = Path(sys.argv[2])
FONTS = Path(__file__).resolve().parent.parent / "fonts"


def font(name, size):
    f = TTFont(FONTS / f"{name}.woff2")
    f.flavor = None
    buf = io.BytesIO()
    f.save(buf)
    buf.seek(0)
    return ImageFont.truetype(buf, size)


KEYS = [(0.64, "The question"), (3.9, "The question"), (7.2, "The evidence"), (10.5, "Into the gap"),
        (12.8, "Shadow AI"), (14.25, "The measure"), (18.9, "Six dimensions"), (22.1, "Measure again"),
        (23.2, "The mark"), (26.35, "End card")]
COLS, TW = 5, 560
TH = TW * 9 // 16
PAD, CAP, TOP = 28, 40, 96
W = COLS * TW + (COLS + 1) * PAD
ROWS = (len(KEYS) + COLS - 1) // COLS
H = TOP + ROWS * (TH + CAP + PAD) + PAD

INK, BODY, OCHRE, BORDER = (34, 54, 47), (69, 83, 77), (209, 156, 63), (211, 203, 185)
f_title, f_label, f_tc = font("SerifDisplay-500", 40), font("InterText-500", 19), font("Mono-500", 17)

sheet = Image.new("RGB", (W, H), (242, 237, 227))
d = ImageDraw.Draw(sheet)
d.text((PAD, 30), "mesura.ai  ·  brand reel", fill=INK, font=f_title)
d.text((W - PAD, 44), "1920 × 1080  ·  60 fps  ·  storyboard", fill=BODY, font=f_label, anchor="ra")
for k, (t, label) in enumerate(KEYS):
    im = Image.open(FRAMES / f"f{round(t * 60):04d}.png").convert("RGB").resize((TW, TH), Image.LANCZOS)
    r, c = divmod(k, COLS)
    x, y = PAD + c * (TW + PAD), TOP + r * (TH + CAP + PAD)
    sheet.paste(im, (x, y))
    d.rectangle([x - 1, y - 1, x + TW, y + TH], outline=BORDER)
    d.text((x, y + TH + 12), f"00:{t:05.2f}", fill=OCHRE, font=f_tc)
    d.text((x + 86, y + TH + 11), label, fill=BODY, font=f_label)
sheet.save(OUT, quality=92, optimize=True) if OUT.suffix.lower() in (".jpg", ".jpeg") else sheet.save(OUT, optimize=True)
print("wrote", OUT)

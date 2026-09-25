"""Cover images and a series contact sheet for the social reels.

    python3 render/series.py <frames_root>

Reads <frames_root>/frames-<id>/fNNNN.png for each reel and writes social/covers/<id>.jpg (a full
1080x1920 frame chosen as the cover) and social/series.jpg (every cover on one sheet).
"""
import io
import sys
from pathlib import Path

from fontTools.ttLib import TTFont
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(sys.argv[1])
HERE = Path(__file__).resolve().parent.parent
FONTS = HERE / "fonts"
OUT = HERE / "social"

# reel id, label, cover time (s): a settled frame that carries the hook
REELS = [
    ("01-ai-at-work", "AI at work", 1.6),
    ("02-shadow-ai", "Shadow AI", 1.5),
    ("03-who-is-ready", "Who is more ready?", 2.4),
    ("04-did-it-work", "Did it work?", 2.0),
    ("05-six-dimensions", "Six dimensions", 2.2),
    ("06-compared-to-what", "Compared to what?", 1.8),
    ("07-the-report", "What you get", 1.8),
    ("08-can-you-answer", "Can you answer this?", 5.8),
]


def font(name, size):
    f = TTFont(FONTS / f"{name}.woff2")
    f.flavor = None
    buf = io.BytesIO()
    f.save(buf)
    buf.seek(0)
    return ImageFont.truetype(buf, size)


(OUT / "covers").mkdir(parents=True, exist_ok=True)
COLS, TW = 4, 400
TH = TW * 16 // 9
PAD, CAP, TOP = 28, 44, 96
W = COLS * TW + (COLS + 1) * PAD
H = TOP + 2 * (TH + CAP + PAD) + PAD
INK, BODY, OCHRE, BORDER = (34, 54, 47), (69, 83, 77), (209, 156, 63), (211, 203, 185)
f_title, f_label, f_num = font("SerifDisplay-500", 40), font("InterText-500", 21), font("Mono-500", 19)

sheet = Image.new("RGB", (W, H), (242, 237, 227))
d = ImageDraw.Draw(sheet)
d.text((PAD, 30), "mesura.ai  ·  social reels", fill=INK, font=f_title)
d.text((W - PAD, 44), "1080 × 1920  ·  60 fps  ·  Instagram and TikTok", fill=BODY, font=f_label, anchor="ra")
for k, (rid, label, t) in enumerate(REELS):
    im = Image.open(ROOT / f"frames-{rid}" / f"f{round(t * 60):04d}.png").convert("RGB")
    im.save(OUT / "covers" / f"{rid}.jpg", quality=92, optimize=True)
    r, c = divmod(k, COLS)
    x, y = PAD + c * (TW + PAD), TOP + r * (TH + CAP + PAD)
    sheet.paste(im.resize((TW, TH), Image.LANCZOS), (x, y))
    d.rectangle([x - 1, y - 1, x + TW, y + TH], outline=BORDER)
    d.text((x, y + TH + 13), rid[:2], fill=OCHRE, font=f_num)
    d.text((x + 34, y + TH + 12), label, fill=BODY, font=f_label)
sheet.save(OUT / "series.jpg", quality=90, optimize=True)
print("wrote", OUT / "series.jpg", "and", len(REELS), "covers")

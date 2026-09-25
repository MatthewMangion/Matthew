"""Build a storyboard sheet (key frames + timecodes) from a rendered frame sequence.

    python3 render/storyboard.py <frames_dir> <out.jpg> [reel|how]
"""
import io
import sys
from pathlib import Path

from fontTools.ttLib import TTFont
from PIL import Image, ImageDraw, ImageFont

FRAMES = Path(sys.argv[1])
OUT = Path(sys.argv[2])
FILM = sys.argv[3] if len(sys.argv) > 3 else "reel"
FONTS = Path(__file__).resolve().parent.parent / "fonts"


def font(name, size):
    f = TTFont(FONTS / f"{name}.woff2")
    f.flavor = None
    buf = io.BytesIO()
    f.save(buf)
    buf.seek(0)
    return ImageFont.truetype(buf, size)


FILMS = {
    "reel": dict(title="mesura.ai  ·  brand reel", spec="1920 × 1080  ·  60 fps  ·  storyboard", cols=5, tw=560, aspect=(16, 9),
                 keys=[(0.64, "The question"), (3.9, "The question"), (7.2, "The evidence"), (10.5, "Into the gap"),
                       (12.8, "Shadow AI"), (14.25, "The measure"), (18.9, "Six dimensions"), (22.1, "Measure again"),
                       (23.2, "The mark"), (26.35, "End card")]),
    "how": dict(title="mesura.ai  ·  how it works", spec="1080 × 1920  ·  60 fps  ·  storyboard", cols=6, tw=300, aspect=(9, 16),
                keys=[(0.8, "The point lands"), (2.4, "The promise"), (4.1, "01 Sign up"), (6.45, "Your code"),
                      (9.3, "02 Share"), (11.7, "The workforce"), (13.9, "03 Answer"), (16.5, "Submitted"),
                      (19.4, "04 Diagnose"), (21.6, "One score"), (24.9, "The report"), (29.9, "End card")]),
}
cfg = FILMS[FILM]
KEYS, COLS, TW = cfg["keys"], cfg["cols"], cfg["tw"]
TH = TW * cfg["aspect"][1] // cfg["aspect"][0]
PAD, CAP, TOP = 28, 40, 96
W = COLS * TW + (COLS + 1) * PAD
ROWS = (len(KEYS) + COLS - 1) // COLS
H = TOP + ROWS * (TH + CAP + PAD) + PAD
LABEL_X = 86 if TW > 400 else 0          # narrow tiles put the label under the timecode

INK, BODY, OCHRE, BORDER = (34, 54, 47), (69, 83, 77), (209, 156, 63), (211, 203, 185)
f_title, f_label, f_tc = font("SerifDisplay-500", 40), font("InterText-500", 19), font("Mono-500", 17)
if not LABEL_X:
    H += 26

sheet = Image.new("RGB", (W, H), (242, 237, 227))
d = ImageDraw.Draw(sheet)
d.text((PAD, 30), cfg["title"], fill=INK, font=f_title)
d.text((W - PAD, 44), cfg["spec"], fill=BODY, font=f_label, anchor="ra")
for k, (t, label) in enumerate(KEYS):
    im = Image.open(FRAMES / f"f{round(t * 60):04d}.png").convert("RGB").resize((TW, TH), Image.LANCZOS)
    r, c = divmod(k, COLS)
    x, y = PAD + c * (TW + PAD), TOP + r * (TH + CAP + PAD + (0 if LABEL_X else 26))
    sheet.paste(im, (x, y))
    d.rectangle([x - 1, y - 1, x + TW, y + TH], outline=BORDER)
    d.text((x, y + TH + 12), f"00:{t:05.2f}", fill=OCHRE, font=f_tc)
    d.text((x + LABEL_X, y + TH + (11 if LABEL_X else 36)), label, fill=BODY, font=f_label)
sheet.save(OUT, quality=92, optimize=True) if OUT.suffix.lower() in (".jpg", ".jpeg") else sheet.save(OUT, optimize=True)
print("wrote", OUT)

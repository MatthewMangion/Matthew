#!/usr/bin/env python3
"""Trace the mesura.ai logo artwork into vector paths.

  python3 tools/trace_logo.py path/to/logo.webp

Splits the artwork by colour (gold mark, teal wordmark), supersamples the anti-aliased
edges, traces them with potrace, groups contours into glyphs, and writes:
  src/logo.js            M.LOGO (path data + metrics, in artwork pixel space)
  renders/logo/*.svg     the logo as SVG (colour and reversed)
"""
import json
import os
import sys

import numpy as np
import potrace
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
S = 3  # supersampling factor for the trace
GOLD = np.array([225, 162, 60]) / 255.0
TEAL = np.array([7, 61, 68]) / 255.0


def coverage(src):
    im = Image.open(src).convert("RGBA")
    a = np.asarray(im).astype(np.float64) / 255.0
    rgb, al = a[..., :3], a[..., 3]
    is_gold = np.linalg.norm(rgb - GOLD, axis=-1) < np.linalg.norm(rgb - TEAL, axis=-1)
    return im.size, np.where(is_gold, al, 0.0), np.where(~is_gold, al, 0.0)


def upsample(m):
    h, w = m.shape
    img = Image.fromarray(np.clip(m * 255, 0, 255).astype(np.uint8), "L").resize((w * S, h * S), Image.BICUBIC)
    return np.asarray(img) / 255.0 >= 0.5


def trace(mask):
    bm = potrace.Bitmap(~mask)  # potracer treats True as background before inverting
    return bm.trace(turdsize=4 * S, alphamax=1.0, opticurve=True, opttolerance=0.2)


def fmt(v):
    s = f"{v / S:.2f}".rstrip("0").rstrip(".")
    return s if s not in ("-0", "") else "0"


def xy(p):
    return (p.x, p.y) if hasattr(p, "x") else (p[0], p[1])


def curve_to_d(c):
    x, y = xy(c.start_point)
    d = [f"M{fmt(x)} {fmt(y)}"]
    pts = [(x, y)]
    for seg in c.segments:
        if seg.is_corner:
            cx, cy = xy(seg.c)
            ex, ey = xy(seg.end_point)
            d.append(f"L{fmt(cx)} {fmt(cy)}L{fmt(ex)} {fmt(ey)}")
            pts += [(cx, cy), (ex, ey)]
        else:
            (ax, ay), (bx, by), (ex, ey) = xy(seg.c1), xy(seg.c2), xy(seg.end_point)
            d.append(f"C{fmt(ax)} {fmt(ay)} {fmt(bx)} {fmt(by)} {fmt(ex)} {fmt(ey)}")
            # sample the bezier for bbox / containment tests
            p0 = pts[-1]
            for t in np.linspace(0.1, 1, 10):
                u = 1 - t
                pts.append((u ** 3 * p0[0] + 3 * u * u * t * ax + 3 * u * t * t * bx + t ** 3 * ex,
                            u ** 3 * p0[1] + 3 * u * u * t * ay + 3 * u * t * t * by + t ** 3 * ey))
    d.append("Z")
    pts = np.array(pts) / S
    return "".join(d), pts


def inside(pt, poly):
    x, y = pt
    n = len(poly)
    c = False
    for i in range(n):
        x1, y1 = poly[i]
        x2, y2 = poly[(i + 1) % n]
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1 + 1e-12) + x1:
            c = not c
    return c


def group(path):
    """Outer contours with their holes, sorted left to right."""
    cs = []
    for c in path.curves:
        d, pts = curve_to_d(c)
        cs.append({"d": d, "pts": pts, "sign": c._path.sign,
                   "bbox": [float(pts[:, 0].min()), float(pts[:, 1].min()), float(pts[:, 0].max()), float(pts[:, 1].max())]})
    outer = lambda c: bool(c["sign"]) if not isinstance(c["sign"], str) else c["sign"] == "+"
    outers = [c for c in cs if outer(c)]
    holes = [c for c in cs if not outer(c)]
    groups = [{"d": o["d"], "bbox": o["bbox"], "pts": o["pts"]} for o in outers]
    for h in holes:
        p = h["pts"][0]
        best = None
        for g in groups:
            b = g["bbox"]
            if b[0] <= p[0] <= b[2] and b[1] <= p[1] <= b[3] and inside(p, g["pts"]):
                area = (b[2] - b[0]) * (b[3] - b[1])
                if best is None or area < best[0]:
                    best = (area, g)
        if best:
            best[1]["d"] += h["d"]
    groups.sort(key=lambda g: g["bbox"][0])
    for g in groups:
        del g["pts"]
    return groups


def main():
    src = sys.argv[1]
    (W, H), gold, teal = coverage(src)
    mark = group(trace(upsample(gold)))
    word = group(trace(upsample(teal)))
    # the i's dot is its own contour: merge each dot into the glyph it sits above
    merged = []
    for g in word:
        b = g["bbox"]
        host = None
        for m in merged:
            mb = m["bbox"]
            overlap = min(b[2], mb[2]) - max(b[0], mb[0])
            if overlap > 0.5 * min(b[2] - b[0], mb[2] - mb[0]):
                host = m
        if host:
            host["d"] += g["d"]
            hb = host["bbox"]
            host["bbox"] = [min(hb[0], b[0]), min(hb[1], b[1]), max(hb[2], b[2]), max(hb[3], b[3])]
        else:
            merged.append(g)
    # metrics
    mb = mark[0]["bbox"] if len(mark) == 1 else [min(m["bbox"][0] for m in mark), min(m["bbox"][1] for m in mark), max(m["bbox"][2] for m in mark), max(m["bbox"][3] for m in mark)]
    base = float(merged[0]["bbox"][3])  # the m's flat serifs sit on the baseline (round letters overshoot it)
    xtop = float(np.median([g["bbox"][1] for g in merged[:1]]))  # 'm' top = x-height (with serif overshoot)
    logo = {
        "W": W, "H": H,
        "colors": {"gold": "#E1A23C", "teal": "#073D44"},
        "mark": {"d": "".join(m["d"] for m in mark), "bbox": [round(v, 2) for v in mb],
                 "cx": round((mb[0] + mb[2]) / 2, 2), "cy": round((mb[1] + mb[3]) / 2, 2)},
        "glyphs": [{"d": g["d"], "bbox": [round(v, 2) for v in g["bbox"]]} for g in merged],
        "baseline": round(base, 2), "xTop": round(xtop, 2),
        "word": [round(min(g["bbox"][0] for g in merged), 2), round(min(g["bbox"][1] for g in merged), 2),
                 round(max(g["bbox"][2] for g in merged), 2), round(max(g["bbox"][3] for g in merged), 2)],
    }
    os.makedirs(os.path.join(ROOT, "src"), exist_ok=True)
    with open(os.path.join(ROOT, "src", "logo.js"), "w") as f:
        f.write("/* mesura.ai logo, traced from the brand artwork by tools/trace_logo.py. Coordinates are artwork pixels. */\n")
        f.write("(function (G) {\n  'use strict';\n  G.M.LOGO = " + json.dumps(logo, separators=(",", ":")) + ";\n})(typeof window !== 'undefined' ? window : globalThis);\n")
    out = os.path.join(ROOT, "renders", "logo")
    os.makedirs(out, exist_ok=True)
    for name, wc in (("mesura-logo", "#073D44"), ("mesura-logo-reversed", "#F6F2E9")):
        with open(os.path.join(out, name + ".svg"), "w") as f:
            f.write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">'
                    f'<path fill="#E1A23C" d="{logo["mark"]["d"]}"/>'
                    f'<path fill="{wc}" d="{"".join(g["d"] for g in logo["glyphs"])}"/></svg>\n')
    print(f"mark contours: {len(mark)}  glyphs: {len(merged)}  baseline {base:.1f}  xTop {xtop:.1f}")
    print("mark bbox", logo["mark"]["bbox"], "word bbox", logo["word"])
    for g in logo["glyphs"]:
        print("  glyph bbox", g["bbox"])


if __name__ == "__main__":
    main()

# Mesura: seven readings

Seven prototype design systems for mesura.ai. Each one starts from a different way of reading the eight-point mark, and each keeps the same six fixed points: the mark, the name, pine and ochre, serif figures, the ranked stat colours (headline, baseline, insight) and the plain voice.

Open `index.html` in a browser. It is a single self-contained page. Fonts load from Google Fonts; everything else is inline.

| # | System | The mark as | Borrowed idea |
|---|--------|-------------|---------------|
| 01 | Almanac | a sun | Measuring things that grow: seasons, floods, tree rings |
| 02 | Hallmark | a seal | Assay marks and certificates (1300 onwards) |
| 03 | Madum | a tile | Maltese patterned cement floors (c. 1900) |
| 04 | Tolerance | a drawing | Engineering drawings and tolerances (1940s) |
| 05 | Dial | a knob | Mid-century industrial design (1960s) |
| 06 | Datum | a chart | Dataism (2010s) |
| 07 | Constant | an aperture | The 2019 SI redefinition |

The page ends with all seven side by side, next to the current v1.0 card, plus a positioning map and a recommendation.

## Editing

The page is assembled from the partials in `src/`:

- `00-head.html`: title, fonts and the frame styles (Mesura v1.0 tokens, light and dark)
- `01-defs.html`: the traced logo as SVG symbols, the parametric mark (`MZ.markPath`), the shared sample organisation and helpers
- `05-cover.html`, `90-closing.html`, `99-frame.html`: cover, comparison and frame scripts
- `10-almanac.html` to `70-constant.html`: one file per system, each with its own `<style>`, markup and script

After editing, rebuild with:

```sh
python3 build.py              # writes index.html
python3 build.py --artifact   # also writes artifact.html, without the document skeleton
```

## Notes

- The logo was traced from the supplied PNG (99.5% pixel overlap) and rebuilt as a parametric shape (98% overlap), so it can be bent into a knob, a chart or a tile without redrawing.
- The logo file and the v1.0 tokens use two slightly different pairs of colours (`#073D44`/`#E1A23C` and `#1D4A43`/`#D19C3F`). Worth merging.
- Malta and EU figures come from the Mesura v1.0 design system. Harbour & Co., every other organisation, and all other figures are illustrative.

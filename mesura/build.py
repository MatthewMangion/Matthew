"""Assemble mesura/index.html from the partials in mesura/src.

Each partial may start with a <style> block; those are hoisted into <head>.
The traced logo paths are injected from src/logo-paths.json.
Writes index.html, a standalone page you can open in any browser.
With --artifact it also writes artifact.html: the same page without the document skeleton.
"""
import json, pathlib, re, sys

root = pathlib.Path(__file__).parent
src = root / "src"
paths = json.loads((src / "logo-paths.json").read_text())

head, styles, body = "", [], []
for part in sorted(src.glob("*.html")):
    text = part.read_text()
    if part.name.startswith("00-"):
        head = text
        continue
    styles += re.findall(r"<style>(.*?)</style>", text, re.S)
    body.append(re.sub(r"<style>.*?</style>\s*", "", text, flags=re.S))

head = head.replace("/*CHAPTER-STYLES*/", "\n".join(s.strip() for s in styles))
page = "".join(body)
for key, value in {"{{MARK}}": paths["mark_centered"], "{{MARK_LOCKUP}}": paths["mark_lockup"], "{{WORD}}": paths["word"]}.items():
    page = page.replace(key, value)

(root / "index.html").write_text(
    '<!doctype html>\n<html lang="en-GB">\n<head>\n<meta charset="utf-8">\n'
    '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
    f"{head}\n</head>\n<body>\n{page}\n</body>\n</html>\n"
)
if "--artifact" in sys.argv:
    (root / "artifact.html").write_text(f"{head}\n{page}\n")
print("built", (root / "index.html").stat().st_size // 1024, "KB")

"""Builds the partner story pages.

- Preview copies in this folder have every photo inlined, so a single file opens anywhere.
- The live copy (bunna-bridge-frontend/public/demo/ethiopian-airlines/) references separate,
  resized images with srcset, so phones on slow in-flight Wi-Fi download only what they show.

Templates mark images as src="{{IMG:name}}". Run: python3 docs/design/premium-story/build.py
"""

import base64
import io
import re
import shutil
from pathlib import Path

from PIL import Image

HERE = Path(__file__).parent
ROOT = HERE.parents[2]
DEMO_ASSETS = ROOT / "bunna_bridge/bunna_bridge/lots/management/commands/demo_assets"
LIVE_DIR = ROOT / "bunna-bridge-frontend/public/demo/ethiopian-airlines"

# Widths to publish for each image; the middle one is the default src. Logos get one 2x size.
WIDTHS = {
    "product-jar": [360, 560, 800],
    "farmer-portrait": [720, 1100, 1500],
    "forest-walk": [720, 1200],
    "cherries": [640, 1000, 1400],
    "drying-beds": [640, 1000, 1400],
    "cta-band": [640, 1000, 1500],
    "cupping-detail": [380],
    "logo-ethiopian": [360],
    "logo-eset-ink": [280],
    "logo-eset-white": [280],
    "logo-eset-gold": [320],
    "farmer-harvest": [640, 960, 1244],
    "green-cherries": [720, 1200, 1672],
}


def source(name):
    own = HERE / "assets" / f"{name}.webp"  # photos supplied for this design
    return own if own.exists() else DEMO_ASSETS / f"{name}.webp"


def resized(name, width):
    im = Image.open(source(name))
    if im.width > width:
        im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    buf = io.BytesIO()
    lossless = name.startswith("logo-")
    im.save(buf, "WEBP", quality=74, method=6, lossless=lossless)
    return buf.getvalue()


def inline(match):
    name = match.group(1)
    raw = source(name).read_bytes() if name not in WIDTHS else resized(name, WIDTHS[name][-1])
    return 'src="data:image/webp;base64,' + base64.b64encode(raw).decode() + '"'


def published(match, prefix="img/"):
    name = match.group(1)
    widths = WIDTHS[name]
    default = widths[len(widths) // 2]
    attrs = f'src="{prefix}{name}-{default}.webp"'
    if len(widths) > 1:
        attrs += ' srcset="' + ", ".join(f"{prefix}{name}-{w}.webp {w}w" for w in widths) + '"'
    return attrs


PAGES = {
    "template.html": "premium-story-ethiopian-airlines-eset.html",
    "experience-template.html": "landing-ethiopian-airlines-eset.html",
    "experience-v2-template.html": "landing-v2-ethiopian-airlines-eset.html",
}
IMG = re.compile(r'src="\{\{IMG:([a-z-]+)\}\}"')

for src, dst in PAGES.items():
    html = IMG.sub(inline, (HERE / src).read_text())
    (HERE / dst).write_text(html)
    print("preview", dst, f"{len(html) // 1024} KB")

# Live copy with separate images.
if LIVE_DIR.exists():
    shutil.rmtree(LIVE_DIR)
(LIVE_DIR / "img").mkdir(parents=True)
total = 0
for name, widths in WIDTHS.items():
    for w in widths:
        data = resized(name, w)
        (LIVE_DIR / "img" / f"{name}-{w}.webp").write_bytes(data)
        total += len(data)
live = IMG.sub(published, (HERE / "experience-template.html").read_text())
(LIVE_DIR / "index.html").write_text(live)
print("live", LIVE_DIR, f"page {len(live) // 1024} KB, images {total // 1024} KB in total")

# Version 2 lives at /demo/ethiopian-airlines/v2/ and shares the same images.
(LIVE_DIR / "v2").mkdir()
live2 = IMG.sub(lambda m: published(m, "../img/"), (HERE / "experience-v2-template.html").read_text())
(LIVE_DIR / "v2" / "index.html").write_text(live2)
print("live", LIVE_DIR / "v2", f"page {len(live2) // 1024} KB")

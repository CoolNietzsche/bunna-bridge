"""Inlines the demo photos into each template, producing self-contained prototype files."""

import base64
import re
from pathlib import Path

HERE = Path(__file__).parent
ASSETS = HERE.parents[2] / "bunna_bridge/bunna_bridge/lots/management/commands/demo_assets"


def data_uri(match):
    name = f"{match.group(1)}.webp"
    own = HERE / "assets" / name  # photos supplied for this design
    raw = (own if own.exists() else ASSETS / name).read_bytes()
    return "data:image/webp;base64," + base64.b64encode(raw).decode()


PAGES = {
    "template.html": "premium-story-ethiopian-airlines-eset.html",
    "showcase-template.html": "landing-ethiopian-airlines-eset.html",
}
for src, dst in PAGES.items():
    html = re.sub(r"\{\{IMG:([a-z-]+)\}\}", data_uri, (HERE / src).read_text())
    out = HERE / dst
    out.write_text(html)
    print("wrote", out, f"{len(html) // 1024} KB")

# The live copy: served by the website at /demo/ethiopian-airlines/ (not linked or indexed).
PUBLISH = HERE.parents[2] / "bunna-bridge-frontend/public/demo/ethiopian-airlines/index.html"
PUBLISH.parent.mkdir(parents=True, exist_ok=True)
PUBLISH.write_text((HERE / "landing-ethiopian-airlines-eset.html").read_text())
print("wrote", PUBLISH)

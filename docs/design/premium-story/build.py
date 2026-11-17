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
    "landing-template.html": "landing-ethiopian-airlines-eset.html",
}
for src, dst in PAGES.items():
    html = re.sub(r"\{\{IMG:([a-z-]+)\}\}", data_uri, (HERE / src).read_text())
    out = HERE / dst
    out.write_text(html)
    print("wrote", out, f"{len(html) // 1024} KB")

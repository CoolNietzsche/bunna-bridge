"""Inlines the demo photos into template.html, producing one self-contained prototype file."""

import base64
import re
from pathlib import Path

HERE = Path(__file__).parent
ASSETS = HERE.parents[2] / "bunna_bridge/bunna_bridge/lots/management/commands/demo_assets"


def data_uri(match):
    raw = (ASSETS / f"{match.group(1)}.webp").read_bytes()
    return "data:image/webp;base64," + base64.b64encode(raw).decode()


html = re.sub(r"\{\{IMG:([a-z-]+)\}\}", data_uri, (HERE / "template.html").read_text())
out = HERE / "premium-story-ethiopian-airlines-eset.html"
out.write_text(html)
print("wrote", out, f"{len(html) // 1024} KB")

#!/usr/bin/env bash
# Converts a Markdown file to a Word document with the Beersheba letterhead and styles.
#   scripts/md-to-docx.sh path/to/file.md            -> path/to/file.docx
#   scripts/md-to-docx.sh path/to/file.md out.docx
# Needs pandoc (https://pandoc.org/installing.html). Works on a laptop; no Docker needed.
set -euo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
template="$here/docs/templates/beersheba-template.docx"
in="${1:?usage: md-to-docx.sh input.md [output.docx]}"
out="${2:-${in%.*}.docx}"
command -v pandoc >/dev/null || { echo "pandoc is not installed: see https://pandoc.org/installing.html" >&2; exit 1; }
# The first "# Heading" becomes the document title; the rest of the headings move up one level.
pandoc "$in" --from gfm --reference-doc="$template" --shift-heading-level-by=-1 \
  --lua-filter="$here/docs/templates/table-widths.lua" --resource-path="$(dirname "$in")" -o "$out"
echo "wrote $out"

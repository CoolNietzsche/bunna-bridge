"""Adds the "Table" table style (used by pandoc for Markdown tables) to beersheba-template.docx.

docx-js cannot write table styles, so this runs after build-template.js.
"""

import re
import shutil
import tempfile
import zipfile
from pathlib import Path

DOCX = Path(__file__).with_name("beersheba-template.docx")

TABLE_STYLE = (
    '<w:style w:type="table" w:default="1" w:styleId="Table">'
    '<w:name w:val="Table"/><w:basedOn w:val="TableNormal"/><w:uiPriority w:val="59"/><w:qFormat/>'
    '<w:pPr><w:spacing w:before="40" w:after="40" w:line="252" w:lineRule="auto"/></w:pPr>'
    '<w:rPr><w:sz w:val="19"/><w:szCs w:val="19"/></w:rPr>'
    '<w:tblPr><w:tblStyleRowBandSize w:val="1"/>'
    "<w:tblBorders>"
    '<w:top w:val="single" w:sz="4" w:space="0" w:color="D5DDD8"/>'
    '<w:bottom w:val="single" w:sz="4" w:space="0" w:color="D5DDD8"/>'
    '<w:insideH w:val="single" w:sz="4" w:space="0" w:color="D5DDD8"/>'
    "</w:tblBorders>"
    '<w:tblCellMar><w:top w:w="60" w:type="dxa"/><w:left w:w="110" w:type="dxa"/>'
    '<w:bottom w:w="60" w:type="dxa"/><w:right w:w="110" w:type="dxa"/></w:tblCellMar>'
    "</w:tblPr>"
    '<w:tblStylePr w:type="firstRow">'
    '<w:rPr><w:b/><w:bCs/><w:color w:val="125C3A"/></w:rPr>'
    "<w:tblPr/>"
    '<w:tcPr><w:tcBorders><w:bottom w:val="single" w:sz="8" w:space="0" w:color="1B7A4E"/></w:tcBorders>'
    '<w:shd w:val="clear" w:color="auto" w:fill="E9F5EE"/></w:tcPr>'
    "</w:tblStylePr>"
    "</w:style>"
)
TABLE_NORMAL = (
    '<w:style w:type="table" w:styleId="TableNormal"><w:name w:val="Normal Table"/>'
    '<w:uiPriority w:val="99"/><w:semiHidden/><w:unhideWhenUsed/>'
    '<w:tblPr><w:tblInd w:w="0" w:type="dxa"/><w:tblCellMar><w:top w:w="0" w:type="dxa"/>'
    '<w:left w:w="108" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="108" w:type="dxa"/>'
    "</w:tblCellMar></w:tblPr></w:style>"
)


def main():
    tmp = Path(tempfile.mkdtemp())
    out = tmp / "out.docx"
    with zipfile.ZipFile(DOCX) as src, zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as dst:
        for item in src.infolist():
            if item.filename.endswith("/"):
                continue
            data = src.read(item.filename)
            if item.filename == "word/styles.xml":
                xml = data.decode("utf-8")
                xml = re.sub(r'<w:style w:type="table"[^>]*w:styleId="(Table|TableNormal)".*?</w:style>', "", xml, flags=re.S)
                xml = xml.replace("</w:styles>", TABLE_NORMAL + TABLE_STYLE + "</w:styles>")
                data = xml.encode("utf-8")
            dst.writestr(item.filename, data)
    shutil.move(out, DOCX)
    print("added Table style to", DOCX)


if __name__ == "__main__":
    main()

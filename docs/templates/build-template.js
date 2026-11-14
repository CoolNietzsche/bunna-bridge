// Builds docs/templates/beersheba-template.docx: the Beersheba letterhead and styles.
// It is also a pandoc reference document, so any Markdown file can be converted with
//   scripts/md-to-docx.sh input.md [output.docx]
// Rebuild: node docs/templates/build-template.js   (then python3 docs/templates/add-table-style.py)
const fs = require("fs");
const path = require("path");
const {
  AlignmentType, BorderStyle, Document, Footer, Header, HeadingLevel, ImageRun, LevelFormat, Packer, PageNumber,
  Paragraph, ShadingType, Table,
  TableCell, TableRow, TabStopType, TextRun, WidthType,
} = require("docx");

const ROOT = path.resolve(__dirname, "../..");
const LOGO = fs.readFileSync(path.join(ROOT, "bunna-bridge-frontend/public/beersheba-logo.png"));
const C = { ink: "1D1D1F", green: "1B7A4E", greenDark: "125C3A", gold: "B8975A", muted: "6E6E73", wash: "E9F5EE", line: "D5DDD8" };
const SERIF = "Georgia";
const SANS = "Arial";

// Text width: A4 (11906) minus 2 x 1250 margins. Right-aligned text uses a tab stop there.
const TEXT_W = 9406;
const rightStop = [{ type: TabStopType.RIGHT, position: TEXT_W }];

// First page: the full letterhead.
const letterhead = new Header({
  children: [
    new Paragraph({
      tabStops: rightStop,
      children: [
        new ImageRun({ type: "png", data: LOGO, transformation: { width: 46, height: 46 } }),
        new TextRun({ text: "  Beersheba", font: SERIF, size: 40, bold: true, color: C.greenDark }),
        new TextRun({ children: ["\t", "Ethiopian specialty coffee"], font: SANS, size: 17, color: C.muted }),
      ],
    }),
    new Paragraph({
      tabStops: rightStop,
      spacing: { before: 0, after: 0 },
      children: [
        new TextRun({ text: "Traceable to the tree", font: SANS, size: 17, italics: true, color: C.gold }),
        new TextRun({ children: ["\t", "bunnabridge.pro.et  ·  Addis Ababa, Ethiopia"], font: SANS, size: 17, color: C.muted }),
      ],
      border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: C.gold, space: 6 } },
    }),
  ],
});

// Following pages: a quiet running header.
const runningHeader = new Header({
  children: [
    new Paragraph({
      tabStops: rightStop,
      border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: C.line, space: 4 } },
      children: [
        new ImageRun({ type: "png", data: LOGO, transformation: { width: 18, height: 18 } }),
        new TextRun({ text: "  Beersheba", font: SERIF, size: 20, bold: true, color: C.greenDark }),
        new TextRun({ children: ["\t", "Ethiopian specialty coffee, traceable to the tree"], font: SANS, size: 16, color: C.muted }),
      ],
    }),
  ],
});

const footer = new Footer({
  children: [
    new Paragraph({
      tabStops: rightStop,
      border: { top: { style: BorderStyle.SINGLE, size: 4, color: C.line, space: 4 } },
      children: [
        new TextRun({ text: "Beersheba  ·  bunnabridge.pro.et", font: SANS, size: 16, color: C.muted }),
        new TextRun({ text: "\tPage ", font: SANS, size: 16, color: C.muted }),
        new TextRun({ children: [PageNumber.CURRENT], font: SANS, size: 16, color: C.muted }),
        new TextRun({ text: " of ", font: SANS, size: 16, color: C.muted }),
        new TextRun({ children: [PageNumber.TOTAL_PAGES], font: SANS, size: 16, color: C.muted }),
      ],
    }),
  ],
});

const heading = (size, color, before, after, extra = {}) => ({
  run: { font: SERIF, size, bold: true, color, ...extra.run },
  paragraph: { spacing: { before, after }, keepNext: true, keepLines: true, ...extra.paragraph },
});

// Style IDs match what pandoc writes, so converted Markdown picks them up.
const paragraphStyles = [
  { id: "BodyText", name: "Body Text", basedOn: "Normal", next: "BodyText", quickFormat: true, paragraph: { spacing: { before: 0, after: 140 } } },
  { id: "FirstParagraph", name: "First Paragraph", basedOn: "BodyText", next: "BodyText", quickFormat: true },
  { id: "Compact", name: "Compact", basedOn: "BodyText", quickFormat: true, paragraph: { spacing: { before: 0, after: 60 } } },
  { id: "Subtitle", name: "Subtitle", basedOn: "Normal", next: "BodyText", quickFormat: true, run: { font: SANS, size: 24, color: C.muted }, paragraph: { spacing: { before: 0, after: 280 } } },
  { id: "Author", name: "Author", basedOn: "Normal", next: "BodyText", run: { font: SANS, size: 20, color: C.muted }, paragraph: { spacing: { before: 0, after: 40 } } },
  { id: "Date", name: "Date", basedOn: "Normal", next: "BodyText", run: { font: SANS, size: 20, color: C.muted }, paragraph: { spacing: { before: 0, after: 240 } } },
  { id: "BlockText", name: "Block Text", basedOn: "BodyText", quickFormat: true,
    run: { font: SERIF, italics: true, size: 22, color: C.greenDark },
    paragraph: { indent: { left: 360 }, spacing: { before: 120, after: 160 }, border: { left: { style: BorderStyle.SINGLE, size: 18, color: C.gold, space: 10 } } } },
  { id: "Caption", name: "Caption", basedOn: "Normal", run: { size: 17, italics: true, color: C.muted }, paragraph: { spacing: { before: 60, after: 160 } } },
  { id: "TableCaption", name: "Table Caption", basedOn: "Caption" },
  { id: "ImageCaption", name: "Image Caption", basedOn: "Caption" },
];

const doc = new Document({
  creator: "Beersheba",
  title: "Beersheba document template",
  description: "Letterhead and styles; also the pandoc reference document for Markdown conversion.",
  styles: {
    default: {
      document: { run: { font: SANS, size: 21, color: C.ink }, paragraph: { spacing: { line: 288, lineRule: "auto" } } },
      title: heading(48, C.greenDark, 0, 80, { run: { bold: false }, paragraph: { spacing: { before: 0, after: 80, line: 250, lineRule: "auto" } } }),
      heading1: heading(32, C.greenDark, 360, 140, { paragraph: { border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: C.gold, space: 4 } } } }),
      heading2: heading(26, C.green, 280, 100),
      heading3: heading(22, C.ink, 220, 80, { run: { font: SANS } }),
      heading4: heading(20, C.muted, 180, 60, { run: { font: SANS, allCaps: true } }),
      hyperlink: { run: { color: C.green, underline: { type: "single", color: C.green } } },
    },
    paragraphStyles,
    characterStyles: [
      { id: "VerbatimChar", name: "Verbatim Char", run: { font: "Consolas", size: 19, color: C.greenDark } },
    ],
  },
  numbering: { config: [{ reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 400, hanging: 240 } }, run: { color: C.green } } }] }] },
  sections: [{
    properties: {
      titlePage: true,
      page: { size: { width: 11906, height: 16838 }, margin: { top: 1650, bottom: 1300, left: 1250, right: 1250, header: 560, footer: 560 } },
    },
    headers: { first: letterhead, default: runningHeader },
    footers: { first: footer, default: footer },
    children: sampleBody(),
  }],
});

// What the template shows when opened directly: every style, in use.
function sampleBody() {
  const p = (text, style = "BodyText") => new Paragraph({ style, children: [new TextRun(text)] });
  const cell = (text, header, w) => new TableCell({
    width: { size: w, type: WidthType.DXA },
    shading: header ? { type: ShadingType.CLEAR, fill: C.wash, color: "auto" } : undefined,
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [new Paragraph({ children: [new TextRun({ text, bold: header, color: header ? C.greenDark : C.ink, size: 19 })] })],
  });
  const widths = [2400, 4000, 3006];
  const row = (cells, header = false) => new TableRow({ tableHeader: header, children: cells.map((t, i) => cell(t, header, widths[i])) });
  const b = { style: BorderStyle.SINGLE, size: 4, color: C.line };
  return [
    new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun("Document title")] }),
    p("A one-line subtitle that says what this document is for", "Subtitle"),
    new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("Heading 1: a main section")] }),
    p("Body text is set in Arial at 10.5 points, with headings in Georgia and Beersheba green. This page shows each style; when a Markdown file is converted with this template, the same styles are applied automatically.", "FirstParagraph"),
    p("A second paragraph uses the normal body style, with space after it rather than an indent."),
    new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Heading 2: a subsection")] }),
    new Paragraph({ numbering: { reference: "bullets", level: 0 }, style: "Compact", children: [new TextRun("A bulleted list item")] }),
    new Paragraph({ numbering: { reference: "bullets", level: 0 }, style: "Compact", children: [new TextRun("Another item, with a "), new TextRun({ text: "bold phrase", bold: true })] }),
    new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun("Heading 3: a smaller heading")] }),
    new Table({
      width: { size: TEXT_W, type: WidthType.DXA },
      columnWidths: widths,
      borders: { top: b, bottom: b, left: b, right: b, insideHorizontal: b, insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" } },
      rows: [row(["Lot", "Origin", "Status"], true), row(["SDM-2026-0213", "Bensa, Sidama", "Listed"]), row(["GUJ-2026-0311", "Hambela, Guji", "Contracted"])],
    }),
    p("Table caption: tables get a green header row and light rules.", "TableCaption"),
    new Paragraph({ style: "BlockText", children: [new TextRun("A quotation or key statement is set as block text, in green italic with a gold rule.")] }),
    new Paragraph({ heading: HeadingLevel.HEADING_4, children: [new TextRun("Heading 4: a label")] }),
    p("Every page after the first carries a small running header; every page shows the page number in the footer."),
  ];
}

Packer.toBuffer(doc).then((buf) => {
  const out = path.join(__dirname, "beersheba-template.docx");
  fs.writeFileSync(out, buf);
  console.log("wrote", out);
});

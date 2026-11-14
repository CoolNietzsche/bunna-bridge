# Beersheba document template

`beersheba-template.docx` is the Beersheba letterhead and house style for Word documents:

- first page: the full letterhead (logo, name, tagline, web address, gold rule);
- later pages: a small running header;
- every page: a footer with the page number;
- Georgia headings in Beersheba green, Arial body text, and tables with a green header row.

## Writing a letter or document in Word

Open `beersheba-template.docx`, delete the sample text and write. Use the style list
(Title, Subtitle, Heading 1–4, Body Text, Block Text) rather than formatting by hand.

## Turning a Markdown file into a styled Word document

```bash
scripts/md-to-docx.sh docs/knowledge-base/15-pilot-guji-hambela.md
# -> docs/knowledge-base/15-pilot-guji-hambela.docx
```

This needs [pandoc](https://pandoc.org/installing.html). The first `# Heading` becomes the document
title, and tables are widened to the page with column widths that follow their content
(`table-widths.lua`). The other route is to ask Claude in chat to convert the file.

## Changing the design

Edit `build-template.js` (colours, fonts, header text), then rebuild:

```bash
node docs/templates/build-template.js && python3 docs/templates/add-table-style.py
```

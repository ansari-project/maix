# Outward-Facing Documentation

This folder contains externally consumable documentation about Maix.

## Files

- `maix-product-vision.md` - Comprehensive product vision document describing Maix's AI-powered tools suite
- `pitch_deck.md` - Marp-formatted presentation deck for pitches and presentations

## Converting to PDF

The markdown files can be converted to PDF using several methods:

### Option 1: Pandoc (Recommended)
```bash
# Basic conversion (may have issues with Unicode characters)
pandoc maix-product-vision.md -o maix-product-vision.pdf

# With table of contents
pandoc maix-product-vision.md -o maix-product-vision.pdf --toc --toc-depth=2
```

### Option 2: VS Code Extension
1. Install "Markdown PDF" extension in VS Code
2. Open the markdown file
3. Right-click → "Markdown PDF: Export (pdf)"

### Option 3: Online Converters
- Upload to markdown-pdf.com
- Use GitHub's built-in markdown rendering and print to PDF
- Typora (markdown editor) → Export → PDF

### Option 4: Google Docs (Recommended for collaboration)
1. Install "Docs to Markdown" or similar Chrome extension
2. Copy the markdown content
3. Paste into Google Docs (extension will convert formatting automatically)
4. Perfect for sharing, collaboration, and PDF export

### Option 5: Print from Browser
1. Open the markdown file in any markdown viewer
2. Use browser's "Print to PDF" option

## Usage

These documents are designed for:
- External research and due diligence
- Investor presentations
- Partnership discussions
- Public communication about Maix's mission and capabilities
/**
 * Builds a small PDF from sanitized document HTML.
 * Only the tags Folio stores are understood. Standard PDF fonts avoid a native renderer.
 */

type Span = { text: string; bold: boolean; italic: boolean };
type Block =
  | { kind: "h1" | "h2" | "h3" | "p" | "quote"; spans: Span[] }
  | { kind: "li"; marker: string; spans: Span[] };

function decode(text: string): string {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

function pdfString(value: string): string {
  const safe = Array.from(value)
    .map((char) => {
      const code = char.charCodeAt(0);
      if (code === 9) return " ";
      if (code >= 32 && code <= 126) return char;
      return "?";
    })
    .join("");
  return safe.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function parseBlocks(html: string): Block[] {
  const tokens = html.match(/<\/?[^>]+>|[^<]+/g) ?? [];
  const blocks: Block[] = [];
  let spans: Span[] = [];
  let bold = false;
  let italic = false;
  let block: "p" | "h1" | "h2" | "h3" | "quote" | null = null;
  let list: { ordered: boolean; index: number } | null = null;
  let inItem = false;

  function flushText(raw: string) {
    const text = decode(raw).replace(/\s+/g, " ");
    if (!text.trim()) return;
    spans.push({ text, bold, italic });
  }

  function closeBlock() {
    if (spans.length === 0) {
      block = null;
      inItem = false;
      return;
    }
    if (inItem) {
      const marker = list?.ordered ? `${list.index}. ` : "• ";
      if (list?.ordered) list.index += 1;
      blocks.push({ kind: "li", marker, spans });
    } else if (block === "h1" || block === "h2" || block === "h3" || block === "quote") {
      blocks.push({ kind: block, spans });
    } else {
      blocks.push({ kind: "p", spans });
    }
    spans = [];
    block = null;
    inItem = false;
  }

  for (const token of tokens) {
    if (!token.startsWith("<")) {
      if (block || inItem) flushText(token);
      continue;
    }
    const tag = token.toLowerCase();
    if (tag.startsWith("<strong") || tag.startsWith("<b")) bold = true;
    else if (tag.startsWith("</strong") || tag.startsWith("</b")) bold = false;
    else if (tag.startsWith("<em") || tag.startsWith("<i")) italic = true;
    else if (tag.startsWith("</em") || tag.startsWith("</i")) italic = false;
    else if (tag.startsWith("<ul")) list = { ordered: false, index: 1 };
    else if (tag.startsWith("<ol")) list = { ordered: true, index: 1 };
    else if (tag.startsWith("</ul") || tag.startsWith("</ol")) list = null;
    else if (tag.startsWith("<li")) {
      closeBlock();
      inItem = true;
    } else if (tag.startsWith("</li")) closeBlock();
    else if (tag.startsWith("<h1")) {
      closeBlock();
      block = "h1";
    } else if (tag.startsWith("<h2")) {
      closeBlock();
      block = "h2";
    } else if (tag.startsWith("<h3")) {
      closeBlock();
      block = "h3";
    } else if (tag.startsWith("<blockquote")) {
      closeBlock();
      block = "quote";
    } else if (tag.startsWith("<p") || tag.startsWith("<br")) {
      if (tag.startsWith("<br") && (block || inItem)) {
        spans.push({ text: "\n", bold, italic });
        continue;
      }
      closeBlock();
      if (!inItem) block = "p";
    } else if (tag.startsWith("</h") || tag.startsWith("</p") || tag.startsWith("</blockquote")) {
      closeBlock();
    }
  }
  closeBlock();
  return blocks;
}

function fontName(span: Span): string {
  if (span.bold && span.italic) return "F4";
  if (span.bold) return "F2";
  if (span.italic) return "F3";
  return "F1";
}

function wrap(spans: Span[], maxWidth: number, fontSize: number): Span[][] {
  const widthOf = (text: string) => text.length * fontSize * 0.5;
  const lines: Span[][] = [];
  let line: Span[] = [];
  let used = 0;

  for (const span of spans) {
    const parts = span.text.split("\n");
    parts.forEach((part, index) => {
      if (index > 0 && line.length > 0) {
        lines.push(line);
        line = [];
        used = 0;
      }
      const words = part.split(/(\s+)/).filter((word) => word.length > 0);
      for (const word of words) {
        const wordWidth = widthOf(word);
        if (used + wordWidth > maxWidth && word.trim() && line.length > 0) {
          lines.push(line);
          line = [];
          used = 0;
        }
        line.push({ ...span, text: word });
        used += wordWidth;
      }
    });
  }
  if (line.length > 0) lines.push(line);
  return lines.length > 0 ? lines : [[{ text: "", bold: false, italic: false }]];
}

function drawLine(spans: Span[], x: number, y: number, fontSize: number): string {
  let cursor = x;
  let commands = "";
  for (const span of spans) {
    if (!span.text) continue;
    commands += `BT /${fontName(span)} ${fontSize} Tf 1 0 0 1 ${cursor.toFixed(2)} ${y.toFixed(2)} Tm (${pdfString(span.text)}) Tj ET\n`;
    cursor += span.text.length * fontSize * 0.5;
  }
  return commands;
}

export function pdfFilename(title: string): string {
  const slug = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return `${slug || "document"}.pdf`;
}

export function htmlToPdf(title: string, html: string): Uint8Array {
  const blocks = parseBlocks(html);
  const pages: string[] = [];
  let stream = "";
  let y = 740;

  function nextPage() {
    pages.push(stream);
    stream = "";
    y = 740;
  }

  function ensure(height: number) {
    if (y - height < 54) nextPage();
  }

  ensure(28);
  stream += drawLine([{ text: title || "Untitled document", bold: true, italic: false }], 54, y, 20);
  y -= 30;

  if (blocks.length === 0) {
    stream += drawLine([{ text: "Empty document", bold: false, italic: true }], 54, y, 11);
    y -= 16;
  }

  for (const block of blocks) {
    const fontSize = block.kind === "h1" ? 18 : block.kind === "h2" ? 15 : block.kind === "h3" ? 13 : 11;
    const indent = block.kind === "quote" ? 72 : block.kind === "li" ? 70 : 54;
    const spans =
      block.kind === "li"
        ? [{ text: block.marker, bold: false, italic: false }, ...block.spans]
        : block.kind === "h1" || block.kind === "h2" || block.kind === "h3"
          ? block.spans.map((span) => ({ ...span, bold: true }))
          : block.kind === "quote"
            ? block.spans.map((span) => ({ ...span, italic: true }))
            : block.spans;
    const lines = wrap(spans, 500 - (indent - 54), fontSize);
    for (const line of lines) {
      ensure(fontSize + 6);
      stream += drawLine(line, indent, y, fontSize);
      y -= fontSize + 6;
    }
    y -= block.kind === "p" || block.kind === "li" ? 6 : 10;
  }

  pages.push(stream);

  const fontObjects = [
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-BoldOblique >>",
  ];

  const objects: string[] = ["<< /Type /Catalog /Pages 2 0 R >>"];
  const pageObjectNumbers: number[] = [];
  const contentObjectNumbers: number[] = [];
  // Objects: 1 catalog, 2 pages, 3-6 fonts, then page/content pairs.
  let nextId = 7;
  for (let index = 0; index < pages.length; index += 1) {
    pageObjectNumbers.push(nextId);
    contentObjectNumbers.push(nextId + 1);
    nextId += 2;
  }

  objects.push(
    `<< /Type /Pages /Kids [${pageObjectNumbers.map((id) => `${id} 0 R`).join(" ")}] /Count ${pages.length} >>`,
  );
  for (const font of fontObjects) objects.push(font);

  pages.forEach((page, index) => {
    const pageId = pageObjectNumbers[index];
    const contentId = contentObjectNumbers[index];
    objects[pageId - 1] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${contentId} 0 R /Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R /F4 6 0 R >> >> >>`;
    const body = page.endsWith("\n") ? page : `${page}\n`;
    objects[contentId - 1] = `<< /Length ${Buffer.byteLength(body, "latin1")} >>\nstream\n${body}endstream`;
  });

  // The sparse assignment above left holes. Fill in order.
  const ordered: string[] = [];
  for (let id = 1; id < nextId; id += 1) {
    const source = objects[id - 1];
    if (!source) throw new Error("PDF object was not written.");
    ordered.push(`${id} 0 obj\n${source}\nendobj\n`);
  }

  let output = "%PDF-1.4\n";
  const offsets = [0];
  for (const object of ordered) {
    offsets.push(Buffer.byteLength(output, "latin1"));
    output += object;
  }
  const xrefAt = Buffer.byteLength(output, "latin1");
  output += `xref\n0 ${ordered.length + 1}\n`;
  output += "0000000000 65535 f \n";
  for (let index = 1; index <= ordered.length; index += 1) {
    output += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }
  output += `trailer << /Size ${ordered.length + 1} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`;
  return Uint8Array.from(Buffer.from(output, "latin1"));
}

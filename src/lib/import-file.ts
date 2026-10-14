import JSZip from "jszip";
import mammoth from "mammoth";
import { marked } from "marked";
import { sanitizeDocumentHtml } from "@/lib/html";

export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;

const SUPPORTED = new Set([".txt", ".md", ".markdown", ".docx"]);

export class ImportError extends Error {
  readonly status = 400;

  constructor(message: string) {
    super(message);
    this.name = "ImportError";
  }
}

export function fileExtension(filename: string): string {
  const base = filename.replace(/^.*[/\\]/, "").toLowerCase();
  const dot = base.lastIndexOf(".");
  return dot === -1 ? "" : base.slice(dot);
}

export function titleFromFilename(filename: string): string {
  const base = filename.replace(/^.*[/\\]/, "").replace(/\.[^.]+$/, "");
  const cleaned = base.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  return cleaned.slice(0, 120) || "Imported document";
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Plain text becomes paragraphs, split on blank lines.
 * Characters are escaped first so a .txt file cannot smuggle HTML.
 */
export function textFileToHtml(text: string): string {
  const normalized = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  if (!normalized) {
    throw new ImportError("That file did not contain readable text.");
  }

  return normalized
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${paragraph.split("\n").map(escapeHtml).join("<br>")}</p>`)
    .join("");
}

/** Imported HTML is reduced to the same tags the editor knows how to round-trip. */
export function normalizeImportedHtml(html: string): string {
  const prepared = html.replace(/<(td|th)(\s[^>]*)?>\s*<\/\1>/gi, "<$1$2><p></p></$1>");
  const clean = sanitizeDocumentHtml(prepared);
  const text = clean.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim();
  const hasPicture = /<img\b/i.test(clean);
  const hasTable = /<table\b/i.test(clean);
  if (!text && !hasPicture && !hasTable) {
    throw new ImportError("That file did not contain readable text.");
  }
  return clean;
}

function relationshipIds(xml: string): Set<string> {
  return new Set([...xml.matchAll(/\bId="([^"]+)"/g)].map((match) => match[1]));
}

const PAGE_TOKEN = "FOLIO_PAGE_BREAK";

const DRAWING_NAMESPACES: Array<[string, string]> = [
  ["r", "http://schemas.openxmlformats.org/officeDocument/2006/relationships"],
  ["wp", "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"],
  ["a", "http://schemas.openxmlformats.org/drawingml/2006/main"],
  ["pic", "http://schemas.openxmlformats.org/drawingml/2006/picture"],
];

function withDrawingNamespaces(documentXml: string): string {
  return documentXml.replace(/<w:document\b([^>]*)>/i, (_open, attrs: string) => {
    let next = attrs;
    for (const [prefix, uri] of DRAWING_NAMESPACES) {
      if (!next.includes(`xmlns:${prefix}=`)) next += ` xmlns:${prefix}="${uri}"`;
    }
    return `<w:document${next}>`;
  });
}

/** A page break becomes text inside the same run, so the surrounding XML stays valid. */
function markPageBreaks(xml: string): string {
  return xml
    .replace(/<w:lastRenderedPageBreak\s*\/>/g, pageTokenRun())
    .replace(/<w:lastRenderedPageBreak\s*>\s*<\/w:lastRenderedPageBreak>/g, pageTokenRun())
    .replace(/<w:br\b[^>]*\bw:type="page"[^>]*\/>/g, pageTokenRun())
    .replace(/<w:br\b[^>]*\bw:type="page"[^>]*>\s*<\/w:br>/g, pageTokenRun());
}

function pageTokenRun(): string {
  return `<w:t xml:space="preserve">${PAGE_TOKEN}</w:t>`;
}

/** A next-page section break is the start of the following sheet. */
function markSectionBreaks(xml: string): string {
  return xml.replace(/<w:p\b[^>]*>[\s\S]*?<\/w:p>/g, (paragraph) => {
    const section = paragraph.match(/<w:sectPr\b[\s\S]*?<\/w:sectPr>/i)?.[0] ?? "";
    if (!section) return paragraph;
    const nextPage = /<w:type\b[^>]*w:val="(?:nextPage|oddPage|evenPage)"/i.test(section);
    const without = paragraph.replace(/<w:sectPr\b[\s\S]*?<\/w:sectPr>/i, "");
    if (!nextPage) return without;
    return `${without}<w:p><w:r><w:t xml:space="preserve">${PAGE_TOKEN}</w:t></w:r></w:p>`;
  });
}

function markCenteredParagraphs(xml: string): string {
  return xml.replace(/<w:p\b[\s\S]*?<\/w:p>/g, (paragraph) => {
    if (!/<w:jc\b[^>]*w:val="center"/i.test(paragraph)) return paragraph;
    if (paragraph.includes("FOLIO_ALIGN_CENTER")) return paragraph;
    return paragraph.replace(/<w:p\b[^>]*>/i, (open) => `${open}<w:r><w:t>FOLIO_ALIGN_CENTER</w:t></w:r>`);
  });
}

function textBoxMarkup(inner: string, inCell: boolean): string {
  if (!inCell) {
    if (/<w:tbl\b/i.test(inner)) return inner;
    return `<w:tbl><w:tr><w:tc>${inner}</w:tc></w:tr></w:tbl>`;
  }
  if (!/<w:tbl\b/i.test(inner)) return inner;
  return [...inner.matchAll(/<w:tr\b[\s\S]*?<\/w:tr>/gi)]
    .map((row) => {
      const text = [...row[0].matchAll(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/gi)].map((cell) => cell[1]).join(" ").trim();
      return text ? `<w:p><w:r><w:t xml:space="preserve">${text}</w:t></w:r></w:p>` : "";
    })
    .join("");
}

/**
 * Word saves each floating weight box twice: once as a drawing and once as a
 * fallback picture. Keep the first copy and drop the duplicate.
 */
function collapseTextBoxAlternates(xml: string): string {
  return xml.replace(/<mc:AlternateContent\b[\s\S]*?<\/mc:AlternateContent>/gi, (block) => {
    if (!/<w:txbxContent\b/i.test(block)) return block;
    const inner = block.match(/<w:txbxContent\b[^>]*>([\s\S]*?)<\/w:txbxContent>/i)?.[1] ?? "";
    if (!inner.trim()) return "";
    return textBoxMarkup(inner, false);
  });
}

function insideCell(xml: string, index: number): boolean {
  const before = xml.slice(0, index);
  const opens = before.match(/<w:tc\b/g)?.length ?? 0;
  const closes = before.match(/<\/w:tc>/g)?.length ?? 0;
  return opens > closes;
}

/**
 * A weight box is often a text box anchored in the cell beside the title.
 * Lift that box into the same cell, or just after its paragraph, and leave
 * every other drawing alone.
 */
function hoistTextBoxes(xml: string): string {
  const source = collapseTextBoxAlternates(xml);
  const drawingRe = /<w:(drawing|pict)\b[\s\S]*?<\/w:\1>/g;
  let cursor = 0;
  let out = "";
  for (const match of source.matchAll(drawingRe)) {
    const index = match.index ?? 0;
    if (index < cursor) continue;
    if (!/<w:txbxContent\b/i.test(match[0])) continue;

    const after = index + match[0].length;
    const rest = source.slice(after);
    const inCell = insideCell(source, index);
    const cellClose = rest.search(/<\/w:tc>/i);
    const paragraphClose = rest.search(/<\/w:p>/i);
    const insertAt = after + (inCell && cellClose !== -1 ? cellClose : paragraphClose === -1 ? 0 : paragraphClose + "</w:p>".length);
    const region = source.slice(index, insertAt);
    const tables = [...region.matchAll(/<w:txbxContent\b[^>]*>([\s\S]*?)<\/w:txbxContent>/gi)].map((box) =>
      textBoxMarkup(box[1] ?? "", inCell),
    );
    const kept = region.replace(/<w:(drawing|pict)\b[\s\S]*?<\/w:\1>/g, (drawing) =>
      /<w:txbxContent\b/i.test(drawing) ? "" : drawing,
    );
    out += source.slice(cursor, index);
    out += kept;
    out += tables.join("");
    cursor = insertAt;
  }
  out += source.slice(cursor);
  return out;
}

function headerInnerXml(headerXml: string): string {
  const start = headerXml.search(/<w:hdr\b[^>]*>/i);
  const end = headerXml.search(/<\/w:hdr>/i);
  if (start === -1 || end === -1) return "";
  return headerXml.slice(headerXml.indexOf(">", start) + 1, end);
}

/**
 * Word stores the logo and the title band in the page header, which the
 * body converter does not read. Picture relationships are copied onto the
 * document so each page can repeat that header.
 */
async function loadDocumentParts(bytes: Buffer): Promise<{
  zip: JSZip;
  headerXml: string;
  bodyXml: string;
  rawBodyXml: string;
}> {
  const zip = await JSZip.loadAsync(bytes);
  const documentFile = zip.file("word/document.xml");
  const relsFile = zip.file("word/_rels/document.xml.rels");
  if (!documentFile || !relsFile) {
    return { zip, headerXml: "", bodyXml: "", rawBodyXml: "" };
  }

  const documentXml = await documentFile.async("string");
  let relsXml = await relsFile.async("string");
  const usedIds = relationshipIds(relsXml);
  const headerNames = Object.keys(zip.files)
    .filter((name) => /^word\/header\d+\.xml$/i.test(name))
    .sort();
  let headerXml = "";

  for (const headerName of headerNames) {
    const headerFile = zip.file(headerName);
    if (!headerFile) continue;
    let inner = headerInnerXml(await headerFile.async("string"));
    if (!inner) continue;

    const relName = `word/_rels/${headerName.slice("word/".length)}.rels`;
    const headerRels = zip.file(relName);
    if (headerRels) {
      const headerRelXml = await headerRels.async("string");
      const relationships = [...headerRelXml.matchAll(/<Relationship\b[^>]*\/>/g)].map((match) => match[0]);
      for (const relationship of relationships) {
        const id = relationship.match(/\bId="([^"]+)"/)?.[1];
        if (!id) continue;
        let nextId = id;
        if (usedIds.has(nextId)) {
          let suffix = 1;
          while (usedIds.has(`${id}h${suffix}`)) suffix += 1;
          nextId = `${id}h${suffix}`;
          inner = inner.replaceAll(`r:embed="${id}"`, `r:embed="${nextId}"`);
          inner = inner.replaceAll(`r:id="${id}"`, `r:id="${nextId}"`);
        }
        usedIds.add(nextId);
        const rewritten = relationship.replace(`Id="${id}"`, `Id="${nextId}"`);
        if (!relsXml.includes(rewritten)) {
          relsXml = relsXml.replace("</Relationships>", `${rewritten}</Relationships>`);
        }
      }
    }
    headerXml += hoistTextBoxes(inner);
  }

  const bodyMatch = documentXml.match(/<w:body\b[^>]*>([\s\S]*)<\/w:body>/i);
  const bodyInner = bodyMatch?.[1] ?? "";
  const rawBodyXml = bodyInner.replace(/<w:sectPr\b[\s\S]*?<\/w:sectPr>/gi, "");
  const withBreaks = markSectionBreaks(bodyInner).replace(/<w:sectPr\b[\s\S]*?<\/w:sectPr>/gi, "");
  const bodyXml = markPageBreaks(hoistTextBoxes(withBreaks));
  zip.file("word/_rels/document.xml.rels", relsXml);
  zip.file("word/document.xml", withDrawingNamespaces(documentXml));
  return { zip, headerXml, bodyXml, rawBodyXml };
}

function visibleTextLength(html: string): number {
  return html.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim().length;
}

async function convertFragment(zip: JSZip, fragmentXml: string): Promise<string> {
  const clone = await JSZip.loadAsync(await zip.generateAsync({ type: "nodebuffer" }));
  const documentFile = clone.file("word/document.xml");
  if (!documentFile || !fragmentXml.trim()) return "";
  const prepared = markCenteredParagraphs(fragmentXml);
  let documentXml = withDrawingNamespaces(await documentFile.async("string"));
  documentXml = documentXml.replace(
    /<w:body\b[^>]*>[\s\S]*<\/w:body>/i,
    `<w:body>${prepared}</w:body>`,
  );
  clone.file("word/document.xml", documentXml);
  const buffer = Buffer.from(await clone.generateAsync({ type: "nodebuffer" }));
  const result = await mammoth.convertToHtml({ buffer }, { convertImage: mammoth.images.dataUri });
  return result.value;
}

function applyAlignmentMarkers(html: string): string {
  return html
    .replace(/<p\b[^>]*>\s*FOLIO_ALIGN_CENTER/gi, (open) => {
      const tag = open.replace(/\s*FOLIO_ALIGN_CENTER/i, "");
      if (/style="/i.test(tag)) return tag;
      return tag.replace(/<p\b/i, '<p style="text-align:center"');
    })
    .replace(/FOLIO_ALIGN_CENTER/g, "");
}

function isSideBox(block: string): boolean {
  if (!/^<table\b/i.test(block.trim())) return false;
  const rows = block.match(/<tr\b/gi)?.length ?? 0;
  const cells = block.match(/<t[dh]\b/gi)?.length ?? 0;
  if (rows !== 1 || cells !== 1) return false;
  const text = block.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
  return text.length > 0 && text.length < 500;
}

function sideBoxInner(table: string): string {
  return table.match(/<td\b[^>]*>([\s\S]*?)<\/td>/i)?.[1] ?? "";
}

function isEmptyParagraph(block: string): boolean {
  return /^<p\b[^>]*>\s*<\/p>$/i.test(block.trim());
}

/** Puts a weight box on the right of the section line that follows it. */
function attachSideBoxes(html: string): string {
  const pattern = /<table\b[^>]*>[\s\S]*?<\/table>|<p\b[^>]*>[\s\S]*?<\/p>/gi;
  const parts: string[] = [];
  let last = 0;
  for (const match of html.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > last) parts.push(html.slice(last, index));
    parts.push(match[0]);
    last = index + match[0].length;
  }
  parts.push(html.slice(last));

  const out: string[] = [];
  for (let i = 0; i < parts.length; i += 1) {
    if (!isSideBox(parts[i] ?? "")) {
      out.push(parts[i] ?? "");
      continue;
    }
    const boxes = [parts[i] ?? ""];
    let j = i + 1;
    const skipGap = () => {
      while (j < parts.length && (/^\s*$/.test(parts[j] ?? "") || isEmptyParagraph(parts[j] ?? ""))) j += 1;
    };
    skipGap();
    while (j < parts.length && isSideBox(parts[j] ?? "")) {
      boxes.push(parts[j] ?? "");
      j += 1;
      skipGap();
    }
    if (j < parts.length && /^<p\b/i.test(parts[j] ?? "") && !isEmptyParagraph(parts[j] ?? "")) {
      const right = boxes.map(sideBoxInner).join("");
      out.push(
        `<table><tr><td colwidth="640">${parts[j]}</td><td colwidth="260">${right}</td></tr></table>`,
      );
      i = j;
      continue;
    }
    out.push(parts[i] ?? "");
  }
  return out.join("");
}

/** Puts the repeating header on every page and keeps the page gaps. */
export function composeDocumentHtml(headerHtml: string, bodyHtml: string): string {
  const header = applyAlignmentMarkers(headerHtml);
  let marked = applyAlignmentMarkers(bodyHtml);
  marked = marked.replace(/<p\b[^>]*>\s*FOLIO_PAGE_BREAK\s*<\/p>/gi, '<div data-page-break="true"></div>');
  marked = marked.replace(/<table\b[^>]*>[\s\S]*?<\/table>/gi, (table) => {
    const text = table.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trimStart();
    if (!text.startsWith("FOLIO_PAGE_BREAK")) return table;
    return `<div data-page-break="true"></div>${table.replace(/FOLIO_PAGE_BREAK/g, "")}`;
  });
  marked = marked.replace(/<p\b[^>]*>\s*FOLIO_PAGE_BREAK/gi, (open) => {
    const tag = open.replace(/\s*FOLIO_PAGE_BREAK/i, "");
    return `<div data-page-break="true"></div>${tag}`;
  });
  marked = marked
    .replace(/FOLIO_PAGE_BREAK/g, "")
    .replace(/(?:<div data-page-break="true"><\/div>\s*){2,}/g, '<div data-page-break="true"></div>');
  const pages = marked.split(/<div data-page-break="true"><\/div>/i);
  const pieces = pages.length > 0 ? pages : [""];
  return pieces.map((page) => `${header}${page}`).join('<div data-page-break="true"></div>');
}

export async function markdownFileToHtml(markdown: string): Promise<string> {
  if (!markdown.trim()) {
    throw new ImportError("That file did not contain readable text.");
  }
  const rendered = await marked.parse(markdown, { async: true, gfm: true });
  return normalizeImportedHtml(rendered);
}

export async function docxFileToHtml(bytes: Buffer): Promise<string> {
  if (bytes.length < 4 || bytes[0] !== 0x50 || bytes[1] !== 0x4b) {
    throw new ImportError("That .docx file does not look like a Word document.");
  }
  const { zip, headerXml, bodyXml, rawBodyXml } = await loadDocumentParts(bytes);
  const headerHtml = await convertFragment(zip, headerXml);
  const rawHtml = await convertFragment(zip, rawBodyXml);
  let bodyHtml = "";
  try {
    bodyHtml = await convertFragment(zip, bodyXml);
  } catch {
    bodyHtml = rawHtml;
  }
  if (visibleTextLength(bodyHtml) < visibleTextLength(rawHtml) * 0.8) {
    bodyHtml = rawHtml;
  }
  return attachSideBoxes(normalizeImportedHtml(composeDocumentHtml(headerHtml, bodyHtml)));
}

export async function fileToHtml(filename: string, bytes: Buffer): Promise<string> {
  if (bytes.length === 0) {
    throw new ImportError("That file is empty.");
  }
  if (bytes.length > MAX_UPLOAD_BYTES) {
    throw new ImportError("Files must be 2 MB or smaller.");
  }

  const extension = fileExtension(filename);
  if (!SUPPORTED.has(extension)) {
    throw new ImportError("Import a .txt, .md, or .docx file.");
  }

  if (extension === ".txt") return textFileToHtml(bytes.toString("utf8"));
  if (extension === ".md" || extension === ".markdown") {
    return markdownFileToHtml(bytes.toString("utf8"));
  }
  return docxFileToHtml(bytes);
}

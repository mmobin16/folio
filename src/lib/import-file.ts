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
  const clean = sanitizeDocumentHtml(html);
  const text = clean.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim();
  if (!text) {
    throw new ImportError("That file did not contain readable text.");
  }
  return clean;
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
  const result = await mammoth.convertToHtml({ buffer: bytes });
  return normalizeImportedHtml(result.value);
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

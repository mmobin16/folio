import { safeImageSrc } from "@/lib/html";
import { DocumentError } from "@/server/errors";

const NODE_TYPES = new Set([
  "doc",
  "paragraph",
  "heading",
  "text",
  "bulletList",
  "orderedList",
  "listItem",
  "blockquote",
  "hardBreak",
  "horizontalRule",
  "codeBlock",
  "code",
  "table",
  "tableRow",
  "tableCell",
  "tableHeader",
  "image",
  "pageBreak",
  "chart",
]);

const MARK_TYPES = new Set(["bold", "italic", "underline", "strike", "code", "link"]);

function cleanMark(mark: unknown): Record<string, unknown> | null {
  if (!mark || typeof mark !== "object") return null;
  const type = (mark as { type?: unknown }).type;
  if (typeof type !== "string" || !MARK_TYPES.has(type)) return null;
  if (type !== "link") return { type };

  const href = (mark as { attrs?: { href?: unknown } }).attrs?.href;
  if (typeof href !== "string") return null;
  if (!/^https?:\/\//i.test(href) && !/^mailto:/i.test(href)) return null;
  return {
    type: "link",
    attrs: { href, target: "_blank", rel: "noopener noreferrer" },
  };
}

function readAlign(record: Record<string, unknown>): "center" | "right" | undefined {
  const align = (record.attrs as { textAlign?: unknown } | undefined)?.textAlign;
  return align === "center" || align === "right" ? align : undefined;
}

function readColwidth(value: unknown): number[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const widths = value.filter((item): item is number => typeof item === "number" && Number.isInteger(item) && item >= 40 && item <= 1200);
  return widths.length > 0 ? widths : undefined;
}

function spanCount(value: unknown): number {
  const count = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(count) || count < 1) return 1;
  return Math.min(count, 50);
}

function cleanNode(node: unknown): Record<string, unknown> | null {
  if (!node || typeof node !== "object") return null;
  const record = node as Record<string, unknown>;
  if (typeof record.type !== "string" || !NODE_TYPES.has(record.type)) return null;

  const next: Record<string, unknown> = { type: record.type };
  if (record.type === "text") {
    if (typeof record.text !== "string") return null;
    next.text = record.text;
  }
  if (record.type === "heading") {
    const level = (record.attrs as { level?: unknown } | undefined)?.level;
    const align = readAlign(record);
    next.attrs = { level: level === 2 || level === 3 ? level : 1, ...(align ? { textAlign: align } : {}) };
  }
  if (record.type === "paragraph") {
    const align = readAlign(record);
    if (align) next.attrs = { textAlign: align };
  }
  if (record.type === "image") {
    const attrs = record.attrs as { src?: unknown; alt?: unknown } | undefined;
    const src = safeImageSrc(typeof attrs?.src === "string" ? attrs.src : undefined);
    if (!src) return null;
    next.attrs = { src, alt: typeof attrs?.alt === "string" ? attrs.alt.slice(0, 200) : null };
  }
  if (record.type === "chart") {
    const attrs = record.attrs as { title?: unknown; labels?: unknown; values?: unknown } | undefined;
    next.attrs = {
      title: typeof attrs?.title === "string" ? attrs.title.slice(0, 80) : "Chart",
      labels: typeof attrs?.labels === "string" ? attrs.labels.slice(0, 400) : "",
      values: typeof attrs?.values === "string" ? attrs.values.slice(0, 200) : "",
    };
  }
  if (record.type === "tableCell" || record.type === "tableHeader") {
    const attrs = record.attrs as { colspan?: unknown; rowspan?: unknown; colwidth?: unknown } | undefined;
    const align = readAlign(record);
    const colwidth = readColwidth(attrs?.colwidth);
    next.attrs = {
      colspan: spanCount(attrs?.colspan),
      rowspan: spanCount(attrs?.rowspan),
      ...(colwidth ? { colwidth } : {}),
      ...(align ? { textAlign: align } : {}),
    };
  }
  if (record.type === "text" && Array.isArray(record.marks)) {
    const marks = record.marks.map(cleanMark).filter((mark) => mark !== null);
    if (marks.length > 0) next.marks = marks;
  }
  if (Array.isArray(record.content)) {
    const content = record.content.map(cleanNode).filter((child) => child !== null);
    if (content.length > 0) next.content = content;
  }
  return next;
}

/**
 * Keeps a TipTap document and drops nodes the editor does not use.
 * An empty string means "no structured copy yet" and is stored as-is.
 */
export function sanitizeContentJson(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new DocumentError("Document content is not valid structured JSON.", 400);
  }

  const cleaned = cleanNode(parsed);
  if (!cleaned || cleaned.type !== "doc") {
    throw new DocumentError("Document content must be a JSON document.", 400);
  }
  return JSON.stringify(cleaned);
}

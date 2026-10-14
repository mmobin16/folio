import sanitizeHtml from "sanitize-html";

/**
 * Document HTML is stored only after it passes this allow-list.
 * The editor is not the only writer: file import and hand-crafted API
 * requests also land here, so this is the trust boundary.
 */
const ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "em",
  "u",
  "s",
  "h1",
  "h2",
  "h3",
  "ul",
  "ol",
  "li",
  "blockquote",
  "code",
  "pre",
  "a",
  "hr",
  "div",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
  "img",
];

function spanCount(value: string | undefined): string | null {
  const count = Number(value);
  if (!Number.isInteger(count) || count < 1 || count > 50) return null;
  return String(count);
}

/** Pictures may be an https URL or an embedded image. Other data URLs are dropped. */
export function safeImageSrc(value: string | undefined): string | null {
  if (!value) return null;
  const src = value.trim();
  if (/^https?:\/\//i.test(src) && src.length <= 2000) return src;
  if (/^data:image\/(png|jpeg|gif|webp);base64,[a-z0-9+/=\s]+$/i.test(src) && src.length <= 3_000_000) {
    return src.replace(/\s/g, "");
  }
  return null;
}

export function sanitizeDocumentHtml(dirty: string): string {
  return sanitizeHtml(dirty, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      a: ["href", "target", "rel"],
      img: ["src", "alt"],
      p: ["style"],
      td: ["colspan", "rowspan", "colwidth", "style"],
      th: ["colspan", "rowspan", "colwidth", "style"],
      div: ["data-page-break", "data-chart", "data-title", "data-labels", "data-values", "class"],
    },
    allowedSchemes: ["http", "https", "mailto", "data"],
    allowedSchemesByTag: {
      img: ["data", "http", "https"],
      a: ["http", "https", "mailto"],
    },
    allowProtocolRelative: false,
    // Document bodies are fragments (`<p>…</p>`), not full HTML documents.
    enforceHtmlBoundary: false,
    transformTags: {
      b: "strong",
      i: "em",
      h4: "h3",
      h5: "h3",
      h6: "h3",
      a: sanitizeHtml.simpleTransform("a", {
        rel: "noopener noreferrer",
        target: "_blank",
      }),
      img: (tagName, attribs) => {
        const src = safeImageSrc(attribs.src);
        if (!src) return { tagName: "span", attribs: {} };
        const next: Record<string, string> = { src };
        if (attribs.alt) next.alt = attribs.alt.slice(0, 200);
        return { tagName, attribs: next };
      },
      p: (_tagName, attribs) => ({ tagName: "p", attribs: alignmentAttributes(attribs) }),
      td: (tagName, attribs) => cellAttributes(tagName, attribs),
      th: (tagName, attribs) => cellAttributes(tagName, attribs),
      div: (_tagName, attribs) => {
        if (attribs["data-page-break"] === "true") {
          return { tagName: "div", attribs: { "data-page-break": "true", class: "page-break" } };
        }
        if (attribs["data-chart"] === "bar") {
          const next: Record<string, string> = { "data-chart": "bar" };
          if (attribs["data-title"]) next["data-title"] = attribs["data-title"].slice(0, 80);
          if (attribs["data-labels"]) next["data-labels"] = attribs["data-labels"].slice(0, 400);
          if (attribs["data-values"]) next["data-values"] = attribs["data-values"].slice(0, 200);
          return { tagName: "div", attribs: next };
        }
        return { tagName: "span", attribs: {} };
      },
    },
  });
}

function alignmentAttributes(attribs: Record<string, string>): Record<string, string> {
  const align = attribs.style?.match(/text-align:\s*(center|right|left)/i)?.[1]?.toLowerCase();
  if (align !== "center" && align !== "right") return {};
  return { style: `text-align:${align}` };
}

function cellAttributes(tagName: string, attribs: Record<string, string>) {
  const next = alignmentAttributes(attribs);
  const colspan = spanCount(attribs.colspan);
  const rowspan = spanCount(attribs.rowspan);
  const width = Number(attribs.colwidth);
  if (colspan) next.colspan = colspan;
  if (rowspan) next.rowspan = rowspan;
  if (Number.isInteger(width) && width >= 40 && width <= 1200) next.colwidth = String(width);
  return { tagName, attribs: next };
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Plain-text download. Block tags become line breaks; the allow-list runs first. */
export function htmlToPlainText(html: string): string {
  const text = sanitizeDocumentHtml(html)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|h1|h2|h3|li|blockquote|pre)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return text.length > 0 ? `${text}\n` : "";
}

export function textPreview(html: string, limit = 140): string {
  const text = sanitizeDocumentHtml(html)
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(p|h1|h2|h3|li|blockquote)>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (text.length <= limit) return text;
  return `${text.slice(0, limit - 1).trimEnd()}…`;
}

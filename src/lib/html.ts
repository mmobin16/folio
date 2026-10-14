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
];

export function sanitizeDocumentHtml(dirty: string): string {
  return sanitizeHtml(dirty, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      a: ["href", "target", "rel"],
    },
    allowedSchemes: ["http", "https", "mailto"],
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
    },
  });
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

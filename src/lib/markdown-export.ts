import TurndownService from "turndown";

const turndown = new TurndownService({
  headingStyle: "atx",
  bulletListMarker: "-",
  codeBlockStyle: "fenced",
});

/** Turns stored document HTML into Markdown for the export download. */
export function htmlToMarkdown(html: string): string {
  const markdown = turndown.turndown(html).trim();
  return markdown.length > 0 ? `${markdown}\n` : "";
}

/** Safe file name for Content-Disposition. Falls back when a title is punctuation only. */
export function markdownFilename(title: string): string {
  const slug = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return `${slug || "document"}.md`;
}

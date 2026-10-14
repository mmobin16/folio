import { describe, expect, it } from "vitest";
import { sanitizeContentJson } from "../src/lib/content-json";
import { htmlToPlainText, sanitizeDocumentHtml, textPreview } from "../src/lib/html";
import { htmlToMarkdown, markdownFilename } from "../src/lib/markdown-export";
import { htmlToPdf } from "../src/lib/pdf";
import { hashPassword, verifyPassword } from "../src/lib/passwords";

describe("document html", () => {
  it("keeps editor formatting and drops scripts", () => {
    const clean = sanitizeDocumentHtml(
      `<h1>Hello</h1><p>A <strong>bold</strong> and <u>underlined</u> line.</p><script>alert("x")</script><img src=x onerror=alert(1)>`,
    );
    expect(clean).toContain("<h1>Hello</h1>");
    expect(clean).toContain("<strong>bold</strong>");
    expect(clean).toContain("<u>underlined</u>");
    expect(clean).not.toContain("script");
    expect(clean).not.toContain("onerror");
    expect(clean).not.toContain("<img");
  });

  it("rejects javascript links", () => {
    const clean = sanitizeDocumentHtml(`<a href="javascript:alert(1)">click</a>`);
    expect(clean.toLowerCase()).not.toContain("javascript:");
  });

  it("builds a short plain-text preview", () => {
    expect(textPreview("<p>Hello <strong>there</strong></p>")).toBe("Hello there");
  });
});

describe("structured content and export", () => {
  it("keeps a TipTap document and drops unsafe links", () => {
    const clean = sanitizeContentJson(
      JSON.stringify({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "Go",
                marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }],
              },
            ],
          },
        ],
      }),
    );
    expect(clean).toContain("Go");
    expect(clean).not.toContain("javascript:");
  });

  it("writes a PDF download and a plain-text copy", () => {
    const pdf = Buffer.from(htmlToPdf("Notes", "<h1>Notes</h1><p>Hello <strong>bold</strong></p><ul><li>One</li></ul>"));
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdf.toString("latin1")).toContain("Notes");
    expect(pdf.toString("latin1")).toContain("%%EOF");
    expect(htmlToPlainText("<h1>Notes</h1><p>Hello</p>")).toContain("Notes");
    expect(htmlToPlainText("<h1>Notes</h1><p>Hello</p>")).toContain("Hello");
  });
});

describe("markdown export", () => {
  it("turns a heading and a list into markdown", () => {
    const markdown = htmlToMarkdown("<h1>Notes</h1><ul><li>One</li><li>Two</li></ul>");
    expect(markdown).toContain("# Notes");
    expect(markdown).toMatch(/- +One/);
    expect(markdown).toMatch(/- +Two/);
  });

  it("builds a safe download name", () => {
    expect(markdownFilename("Launch checklist!")).toBe("launch-checklist.md");
    expect(markdownFilename("!!!")).toBe("document.md");
  });
});

describe("passwords", () => {
  it("verifies a matching password and rejects a different one", () => {
    const stored = hashPassword("ajaia-demo");
    expect(verifyPassword("ajaia-demo", stored)).toBe(true);
    expect(verifyPassword("wrong-password", stored)).toBe(false);
    expect(verifyPassword("ajaia-demo", "not-a-hash")).toBe(false);
  });
});

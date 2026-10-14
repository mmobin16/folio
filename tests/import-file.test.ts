import { describe, expect, it } from "vitest";
import {
  fileToHtml,
  textFileToHtml,
  titleFromFilename,
} from "../src/lib/import-file";

describe("file import", () => {
  it("escapes html in plain text and keeps paragraph breaks", () => {
    const html = textFileToHtml("Hello <script>\n\nSecond line");
    expect(html).toContain("Hello &lt;script&gt;");
    expect(html).toContain("<p>Second line</p>");
    expect(html).not.toContain("<script>");
  });

  it("turns markdown headings and emphasis into document html", async () => {
    const html = await fileToHtml(
      "notes.md",
      Buffer.from("# Plan\n\nA **bold** idea and an *italic* one.\n\n- First\n- Second\n"),
    );
    expect(html).toContain("<h1>Plan</h1>");
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain("<em>italic</em>");
    expect(html).toContain("<li>First</li>");
  });

  it("names the document from the file name", () => {
    expect(titleFromFilename("launch_checklist.md")).toBe("launch checklist");
    expect(titleFromFilename("C:\\docs\\Q3.docx")).toBe("Q3");
  });

  it("rejects unsupported types and empty files", async () => {
    await expect(fileToHtml("photo.png", Buffer.from("not an image"))).rejects.toThrow(
      /txt, \.md, or \.docx/,
    );
    await expect(fileToHtml("empty.txt", Buffer.from(""))).rejects.toThrow(/empty/i);
    await expect(fileToHtml("notes.docx", Buffer.from("not a zip"))).rejects.toThrow(/Word document/);
  });
});

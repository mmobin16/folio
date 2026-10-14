import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import {
  fileToHtml,
  textFileToHtml,
  titleFromFilename,
} from "../src/lib/import-file";
import { sanitizeDocumentHtml } from "../src/lib/html";

const PNG =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

async function sampleDocx(): Promise<Buffer> {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="png" ContentType="image/png"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>
</Types>`,
  );
  zip.file(
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`,
  );
  zip.file(
    "word/_rels/document.xml.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rIdHeader" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/>
</Relationships>`,
  );
  zip.file(
    "word/_rels/header1.xml.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rIdLogo" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/logo.png"/>
</Relationships>`,
  );
  zip.file("word/media/logo.png", Buffer.from(PNG, "base64"));
  zip.file(
    "word/header1.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:tbl>
    <w:tr>
      <w:tc><w:p><w:r><w:t>ALPHA LABS</w:t></w:r></w:p></w:tc>
      <w:tc><w:p><w:r><w:drawing><wp:inline xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:blipFill><a:blip r:embed="rIdLogo"/></pic:blipFill></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p></w:tc>
    </w:tr>
  </w:tbl>
</w:hdr>`,
  );
  zip.file(
    "word/document.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:tbl>
      <w:tr>
        <w:tc><w:p><w:r><w:t>Date</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>Time</w:t></w:r></w:p></w:tc>
      </w:tr>
      <w:tr>
        <w:tc><w:p><w:r><w:t>Line No.</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t></w:t></w:r></w:p></w:tc>
      </w:tr>
    </w:tbl>
  </w:body>
</w:document>`,
  );
  return Buffer.from(await zip.generateAsync({ type: "nodebuffer" }));
}

async function pagedDocx(): Promise<Buffer> {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>
</Types>`,
  );
  zip.file(
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`,
  );
  zip.file(
    "word/_rels/document.xml.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rIdHeader" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/>
</Relationships>`,
  );
  zip.file(
    "word/header1.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:t>ALPHA LABS</w:t></w:r></w:p>
</w:hdr>`,
  );
  zip.file(
    "word/document.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>Filling</w:t></w:r></w:p>
    <w:p><w:r><w:br w:type="page"/></w:r></w:p>
    <w:p><w:r><w:t>Packing</w:t></w:r></w:p>
  </w:body>
</w:document>`,
  );
  return Buffer.from(await zip.generateAsync({ type: "nodebuffer" }));
}

async function renderedBreakDocx(): Promise<Buffer> {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>
</Types>`,
  );
  zip.file(
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`,
  );
  zip.file(
    "word/_rels/document.xml.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rIdHeader" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/>
</Relationships>`,
  );
  zip.file(
    "word/header1.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:p><w:r><w:t>ALPHA LABS</w:t></w:r></w:p>
</w:hdr>`,
  );
  zip.file(
    "word/document.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>Filling</w:t></w:r></w:p>
    <w:p><w:r><w:lastRenderedPageBreak/><w:t>Packing</w:t></w:r></w:p>
  </w:body>
</w:document>`,
  );
  return Buffer.from(await zip.generateAsync({ type: "nodebuffer" }));
}

async function boxedDocx(): Promise<Buffer> {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`,
  );
  zip.file(
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`,
  );
  zip.file(
    "word/_rels/document.xml.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>`,
  );
  zip.file(
    "word/document.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:tbl>
      <w:tr>
        <w:tc><w:p><w:r><w:t>Batch</w:t></w:r></w:p></w:tc>
        <w:tc>
          <w:p>
            <w:r>
              <w:drawing>
                <w:txbxContent>
                  <w:p><w:r><w:t>St. Target wt.</w:t></w:r></w:p>
                </w:txbxContent>
              </w:drawing>
            </w:r>
          </w:p>
        </w:tc>
      </w:tr>
    </w:tbl>
    <w:p><w:r><w:t>Line No.</w:t></w:r></w:p>
    <w:tbl>
      <w:tr><w:tc><w:p><w:r><w:t>Check Odor</w:t></w:r></w:p></w:tc></w:tr>
    </w:tbl>
  </w:body>
</w:document>`,
  );
  return Buffer.from(await zip.generateAsync({ type: "nodebuffer" }));
}

async function repeatedBoxDocx(): Promise<Buffer> {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`,
  );
  zip.file(
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`,
  );
  zip.file(
    "word/_rels/document.xml.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>`,
  );
  zip.file(
    "word/document.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006">
  <w:body>
    <w:p>
      <w:r>
        <mc:AlternateContent>
          <mc:Choice>
            <w:drawing>
              <w:txbxContent>
                <w:p><w:r><w:t>St. Target wt.</w:t></w:r></w:p>
                <w:p><w:r><w:t>Tg wt.</w:t></w:r></w:p>
              </w:txbxContent>
            </w:drawing>
          </mc:Choice>
          <mc:Fallback>
            <w:pict>
              <w:txbxContent>
                <w:p><w:r><w:t>St. Target wt.</w:t></w:r></w:p>
                <w:p><w:r><w:t>Tg wt.</w:t></w:r></w:p>
              </w:txbxContent>
            </w:pict>
          </mc:Fallback>
        </mc:AlternateContent>
      </w:r>
    </w:p>
    <w:p><w:r><w:t>IPC LOG SHEET</w:t></w:r></w:p>
  </w:body>
</w:document>`,
  );
  return Buffer.from(await zip.generateAsync({ type: "nodebuffer" }));
}

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

  it("keeps a Word table, the page header, and an embedded logo", async () => {
    const html = await fileToHtml("startup.docx", await sampleDocx());
    expect(html).toContain("<table>");
    expect(html).toContain("Date");
    expect(html).toContain("ALPHA LABS");
    expect(html).toContain("data:image/png;base64,");
  });

  it("splits a Word file into pages and repeats the header", async () => {
    const html = await fileToHtml("startup.docx", await pagedDocx());
    const breaks = html.match(/data-page-break="true"/g) ?? [];
    expect(breaks).toHaveLength(1);
    expect(html.match(/ALPHA LABS/g)).toHaveLength(2);
    expect(html).toContain("text-align:center");
    expect(html).toContain("Filling");
    expect(html).toContain("Packing");
    const pages = html.split('data-page-break="true"');
    expect(pages[0]).toContain("Filling");
    expect(pages[1]).toContain("Packing");
    expect(pages[1]).toContain("ALPHA LABS");
  });

  it("repeats the header when Word marks the next page inside a paragraph", async () => {
    const html = await fileToHtml("startup.docx", await renderedBreakDocx());
    const breaks = html.match(/data-page-break="true"/g) ?? [];
    expect(breaks).toHaveLength(1);
    expect(html.match(/ALPHA LABS/g)).toHaveLength(2);
    const pages = html.split('data-page-break="true"');
    expect(pages[0]).toContain("Filling");
    expect(pages[1]).toContain("Packing");
  });

  it("keeps a weight box in the same row as the fields beside it", async () => {
    const html = await fileToHtml("boxed.docx", await boxedDocx());
    expect(html).toContain("<table>");
    expect(html).toContain("Batch");
    expect(html).toContain("St. Target wt.");
    expect(html).toContain("Line No.");
    expect(html).toContain("Check Odor");
    expect(html.indexOf("St. Target wt.")).toBeLessThan(html.indexOf("Line No."));
    const firstTable = html.match(/<table>[\s\S]*?<\/table>/)?.[0] ?? "";
    expect(firstTable).toContain("Batch");
    expect(firstTable).toContain("St. Target wt.");
  });

  it("keeps one copy of a floating weight box beside the section title", async () => {
    const html = await fileToHtml("boxed.docx", await repeatedBoxDocx());
    expect(html.match(/St\. Target wt\./g)).toHaveLength(1);
    expect(html.match(/Tg wt\./g)).toHaveLength(1);
    const rows = html.match(/<tr>[\s\S]*?<\/tr>/g) ?? [];
    const paired = rows.find((row) => row.includes("IPC LOG SHEET") && row.includes("St. Target wt."));
    expect(paired).toBeTruthy();
  });

  it("keeps safe pictures and drops other data urls", () => {
    const clean = sanitizeDocumentHtml(
      `<table><tr><td colspan="2">Cell</td></tr></table><img src="data:image/png;base64,${PNG}" alt="logo"><img src="data:text/html;base64,abcd">`,
    );
    expect(clean).toContain("<table>");
    expect(clean).toContain('colspan="2"');
    expect(clean).toContain("data:image/png;base64,");
    expect(clean).not.toContain("data:text/html");
  });

  it("keeps page breaks and charts, and drops other divs", () => {
    const clean = sanitizeDocumentHtml(
      `<div data-page-break="true"></div><div data-chart="bar" data-title="Weights" data-labels="A|B" data-values="1|2"></div><div class="note" onclick="alert(1)">Nope</div>`,
    );
    expect(clean).toContain('data-page-break="true"');
    expect(clean).toContain('data-chart="bar"');
    expect(clean).toContain('data-title="Weights"');
    expect(clean).not.toContain("onclick");
    expect(clean).not.toContain('class="note"');
  });

  it("keeps centered text and drops other styles", () => {
    const clean = sanitizeDocumentHtml(
      `<p style="text-align: center; color: red">IPC LOG SHEET</p><td style="position:absolute">No</td>`,
    );
    expect(clean).toContain('style="text-align:center"');
    expect(clean).toContain("IPC LOG SHEET");
    expect(clean).not.toContain("color");
    expect(clean).not.toContain("position");
  });

  it("rejects unsupported types and empty files", async () => {
    await expect(fileToHtml("photo.png", Buffer.from("not an image"))).rejects.toThrow(
      /txt, \.md, or \.docx/,
    );
    await expect(fileToHtml("empty.txt", Buffer.from(""))).rejects.toThrow(/empty/i);
    await expect(fileToHtml("notes.docx", Buffer.from("not a zip"))).rejects.toThrow(/Word document/);
  });
});

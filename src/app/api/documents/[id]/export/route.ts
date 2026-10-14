import { NextResponse } from "next/server";
import { htmlToPlainText } from "@/lib/html";
import { htmlToMarkdown, markdownFilename } from "@/lib/markdown-export";
import { htmlToPdf, pdfFilename } from "@/lib/pdf";
import { toErrorResponse } from "@/lib/http";
import { requireApiUser } from "@/server/auth";
import { getDocument } from "@/server/documents";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

function download(body: BodyInit, type: string, filename: string) {
  return new NextResponse(body, {
    headers: {
      "Content-Type": type,
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

export async function GET(request: Request, context: Context) {
  try {
    const user = await requireApiUser();
    if (user instanceof NextResponse) return user;
    const { id } = await context.params;
    const document = await getDocument(user.id, id);
    const format = new URL(request.url).searchParams.get("format");

    if (format === "pdf") {
      const pdf = htmlToPdf(document.title, document.content);
      const copy = new ArrayBuffer(pdf.byteLength);
      new Uint8Array(copy).set(pdf);
      return download(new Blob([copy]), "application/pdf", pdfFilename(document.title));
    }

    if (format === "txt") {
      const slug = markdownFilename(document.title).replace(/\.md$/, "");
      return download(htmlToPlainText(document.content), "text/plain; charset=utf-8", `${slug}.txt`);
    }

    const markdown = htmlToMarkdown(document.content);
    return download(markdown, "text/markdown; charset=utf-8", markdownFilename(document.title));
  } catch (error) {
    return toErrorResponse(error);
  }
}

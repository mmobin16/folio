import { NextResponse } from "next/server";
import { htmlToMarkdown, markdownFilename } from "@/lib/markdown-export";
import { toErrorResponse } from "@/lib/http";
import { requireApiUser } from "@/server/auth";
import { getDocument } from "@/server/documents";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const user = await requireApiUser();
    if (user instanceof NextResponse) return user;
    const { id } = await context.params;
    const document = await getDocument(user.id, id);
    const markdown = htmlToMarkdown(document.content);
    const filename = markdownFilename(document.title);

    return new NextResponse(markdown, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

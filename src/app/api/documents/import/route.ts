import { NextResponse } from "next/server";
import { fileToHtml, titleFromFilename } from "@/lib/import-file";
import { jsonError, rejectCrossOrigin, toErrorResponse } from "@/lib/http";
import { requireApiUser } from "@/server/auth";
import { createDocument } from "@/server/documents";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const blocked = rejectCrossOrigin(request);
  if (blocked) return blocked;

  try {
    const user = await requireApiUser();
    if (user instanceof NextResponse) return user;

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return jsonError("Choose a file to import.", 400);

    const html = await fileToHtml(file.name, Buffer.from(await file.arrayBuffer()));
    const document = await createDocument(user.id, {
      title: titleFromFilename(file.name),
      content: html,
    });
    return NextResponse.json({ document }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

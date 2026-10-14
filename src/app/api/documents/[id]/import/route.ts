import { NextResponse } from "next/server";
import { fileToHtml } from "@/lib/import-file";
import { jsonError, rejectCrossOrigin, toErrorResponse } from "@/lib/http";
import { requireApiUser } from "@/server/auth";
import { getDocument, updateDocument } from "@/server/documents";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

/** Replaces the body of a document the caller can edit. The title is kept. */
export async function POST(request: Request, context: Context) {
  const blocked = rejectCrossOrigin(request);
  if (blocked) return blocked;

  try {
    const user = await requireApiUser();
    if (user instanceof NextResponse) return user;
    const { id } = await context.params;
    const current = await getDocument(user.id, id);
    if (!current.canEdit) {
      return jsonError("You have view access, so this document is read only.", 403);
    }

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return jsonError("Choose a file to import.", 400);

    const html = await fileToHtml(file.name, Buffer.from(await file.arrayBuffer()));
    const document = await updateDocument(user.id, id, {
      content: html,
      contentJson: "",
      baseUpdatedAt: current.updatedAt,
    });
    return NextResponse.json({ document });
  } catch (error) {
    return toErrorResponse(error);
  }
}

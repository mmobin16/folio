import { NextResponse } from "next/server";
import { jsonError, rejectCrossOrigin, toErrorResponse } from "@/lib/http";
import { addAttachment, listAttachments } from "@/server/attachments";
import { requireApiUser } from "@/server/auth";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const user = await requireApiUser();
    if (user instanceof NextResponse) return user;
    const { id } = await context.params;
    const attachments = await listAttachments(user.id, id);
    return NextResponse.json({ attachments });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request, context: Context) {
  const blocked = rejectCrossOrigin(request);
  if (blocked) return blocked;

  try {
    const user = await requireApiUser();
    if (user instanceof NextResponse) return user;
    const { id } = await context.params;
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return jsonError("Choose a file to attach.", 400);
    const attachments = await addAttachment(user.id, id, {
      filename: file.name,
      mimeType: file.type,
      bytes: Buffer.from(await file.arrayBuffer()),
    });
    return NextResponse.json({ attachments }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

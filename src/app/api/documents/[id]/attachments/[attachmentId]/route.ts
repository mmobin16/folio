import { NextResponse } from "next/server";
import { rejectCrossOrigin, toErrorResponse } from "@/lib/http";
import { deleteAttachment, readAttachment } from "@/server/attachments";
import { requireApiUser } from "@/server/auth";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string; attachmentId: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const user = await requireApiUser();
    if (user instanceof NextResponse) return user;
    const { id, attachmentId } = await context.params;
    const file = await readAttachment(user.id, id, attachmentId);
    return new NextResponse(new Uint8Array(file.bytes), {
      headers: {
        "Content-Type": file.mimeType,
        "Content-Disposition": `attachment; filename="${file.filename.replace(/"/g, "")}"`,
      },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(request: Request, context: Context) {
  const blocked = rejectCrossOrigin(request);
  if (blocked) return blocked;

  try {
    const user = await requireApiUser();
    if (user instanceof NextResponse) return user;
    const { id, attachmentId } = await context.params;
    const attachments = await deleteAttachment(user.id, id, attachmentId);
    return NextResponse.json({ attachments });
  } catch (error) {
    return toErrorResponse(error);
  }
}

import { z } from "zod";
import { NextResponse } from "next/server";
import { jsonError, readJson, rejectCrossOrigin, toErrorResponse } from "@/lib/http";
import { firstZodMessage } from "@/lib/validators";
import { requireApiUser } from "@/server/auth";
import { applySuggestion, deleteComment, resolveComment } from "@/server/comments";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string; commentId: string }> };

const actionSchema = z.object({
  action: z.enum(["resolve", "apply"]),
});

export async function PATCH(request: Request, context: Context) {
  const blocked = rejectCrossOrigin(request);
  if (blocked) return blocked;

  try {
    const user = await requireApiUser();
    if (user instanceof NextResponse) return user;
    const parsed = actionSchema.safeParse(await readJson(request));
    if (!parsed.success) return jsonError(firstZodMessage(parsed.error), 400);
    const { id, commentId } = await context.params;

    if (parsed.data.action === "apply") {
      const result = await applySuggestion(user.id, id, commentId);
      return NextResponse.json(result);
    }

    const comments = await resolveComment(user.id, id, commentId);
    return NextResponse.json({ comments });
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
    const { id, commentId } = await context.params;
    const comments = await deleteComment(user.id, id, commentId);
    return NextResponse.json({ comments });
  } catch (error) {
    return toErrorResponse(error);
  }
}

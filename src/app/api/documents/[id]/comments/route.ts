import { NextResponse } from "next/server";
import { jsonError, readJson, rejectCrossOrigin, toErrorResponse } from "@/lib/http";
import { commentSchema, firstZodMessage } from "@/lib/validators";
import { requireApiUser } from "@/server/auth";
import { addComment, listComments } from "@/server/comments";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const user = await requireApiUser();
    if (user instanceof NextResponse) return user;
    const { id } = await context.params;
    const comments = await listComments(user.id, id);
    return NextResponse.json({ comments });
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
    const parsed = commentSchema.safeParse(await readJson(request));
    if (!parsed.success) return jsonError(firstZodMessage(parsed.error), 400);
    const { id } = await context.params;
    const comments = await addComment(user.id, id, parsed.data);
    return NextResponse.json({ comments }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

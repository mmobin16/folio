import { NextResponse } from "next/server";
import { jsonError, readJson, rejectCrossOrigin, toErrorResponse } from "@/lib/http";
import { firstZodMessage, presenceSchema } from "@/lib/validators";
import { requireApiUser } from "@/server/auth";
import { clearPresence, listPresence, touchPresence } from "@/server/presence";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const user = await requireApiUser();
    if (user instanceof NextResponse) return user;
    const { id } = await context.params;
    const people = await listPresence(user.id, id);
    return NextResponse.json({ people });
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
    const parsed = presenceSchema.safeParse(await readJson(request));
    if (!parsed.success) return jsonError(firstZodMessage(parsed.error), 400);
    const { id } = await context.params;
    const people = await touchPresence(user.id, id, parsed.data.activity);
    return NextResponse.json({ people });
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
    const { id } = await context.params;
    await clearPresence(user.id, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}

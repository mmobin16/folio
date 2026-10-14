import { NextResponse } from "next/server";
import { jsonError, readJson, rejectCrossOrigin, toErrorResponse } from "@/lib/http";
import { firstZodMessage, shareSchema } from "@/lib/validators";
import { requireApiUser } from "@/server/auth";
import { grantAccess } from "@/server/documents";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

export async function PUT(request: Request, context: Context) {
  const blocked = rejectCrossOrigin(request);
  if (blocked) return blocked;

  try {
    const user = await requireApiUser();
    if (user instanceof NextResponse) return user;
    const parsed = shareSchema.safeParse(await readJson(request));
    if (!parsed.success) return jsonError(firstZodMessage(parsed.error), 400);

    const { id } = await context.params;
    const document = await grantAccess(
      user.id,
      id,
      parsed.data.email,
      parsed.data.permission,
    );
    return NextResponse.json({ document });
  } catch (error) {
    return toErrorResponse(error);
  }
}

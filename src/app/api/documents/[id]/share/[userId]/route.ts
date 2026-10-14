import { NextResponse } from "next/server";
import { rejectCrossOrigin, toErrorResponse } from "@/lib/http";
import { requireApiUser } from "@/server/auth";
import { revokeAccess } from "@/server/documents";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string; userId: string }> };

export async function DELETE(request: Request, context: Context) {
  const blocked = rejectCrossOrigin(request);
  if (blocked) return blocked;

  try {
    const user = await requireApiUser();
    if (user instanceof NextResponse) return user;
    const { id, userId } = await context.params;
    const document = await revokeAccess(user.id, id, userId);
    return NextResponse.json({ document });
  } catch (error) {
    return toErrorResponse(error);
  }
}

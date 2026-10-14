import { NextResponse } from "next/server";
import { rejectCrossOrigin, toErrorResponse } from "@/lib/http";
import { requireApiUser } from "@/server/auth";
import { getDocument } from "@/server/documents";
import { restoreVersion } from "@/server/versions";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string; versionId: string }> };

export async function POST(request: Request, context: Context) {
  const blocked = rejectCrossOrigin(request);
  if (blocked) return blocked;

  try {
    const user = await requireApiUser();
    if (user instanceof NextResponse) return user;
    const { id, versionId } = await context.params;
    await restoreVersion(user.id, id, versionId);
    const document = await getDocument(user.id, id);
    return NextResponse.json({ document });
  } catch (error) {
    return toErrorResponse(error);
  }
}

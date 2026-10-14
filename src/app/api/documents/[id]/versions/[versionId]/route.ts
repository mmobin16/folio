import { NextResponse } from "next/server";
import { toErrorResponse } from "@/lib/http";
import { requireApiUser } from "@/server/auth";
import { getVersion } from "@/server/versions";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string; versionId: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const user = await requireApiUser();
    if (user instanceof NextResponse) return user;
    const { id, versionId } = await context.params;
    const version = await getVersion(user.id, id, versionId);
    return NextResponse.json({ version });
  } catch (error) {
    return toErrorResponse(error);
  }
}

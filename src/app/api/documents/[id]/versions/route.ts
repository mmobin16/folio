import { NextResponse } from "next/server";
import { toErrorResponse } from "@/lib/http";
import { requireApiUser } from "@/server/auth";
import { listVersions } from "@/server/versions";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const user = await requireApiUser();
    if (user instanceof NextResponse) return user;
    const { id } = await context.params;
    const versions = await listVersions(user.id, id);
    return NextResponse.json({ versions });
  } catch (error) {
    return toErrorResponse(error);
  }
}

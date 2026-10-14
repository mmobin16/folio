import { NextResponse } from "next/server";
import { jsonError, readJson, rejectCrossOrigin, toErrorResponse } from "@/lib/http";
import { firstZodMessage, profileSchema } from "@/lib/validators";
import { updateProfile } from "@/server/accounts";
import { requireApiUser } from "@/server/auth";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await requireApiUser();
    if (user instanceof NextResponse) return user;
    return NextResponse.json({ user });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  const blocked = rejectCrossOrigin(request);
  if (blocked) return blocked;

  try {
    const user = await requireApiUser();
    if (user instanceof NextResponse) return user;
    const parsed = profileSchema.safeParse(await readJson(request));
    if (!parsed.success) return jsonError(firstZodMessage(parsed.error), 400);
    const updated = await updateProfile(user.id, parsed.data);
    return NextResponse.json({ user: updated });
  } catch (error) {
    return toErrorResponse(error);
  }
}

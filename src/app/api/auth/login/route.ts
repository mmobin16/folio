import { NextResponse } from "next/server";
import { jsonError, readJson, rejectCrossOrigin, toErrorResponse } from "@/lib/http";
import { firstZodMessage, loginSchema } from "@/lib/validators";
import { applySessionCookie, authenticate, createLoginSession } from "@/server/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const blocked = rejectCrossOrigin(request);
  if (blocked) return blocked;

  try {
    const parsed = loginSchema.safeParse(await readJson(request));
    if (!parsed.success) return jsonError(firstZodMessage(parsed.error), 400);

    const user = await authenticate(parsed.data.email, parsed.data.password);
    if (!user) {
      return jsonError("Those credentials do not match a Folio account.", 401);
    }

    const token = await createLoginSession(user.id);
    const response = NextResponse.json({ user });
    applySessionCookie(response, token);
    return response;
  } catch (error) {
    return toErrorResponse(error);
  }
}

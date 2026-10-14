import { NextResponse } from "next/server";
import { jsonError, readJson, rejectCrossOrigin, toErrorResponse } from "@/lib/http";
import { firstZodMessage, registerSchema } from "@/lib/validators";
import { registerAccount } from "@/server/accounts";
import { applySessionCookie, createLoginSession } from "@/server/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const blocked = rejectCrossOrigin(request);
  if (blocked) return blocked;

  try {
    const parsed = registerSchema.safeParse(await readJson(request));
    if (!parsed.success) return jsonError(firstZodMessage(parsed.error), 400);

    const user = await registerAccount(parsed.data);
    const token = await createLoginSession(user.id);
    const response = NextResponse.json({ user }, { status: 201 });
    applySessionCookie(response, token);
    return response;
  } catch (error) {
    return toErrorResponse(error);
  }
}

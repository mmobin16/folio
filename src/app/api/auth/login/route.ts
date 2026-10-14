import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError, readJson, rejectCrossOrigin, toErrorResponse } from "@/lib/http";
import { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from "@/lib/session";
import { firstZodMessage, loginSchema } from "@/lib/validators";
import { authenticate, createSessionToken, hashSessionToken } from "@/server/auth";

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

    const token = createSessionToken();
    await prisma.session.create({
      data: {
        tokenHash: hashSessionToken(token),
        userId: user.id,
        expiresAt: new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000),
      },
    });

    const response = NextResponse.json({ user });
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });
    return response;
  } catch (error) {
    return toErrorResponse(error);
  }
}

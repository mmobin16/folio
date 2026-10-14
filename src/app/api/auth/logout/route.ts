import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { rejectCrossOrigin, toErrorResponse } from "@/lib/http";
import { SESSION_COOKIE } from "@/lib/session";
import { hashSessionToken } from "@/server/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const blocked = rejectCrossOrigin(request);
  if (blocked) return blocked;

  try {
    const jar = await cookies();
    const token = jar.get(SESSION_COOKIE)?.value;
    if (token) {
      await prisma.session.deleteMany({
        where: { tokenHash: hashSessionToken(token) },
      });
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    });
    return response;
  } catch (error) {
    return toErrorResponse(error);
  }
}

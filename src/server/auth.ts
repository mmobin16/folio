import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { ensureDatabase, prisma } from "@/lib/db";
import { jsonError } from "@/lib/http";
import { hashPassword, verifyPassword } from "@/lib/passwords";
import { SESSION_COOKIE } from "@/lib/session";
import type { SessionUser } from "@/lib/types";

const DUMMY_HASH = hashPassword("folio-dummy-password");

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function createSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

function toSessionUser(user: { id: string; email: string; name: string }): SessionUser {
  return { id: user.id, email: user.email, name: user.name };
}

/**
 * Returns the signed-in user, or null when the cookie is missing, unknown,
 * or expired. Authorization for a specific document is a separate check.
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  await ensureDatabase();
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    include: { user: true },
  });

  if (!session) return null;

  if (session.expiresAt.getTime() <= Date.now()) {
    await prisma.session.delete({ where: { id: session.id } });
    return null;
  }

  return toSessionUser(session.user);
}

export async function requirePageUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireApiUser(): Promise<SessionUser | NextResponse> {
  const user = await getCurrentUser();
  if (!user) return jsonError("Sign in to continue.", 401);
  return user;
}

export async function authenticate(email: string, password: string): Promise<SessionUser | null> {
  await ensureDatabase();
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  // Always run scrypt so a missing account does not return faster than a wrong password.
  const matches = verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !matches) return null;
  return toSessionUser(user);
}

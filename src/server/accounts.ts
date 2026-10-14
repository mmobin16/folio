import { Prisma } from "@prisma/client";
import { ensureDatabase, prisma } from "@/lib/db";
import { hashPassword } from "@/lib/passwords";
import type { SessionUser, UserMatch } from "@/lib/types";
import { AccountError } from "@/server/errors";

function toSessionUser(user: { id: string; email: string; name: string }): SessionUser {
  return { id: user.id, email: user.email, name: user.name };
}

export async function registerAccount(input: {
  name: string;
  email: string;
  password: string;
}): Promise<SessionUser> {
  await ensureDatabase();
  const email = input.email.toLowerCase();
  const name = input.name.trim();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new AccountError("An account with that email already exists.", 409);
  }

  try {
    const user = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash: hashPassword(input.password),
        profile: { create: { name, email } },
      },
    });
    return toSessionUser(user);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new AccountError("An account with that email already exists.", 409);
    }
    throw error;
  }
}

export async function updateProfile(
  userId: string,
  input: { name: string; email: string },
): Promise<SessionUser> {
  await ensureDatabase();
  const name = input.name.trim();
  const email = input.email.toLowerCase();
  const current = await prisma.user.findUnique({ where: { id: userId } });
  if (!current) throw new AccountError("That account no longer exists.", 404);

  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        name,
        email,
        profile: {
          upsert: {
            create: { name, email },
            update: { name, email },
          },
        },
      },
    });
    return toSessionUser(user);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new AccountError("Another account already uses that email.", 409);
    }
    throw error;
  }
}

export async function searchUsers(actorId: string, query: string): Promise<UserMatch[]> {
  await ensureDatabase();
  const needle = query.trim();
  if (needle.length < 1) return [];

  return prisma.user.findMany({
    where: {
      id: { not: actorId },
      OR: [
        { email: { contains: needle } },
        { name: { contains: needle } },
      ],
    },
    select: { id: true, name: true, email: true },
    orderBy: { email: "asc" },
    take: 8,
  });
}

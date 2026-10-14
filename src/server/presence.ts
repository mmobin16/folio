import { prisma } from "@/lib/db";
import type { PresenceView } from "@/lib/types";
import { requireDocumentAccess } from "@/server/document-access";

const PRESENT_WINDOW_MS = 20_000;

export async function touchPresence(
  userId: string,
  documentId: string,
  activity: "viewing" | "editing",
): Promise<PresenceView[]> {
  await requireDocumentAccess(userId, documentId);
  await prisma.documentPresence.upsert({
    where: { documentId_userId: { documentId, userId } },
    create: { documentId, userId, activity, lastSeenAt: new Date() },
    update: { activity, lastSeenAt: new Date() },
  });
  return listPresence(userId, documentId);
}

export async function clearPresence(userId: string, documentId: string): Promise<void> {
  await requireDocumentAccess(userId, documentId);
  await prisma.documentPresence.deleteMany({ where: { documentId, userId } });
}

export async function listPresence(userId: string, documentId: string): Promise<PresenceView[]> {
  await requireDocumentAccess(userId, documentId);
  const cutoff = new Date(Date.now() - PRESENT_WINDOW_MS);
  const rows = await prisma.documentPresence.findMany({
    where: { documentId, lastSeenAt: { gte: cutoff } },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { user: { name: "asc" } },
  });

  return rows.map((row) => ({
    userId: row.userId,
    name: row.user.name,
    email: row.user.email,
    activity: row.activity === "editing" ? "editing" : "viewing",
  }));
}

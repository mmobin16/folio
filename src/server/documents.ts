import { sanitizeContentJson } from "@/lib/content-json";
import { ensureDatabase, prisma } from "@/lib/db";
import { sanitizeDocumentHtml, textPreview } from "@/lib/html";
import { parsePermission, resolveAccess, type SharePermission } from "@/lib/permissions";
import type { DocumentDetail, DocumentListItem, DocumentShareView } from "@/lib/types";
import { DocumentError } from "@/server/errors";

type Snapshot = {
  title: string;
  content: string;
  contentJson: string;
};

type DocumentRecord = {
  id: string;
  title: string;
  content: string;
  contentJson: string;
  createdAt: Date;
  updatedAt: Date;
  ownerId: string;
  owner: { id: string; name: string; email: string };
  shares: {
    userId: string;
    permission: string;
    user: { id: string; name: string; email: string };
  }[];
};

const documentInclude = {
  owner: { select: { id: true, name: true, email: true } },
  shares: {
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "asc" as const },
  },
};

function toShareViews(document: DocumentRecord): DocumentShareView[] {
  return document.shares.map((share) => ({
    userId: share.userId,
    name: share.user.name,
    email: share.user.email,
    permission: parsePermission(share.permission),
  }));
}

function toDetail(document: DocumentRecord, userId: string): DocumentDetail {
  const access = resolveAccess({
    userId,
    ownerId: document.ownerId,
    shares: document.shares,
  });

  if (access.role === "none") {
    throw new DocumentError("You do not have access to this document.", 403);
  }

  return {
    id: document.id,
    title: document.title,
    content: document.content,
    contentJson: document.contentJson,
    updatedAt: document.updatedAt.toISOString(),
    createdAt: document.createdAt.toISOString(),
    role: access.role,
    owner: document.owner,
    canEdit: access.canEdit,
    canManageSharing: access.canManageSharing,
    canDelete: access.canDelete,
    shares: toShareViews(document),
  };
}

function toListItem(document: DocumentRecord, userId: string): DocumentListItem {
  const detail = toDetail(document, userId);
  return {
    id: detail.id,
    title: detail.title,
    preview: textPreview(detail.content),
    updatedAt: detail.updatedAt,
    role: detail.role,
    ownerName: detail.owner.name,
    ownerEmail: detail.owner.email,
  };
}

async function loadDocument(documentId: string): Promise<DocumentRecord> {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    include: documentInclude,
  });
  if (!document) {
    throw new DocumentError("That document does not exist.", 404);
  }
  return document;
}

export async function listDocuments(userId: string): Promise<{
  owned: DocumentListItem[];
  shared: DocumentListItem[];
}> {
  await ensureDatabase();

  const [ownedRecords, shareRecords] = await Promise.all([
    prisma.document.findMany({
      where: { ownerId: userId },
      include: documentInclude,
    }),
    prisma.documentShare.findMany({
      where: { userId },
      include: { document: { include: documentInclude } },
    }),
  ]);

  const owned = ownedRecords
    .map((document) => toListItem(document, userId))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  const shared = shareRecords
    .map((share) => toListItem(share.document, userId))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return { owned, shared };
}

export async function getDocument(userId: string, documentId: string): Promise<DocumentDetail> {
  await ensureDatabase();
  return toDetail(await loadDocument(documentId), userId);
}

function sameSnapshot(left: Snapshot, right: Snapshot): boolean {
  return (
    left.title === right.title &&
    left.content === right.content &&
    left.contentJson === right.contentJson
  );
}

/**
 * Keeps the copy from before the first edit, then folds a short burst of
 * saves from the same person into the latest snapshot.
 */
async function captureVersion(documentId: string, authorId: string, before: Snapshot, after: Snapshot) {
  if (sameSnapshot(before, after)) return;

  const latest = await prisma.documentVersion.findFirst({
    where: { documentId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });

  if (!latest) {
    await prisma.documentVersion.create({ data: { documentId, authorId, ...before } });
    await prisma.documentVersion.create({ data: { documentId, authorId, ...after } });
    return;
  }

  const recent =
    latest.authorId === authorId &&
    Date.now() - latest.createdAt.getTime() < 90_000 &&
    latest.title === before.title &&
    latest.content === before.content &&
    latest.contentJson === before.contentJson;

  if (recent) {
    await prisma.documentVersion.update({ where: { id: latest.id }, data: after });
    return;
  }

  await prisma.documentVersion.create({ data: { documentId, authorId, ...after } });
}

export async function createDocument(
  ownerId: string,
  input: { title?: string; content?: string; contentJson?: string } = {},
): Promise<DocumentDetail> {
  await ensureDatabase();
  const title = input.title?.trim() || "Untitled document";
  if (title.length > 120) {
    throw new DocumentError("Title must be 120 characters or fewer.", 400);
  }

  const created = await prisma.document.create({
    data: {
      ownerId,
      title,
      content: input.content ? sanitizeDocumentHtml(input.content) : "",
      contentJson: input.contentJson ? sanitizeContentJson(input.contentJson) : "",
    },
  });

  return getDocument(ownerId, created.id);
}

export async function updateDocument(
  userId: string,
  documentId: string,
  input: { title?: string; content?: string; contentJson?: string; baseUpdatedAt?: string },
): Promise<DocumentDetail> {
  await ensureDatabase();
  const document = await loadDocument(documentId);
  const access = resolveAccess({
    userId,
    ownerId: document.ownerId,
    shares: document.shares,
  });

  if (!access.canRead) {
    throw new DocumentError("You do not have access to this document.", 403);
  }
  if (!access.canEdit) {
    throw new DocumentError("You have view access, so this document is read only.", 403);
  }

  if (input.baseUpdatedAt && document.updatedAt.toISOString() !== input.baseUpdatedAt) {
    throw new DocumentError(
      "This document was saved somewhere else. Reload to see the latest version.",
      409,
    );
  }

  const before: Snapshot = {
    title: document.title,
    content: document.content,
    contentJson: document.contentJson,
  };
  const after: Snapshot = {
    title: input.title ?? document.title,
    content: input.content !== undefined ? sanitizeDocumentHtml(input.content) : document.content,
    contentJson:
      input.contentJson !== undefined ? sanitizeContentJson(input.contentJson) : document.contentJson,
  };

  await prisma.document.update({
    where: { id: documentId },
    data: after,
  });
  await captureVersion(documentId, userId, before, after);

  return getDocument(userId, documentId);
}

export async function deleteDocument(userId: string, documentId: string): Promise<void> {
  await ensureDatabase();
  const document = await loadDocument(documentId);
  const access = resolveAccess({
    userId,
    ownerId: document.ownerId,
    shares: document.shares,
  });

  if (!access.canRead) {
    throw new DocumentError("You do not have access to this document.", 403);
  }
  if (!access.canDelete) {
    throw new DocumentError("Only the owner can delete this document.", 403);
  }

  await prisma.document.delete({ where: { id: documentId } });
}

export async function grantAccess(
  actorId: string,
  documentId: string,
  email: string,
  permission: SharePermission,
): Promise<DocumentDetail> {
  await ensureDatabase();
  const document = await loadDocument(documentId);
  const access = resolveAccess({
    userId: actorId,
    ownerId: document.ownerId,
    shares: document.shares,
  });

  if (!access.canRead) {
    throw new DocumentError("You do not have access to this document.", 403);
  }
  if (!access.canManageSharing) {
    throw new DocumentError("Only the owner can change who has access.", 403);
  }

  const recipient = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });
  if (!recipient) {
    throw new DocumentError("No Folio account uses that email. They need to register first.", 404);
  }
  if (recipient.id === document.ownerId) {
    throw new DocumentError("The owner already has full access.", 400);
  }

  const existing = document.shares.find((item) => item.userId === recipient.id);
  if (existing && parsePermission(existing.permission) === permission) {
    throw new DocumentError("That person already has this access.", 409);
  }

  await prisma.documentShare.upsert({
    where: { documentId_userId: { documentId, userId: recipient.id } },
    create: { documentId, userId: recipient.id, permission },
    update: { permission },
  });

  return getDocument(actorId, documentId);
}

export async function revokeAccess(
  actorId: string,
  documentId: string,
  sharedUserId: string,
): Promise<DocumentDetail> {
  await ensureDatabase();
  const document = await loadDocument(documentId);
  const access = resolveAccess({
    userId: actorId,
    ownerId: document.ownerId,
    shares: document.shares,
  });

  if (!access.canRead) {
    throw new DocumentError("You do not have access to this document.", 403);
  }
  if (!access.canManageSharing) {
    throw new DocumentError("Only the owner can change who has access.", 403);
  }
  if (sharedUserId === document.ownerId) {
    throw new DocumentError("The owner cannot be removed.", 400);
  }

  const share = document.shares.find((item) => item.userId === sharedUserId);
  if (!share) {
    throw new DocumentError("That person does not have access.", 404);
  }

  await prisma.documentShare.delete({
    where: { documentId_userId: { documentId, userId: sharedUserId } },
  });

  return getDocument(actorId, documentId);
}

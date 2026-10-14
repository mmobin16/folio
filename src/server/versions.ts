import { prisma } from "@/lib/db";
import type { VersionDetail, VersionListItem } from "@/lib/types";
import { requireDocumentAccess } from "@/server/document-access";
import { DocumentError } from "@/server/errors";

export async function listVersions(userId: string, documentId: string): Promise<VersionListItem[]> {
  await requireDocumentAccess(userId, documentId);
  const versions = await prisma.documentVersion.findMany({
    where: { documentId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    include: { author: { select: { id: true, name: true } } },
  });

  return versions.map((version) => ({
    id: version.id,
    title: version.title,
    createdAt: version.createdAt.toISOString(),
    authorId: version.authorId,
    authorName: version.author.name,
  }));
}

export async function getVersion(
  userId: string,
  documentId: string,
  versionId: string,
): Promise<VersionDetail> {
  await requireDocumentAccess(userId, documentId);
  const version = await prisma.documentVersion.findFirst({
    where: { id: versionId, documentId },
    include: { author: { select: { id: true, name: true } } },
  });
  if (!version) throw new DocumentError("That version does not exist.", 404);

  return {
    id: version.id,
    title: version.title,
    content: version.content,
    contentJson: version.contentJson,
    createdAt: version.createdAt.toISOString(),
    authorId: version.authorId,
    authorName: version.author.name,
  };
}

export async function restoreVersion(userId: string, documentId: string, versionId: string): Promise<void> {
  const { access } = await requireDocumentAccess(userId, documentId);
  if (!access.canEdit) {
    throw new DocumentError("You have view access, so this document is read only.", 403);
  }

  const version = await prisma.documentVersion.findFirst({
    where: { id: versionId, documentId },
  });
  if (!version) throw new DocumentError("That version does not exist.", 404);

  await prisma.document.update({
    where: { id: documentId },
    data: {
      title: version.title,
      content: version.content,
      contentJson: version.contentJson,
    },
  });
  await prisma.documentVersion.create({
    data: {
      documentId,
      authorId: userId,
      title: version.title,
      content: version.content,
      contentJson: version.contentJson,
    },
  });
}

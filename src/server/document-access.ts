import { ensureDatabase, prisma } from "@/lib/db";
import { resolveAccess, type Access } from "@/lib/permissions";
import { DocumentError } from "@/server/errors";

const documentInclude = {
  owner: { select: { id: true, name: true, email: true } },
  shares: {
    include: { user: { select: { id: true, name: true, email: true } } },
  },
};

export async function requireDocumentAccess(userId: string, documentId: string) {
  await ensureDatabase();
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    include: documentInclude,
  });
  if (!document) {
    throw new DocumentError("That document does not exist.", 404);
  }

  const access: Access = resolveAccess({
    userId,
    ownerId: document.ownerId,
    shares: document.shares,
  });
  if (!access.canRead) {
    throw new DocumentError("You do not have access to this document.", 403);
  }

  return { document, access };
}

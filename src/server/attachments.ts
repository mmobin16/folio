import { prisma } from "@/lib/db";
import { MAX_UPLOAD_BYTES, fileExtension } from "@/lib/import-file";
import type { AttachmentView } from "@/lib/types";
import { requireDocumentAccess } from "@/server/document-access";
import { DocumentError } from "@/server/errors";

const ALLOWED_EXTENSIONS = new Set([".pdf", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".txt", ".md", ".docx"]);

const MIME_BY_EXTENSION: Record<string, string> = {
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".txt": "text/plain",
  ".md": "text/markdown",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

function cleanFilename(filename: string): string {
  const base = filename.replace(/^.*[/\\]/, "").replace(/[^\w.\- ()]+/g, "_").slice(0, 120);
  return base || "attachment";
}

function toView(row: {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  createdAt: Date;
  uploadedById: string;
  uploadedBy: { name: string };
}): AttachmentView {
  return {
    id: row.id,
    filename: row.filename,
    mimeType: row.mimeType,
    size: row.size,
    createdAt: row.createdAt.toISOString(),
    uploadedById: row.uploadedById,
    uploadedByName: row.uploadedBy.name,
  };
}

export async function listAttachments(userId: string, documentId: string): Promise<AttachmentView[]> {
  await requireDocumentAccess(userId, documentId);
  const rows = await prisma.attachment.findMany({
    where: { documentId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      filename: true,
      mimeType: true,
      size: true,
      createdAt: true,
      uploadedById: true,
      uploadedBy: { select: { name: true } },
    },
  });
  return rows.map(toView);
}

export async function addAttachment(
  userId: string,
  documentId: string,
  file: { filename: string; mimeType: string; bytes: Buffer },
): Promise<AttachmentView[]> {
  const { access } = await requireDocumentAccess(userId, documentId);
  if (!access.canEdit) {
    throw new DocumentError("You have view access, so you cannot attach files.", 403);
  }
  if (file.bytes.length === 0) {
    throw new DocumentError("That file is empty.", 400);
  }
  if (file.bytes.length > MAX_UPLOAD_BYTES) {
    throw new DocumentError("Attachments must be 2 MB or smaller.", 400);
  }

  const extension = fileExtension(file.filename);
  if (!ALLOWED_EXTENSIONS.has(extension)) {
    throw new DocumentError("Attach a PDF, image, text, Markdown, or Word file.", 400);
  }

  await prisma.attachment.create({
    data: {
      documentId,
      uploadedById: userId,
      filename: cleanFilename(file.filename),
      mimeType: MIME_BY_EXTENSION[extension] ?? (file.mimeType || "application/octet-stream"),
      size: file.bytes.length,
      data: file.bytes.toString("base64"),
    },
  });

  return listAttachments(userId, documentId);
}

export async function readAttachment(userId: string, documentId: string, attachmentId: string) {
  await requireDocumentAccess(userId, documentId);
  const row = await prisma.attachment.findFirst({
    where: { id: attachmentId, documentId },
  });
  if (!row) throw new DocumentError("That file is not attached to this document.", 404);
  return {
    filename: row.filename,
    mimeType: row.mimeType,
    bytes: Buffer.from(row.data, "base64"),
  };
}

export async function deleteAttachment(userId: string, documentId: string, attachmentId: string) {
  const { access } = await requireDocumentAccess(userId, documentId);
  const row = await prisma.attachment.findFirst({ where: { id: attachmentId, documentId } });
  if (!row) throw new DocumentError("That file is not attached to this document.", 404);
  if (row.uploadedById !== userId && !access.canDelete) {
    throw new DocumentError("Only the owner or the person who uploaded this file can remove it.", 403);
  }
  await prisma.attachment.delete({ where: { id: row.id } });
  return listAttachments(userId, documentId);
}

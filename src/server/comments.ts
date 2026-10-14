import { prisma } from "@/lib/db";
import { escapeHtml } from "@/lib/html";
import type { CommentView } from "@/lib/types";
import { requireDocumentAccess } from "@/server/document-access";
import { updateDocument } from "@/server/documents";
import { DocumentError } from "@/server/errors";

type CommentRow = {
  id: string;
  body: string;
  kind: string;
  suggestion: string;
  createdAt: Date;
  resolvedAt: Date | null;
  authorId: string;
  parentId: string | null;
  author: { id: string; name: string; email: string };
};

function toView(row: CommentRow, replies: CommentView["replies"]): CommentView {
  return {
    id: row.id,
    body: row.body,
    kind: row.kind === "suggestion" ? "suggestion" : "comment",
    suggestion: row.suggestion,
    createdAt: row.createdAt.toISOString(),
    resolvedAt: row.resolvedAt ? row.resolvedAt.toISOString() : null,
    author: row.author,
    replies,
  };
}

export async function listComments(userId: string, documentId: string): Promise<CommentView[]> {
  await requireDocumentAccess(userId, documentId);
  const rows = await prisma.comment.findMany({
    where: { documentId },
    orderBy: { createdAt: "asc" },
    include: { author: { select: { id: true, name: true, email: true } } },
  });

  const byId = new Map(rows.map((row) => [row.id, row]));
  function rootId(row: CommentRow): string {
    let current = row;
    const seen = new Set<string>();
    while (current.parentId && !seen.has(current.id)) {
      seen.add(current.id);
      const parent = byId.get(current.parentId);
      if (!parent) break;
      current = parent;
    }
    return current.id;
  }

  const replies = new Map<string, CommentView["replies"]>();
  for (const row of rows) {
    if (!row.parentId) continue;
    const root = rootId(row);
    const list = replies.get(root) ?? [];
    list.push({
      id: row.id,
      body: row.body,
      createdAt: row.createdAt.toISOString(),
      author: row.author,
    });
    replies.set(root, list);
  }

  return rows.filter((row) => !row.parentId).map((row) => toView(row, replies.get(row.id) ?? []));
}

export async function addComment(
  userId: string,
  documentId: string,
  input: { body: string; parentId?: string; kind?: "comment" | "suggestion"; suggestion?: string },
): Promise<CommentView[]> {
  await requireDocumentAccess(userId, documentId);
  let parentId: string | null = null;
  if (input.parentId) {
    const parent = await prisma.comment.findFirst({
      where: { id: input.parentId, documentId },
    });
    if (!parent) throw new DocumentError("That comment does not exist.", 404);
    parentId = parent.parentId ?? parent.id;
  }

  const kind = parentId ? "comment" : input.kind === "suggestion" ? "suggestion" : "comment";
  const suggestion = kind === "suggestion" ? (input.suggestion?.trim() ?? "") : "";
  if (kind === "suggestion" && !suggestion) {
    throw new DocumentError("Write the suggested text.", 400);
  }

  await prisma.comment.create({
    data: {
      documentId,
      authorId: userId,
      parentId,
      body: input.body.trim(),
      kind,
      suggestion,
    },
  });

  return listComments(userId, documentId);
}

async function loadComment(userId: string, documentId: string, commentId: string) {
  const { access } = await requireDocumentAccess(userId, documentId);
  const comment = await prisma.comment.findFirst({ where: { id: commentId, documentId } });
  if (!comment) throw new DocumentError("That comment does not exist.", 404);
  return { access, comment };
}

export async function resolveComment(userId: string, documentId: string, commentId: string): Promise<CommentView[]> {
  const { access, comment } = await loadComment(userId, documentId, commentId);
  if (comment.authorId !== userId && !access.canEdit) {
    throw new DocumentError("You cannot resolve this comment.", 403);
  }
  if (!comment.resolvedAt) {
    await prisma.comment.update({
      where: { id: comment.id },
      data: { resolvedAt: new Date(), resolvedById: userId },
    });
  }
  return listComments(userId, documentId);
}

export async function deleteComment(userId: string, documentId: string, commentId: string): Promise<CommentView[]> {
  const { access, comment } = await loadComment(userId, documentId, commentId);
  if (comment.authorId !== userId && !access.canDelete) {
    throw new DocumentError("You cannot delete this comment.", 403);
  }
  await prisma.comment.delete({ where: { id: comment.id } });
  return listComments(userId, documentId);
}

/** Copies a suggestion into the document. The document stays unchanged until this runs. */
export async function applySuggestion(userId: string, documentId: string, commentId: string) {
  const { access, comment } = await loadComment(userId, documentId, commentId);
  if (!access.canEdit) {
    throw new DocumentError("You have view access, so this document is read only.", 403);
  }
  if (comment.kind !== "suggestion" || !comment.suggestion.trim()) {
    throw new DocumentError("That comment is not a suggestion.", 400);
  }

  const current = await prisma.document.findUniqueOrThrow({ where: { id: documentId } });
  const addition = `<p>${escapeHtml(comment.suggestion.trim())}</p>`;
  const content = current.content ? `${current.content}${addition}` : addition;
  const document = await updateDocument(userId, documentId, {
    content,
    baseUpdatedAt: current.updatedAt.toISOString(),
  });

  if (!comment.resolvedAt) {
    await prisma.comment.update({
      where: { id: comment.id },
      data: { resolvedAt: new Date(), resolvedById: userId },
    });
  }

  return { document, comments: await listComments(userId, documentId) };
}

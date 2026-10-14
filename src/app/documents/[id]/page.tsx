import { notFound } from "next/navigation";
import { EditorShell } from "@/components/editor/editor-shell";
import { AppHeader } from "@/components/shell/app-header";
import type { DocumentDetail } from "@/lib/types";
import { listAttachments } from "@/server/attachments";
import { listComments } from "@/server/comments";
import { DocumentError } from "@/server/errors";
import { requirePageUser } from "@/server/auth";
import { getDocument } from "@/server/documents";
import { listVersions } from "@/server/versions";

export const dynamic = "force-dynamic";

export default async function DocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePageUser();
  const { id } = await params;

  let document: DocumentDetail | null = null;
  let denied: string | null = null;

  try {
    document = await getDocument(user.id, id);
  } catch (error) {
    if (error instanceof DocumentError && error.status === 404) notFound();
    if (error instanceof DocumentError && error.status === 403) {
      denied = error.message;
    } else {
      throw error;
    }
  }

  if (denied || !document) {
    return (
      <>
        <AppHeader className="no-print" name={user.name} email={user.email} />
        <main className="mx-auto max-w-xl px-4 py-16">
          <h1 className="font-serif text-4xl tracking-tight">No access</h1>
          <p className="mt-3 text-muted">{denied ?? "You do not have access to this document."}</p>
        </main>
      </>
    );
  }

  const [comments, versions, attachments] = await Promise.all([
    listComments(user.id, document.id),
    listVersions(user.id, document.id),
    listAttachments(user.id, document.id),
  ]);

  return (
    <main>
      <EditorShell
        key={`${document.id}:${document.updatedAt}`}
        viewerId={user.id}
        viewerName={user.name}
        viewerEmail={user.email}
        document={document}
        comments={comments}
        versions={versions}
        attachments={attachments}
      />
    </main>
  );
}

import { notFound } from "next/navigation";
import { EditorShell } from "@/components/editor/editor-shell";
import { AppHeader } from "@/components/shell/app-header";
import type { DocumentDetail } from "@/lib/types";
import { DocumentError } from "@/server/errors";
import { requirePageUser } from "@/server/auth";
import { getDocument } from "@/server/documents";

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
        <AppHeader name={user.name} />
        <main className="mx-auto max-w-xl px-4 py-16">
          <h1 className="font-serif text-4xl tracking-tight">No access</h1>
          <p className="mt-3 text-muted">{denied ?? "You do not have access to this document."}</p>
        </main>
      </>
    );
  }

  return (
    <>
      <AppHeader name={user.name} />
      <main>
        <EditorShell document={document} />
      </main>
    </>
  );
}

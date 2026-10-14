"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { api } from "@/lib/api-client";
import { formatTimestamp, roleLabel } from "@/lib/format";
import type { DocumentDetail, DocumentListItem } from "@/lib/types";
import { Button } from "@/components/ui/button";

type LibraryProps = {
  owned: DocumentListItem[];
  shared: DocumentListItem[];
};

export function Library({ owned: initialOwned, shared: initialShared }: LibraryProps) {
  const router = useRouter();
  const [owned, setOwned] = useState(initialOwned);
  const [shared, setShared] = useState(initialShared);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function refresh() {
    const next = await api<{ owned: DocumentListItem[]; shared: DocumentListItem[] }>("/api/documents");
    setOwned(next.owned);
    setShared(next.shared);
  }

  async function createDocument() {
    setCreating(true);
    setError(null);
    try {
      const result = await api<{ document: DocumentDetail }>("/api/documents", {
        method: "POST",
        body: JSON.stringify({ title: "Untitled document" }),
      });
      router.push(`/documents/${result.document.id}`);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create a document.");
      setCreating(false);
    }
  }

  async function importFile(event: React.FormEvent) {
    event.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError("Choose a .txt, .md, or .docx file.");
      return;
    }
    setImporting(true);
    setError(null);
    try {
      const body = new FormData();
      body.set("file", file);
      const result = await api<{ document: DocumentDetail }>("/api/documents/import", {
        method: "POST",
        body,
      });
      router.push(`/documents/${result.document.id}`);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not import that file.");
      setImporting(false);
    }
  }

  async function remove(document: DocumentListItem) {
    if (!window.confirm(`Delete “${document.title}”? This cannot be undone.`)) return;
    setError(null);
    try {
      await api(`/api/documents/${document.id}`, { method: "DELETE" });
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not delete that document.");
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-accent">Documents</p>
          <h1 className="mt-1 font-serif text-4xl tracking-tight sm:text-5xl">Your desk</h1>
          <p className="mt-2 max-w-xl text-muted">
            Drafts you own stay separate from drafts other people have shared with you.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => dialogRef.current?.showModal()}>
            Import file
          </Button>
          <Button onClick={() => void createDocument()} disabled={creating}>
            {creating ? "Creating" : "New document"}
          </Button>
        </div>
      </div>

      {error ? (
        <p className="mt-4 rounded-md border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}

      <DocumentSection
        title="Your documents"
        empty="You have not created a document yet."
        documents={owned}
        onDelete={(document) => void remove(document)}
      />
      <DocumentSection
        title="Shared with you"
        empty="Nothing has been shared with you yet."
        documents={shared}
        onDelete={null}
      />

      <dialog ref={dialogRef} className="folio-dialog w-[min(28rem,calc(100%-2rem))] rounded-lg border border-line bg-sheet p-5 text-ink sm:p-6">
        <form onSubmit={(event) => void importFile(event)}>
          <h2 className="font-serif text-2xl tracking-tight">Import a file</h2>
          <p className="mt-2 text-sm text-muted">
            .txt, .md, and .docx up to 2 MB become a new document. Images inside a Word file are skipped.
          </p>
          <input
            ref={fileRef}
            type="file"
            accept=".txt,.md,.markdown,.docx,text/plain,text/markdown,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="mt-4 block w-full text-sm"
            required
          />
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => dialogRef.current?.close()}>
              Cancel
            </Button>
            <Button type="submit" disabled={importing}>
              {importing ? "Importing" : "Import"}
            </Button>
          </div>
        </form>
      </dialog>
    </div>
  );
}

function DocumentSection({
  title,
  empty,
  documents,
  onDelete,
}: {
  title: string;
  empty: string;
  documents: DocumentListItem[];
  onDelete: ((document: DocumentListItem) => void) | null;
}) {
  return (
    <section className="mt-10">
      <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted">
        {title}
        <span className="ml-2 text-ink">{documents.length}</span>
      </h2>
      {documents.length === 0 ? (
        <p className="mt-3 rounded-lg border border-dashed border-line px-4 py-6 text-sm text-muted">{empty}</p>
      ) : (
        <ul className="mt-3 divide-y divide-line overflow-hidden rounded-lg border border-line bg-sheet">
          {documents.map((document) => (
            <li key={document.id} className="flex items-start justify-between gap-4 px-4 py-4">
              <div className="min-w-0">
                <Link href={`/documents/${document.id}`} className="font-serif text-2xl tracking-tight hover:text-accent">
                  {document.title}
                </Link>
                <p className="mt-1 line-clamp-2 text-sm text-muted">
                  {document.preview || "Empty document"}
                </p>
                <p className="mt-2 text-xs text-muted">
                  {formatTimestamp(document.updatedAt)}
                  {document.role !== "owner" ? ` · from ${document.ownerName}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    document.role === "owner"
                      ? "bg-ink text-sheet"
                      : document.role === "edit"
                        ? "bg-accent text-white"
                        : "border border-line text-muted"
                  }`}
                >
                  {roleLabel(document.role)}
                </span>
                {onDelete && document.role === "owner" ? (
                  <button type="button" className="text-xs font-semibold text-danger" onClick={() => onDelete(document)}>
                    Delete
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

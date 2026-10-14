"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { DocumentEditor } from "@/components/editor/document-editor";
import { ShareDialog } from "@/components/documents/share-dialog";
import { api, ApiError } from "@/lib/api-client";
import { roleLabel } from "@/lib/format";
import type { DocumentDetail } from "@/lib/types";
import { Button } from "@/components/ui/button";

type SaveState = "saved" | "saving" | "unsaved" | "error";

const statusLabel: Record<SaveState, string> = {
  saved: "Saved",
  saving: "Saving…",
  unsaved: "Unsaved changes",
  error: "Could not save",
};

export function EditorShell({ document: initial }: { document: DocumentDetail }) {
  const router = useRouter();
  const [title, setTitle] = useState(initial.title);
  const [status, setStatus] = useState<SaveState>("saved");
  const [error, setError] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [shares, setShares] = useState(initial.shares);
  const [words, setWords] = useState(0);
  const sawEditorUpdate = useRef(false);

  const draft = useRef({
    title: initial.title,
    html: initial.content,
    updatedAt: initial.updatedAt,
    dirty: false,
    saving: false,
  });
  const timer = useRef<number | null>(null);

  useEffect(() => {
    document.title = `${title} · Folio`;
  }, [title]);

  useEffect(() => {
    function onLeave(event: BeforeUnloadEvent) {
      if (!draft.current.dirty && !draft.current.saving) return;
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, []);

  const flushRef = useRef<() => Promise<void>>(async () => {});

  async function flush() {
    if (!initial.canEdit || draft.current.saving || !draft.current.dirty) return;
    if (!draft.current.title.trim()) {
      setStatus("error");
      setError("Title cannot be empty.");
      return;
    }
    if (timer.current) window.clearTimeout(timer.current);

    draft.current.saving = true;
    const snapshot = {
      title: draft.current.title,
      html: draft.current.html,
      updatedAt: draft.current.updatedAt,
    };
    draft.current.dirty = false;
    setStatus("saving");
    let failed = false;

    try {
      const result = await api<{ document: DocumentDetail }>(`/api/documents/${initial.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: snapshot.title,
          content: snapshot.html,
          baseUpdatedAt: snapshot.updatedAt,
        }),
      });
      draft.current.updatedAt = result.document.updatedAt;
      setShares(result.document.shares);
      setError(null);
      setStatus(draft.current.dirty ? "unsaved" : "saved");
    } catch (caught) {
      failed = true;
      draft.current.dirty = true;
      setStatus("error");
      setError(
        caught instanceof ApiError && caught.status === 409
          ? caught.message
          : caught instanceof Error
            ? caught.message
            : "Could not save this document.",
      );
    } finally {
      draft.current.saving = false;
      // A failed save waits for the next edit. A save that overlapped new typing
      // writes the newer draft immediately.
      if (draft.current.dirty && !failed) void flushRef.current();
    }
  }

  useEffect(() => {
    flushRef.current = flush;
  });

  function schedule() {
    if (!initial.canEdit) return;
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      void flush();
    }, 700);
  }

  function markDirty(partial: { title?: string; html?: string }) {
    draft.current = { ...draft.current, ...partial, dirty: true };
    setStatus("unsaved");
    setError(null);
    schedule();
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void flushRef.current();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function removeDocument() {
    if (!window.confirm(`Delete “${draft.current.title}”? This cannot be undone.`)) return;
    try {
      await api(`/api/documents/${initial.id}`, { method: "DELETE" });
      router.push("/documents");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not delete this document.");
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link href="/documents" className="text-sm font-semibold text-muted hover:text-ink">
          ← Documents
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-line px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-muted">
            {roleLabel(initial.role)}
          </span>
          <a
            className="rounded-full border border-line bg-sheet px-3 py-1.5 text-sm font-semibold hover:border-ink/30"
            href={`/api/documents/${initial.id}/export`}
          >
            Download Markdown
          </a>
          <Button variant="secondary" onClick={() => setShareOpen(true)}>
            Share
          </Button>
          {initial.canDelete ? (
            <Button variant="danger" onClick={() => void removeDocument()}>
              Delete
            </Button>
          ) : null}
        </div>
      </div>

      <label className="sr-only" htmlFor="document-title">
        Title
      </label>
      <input
        id="document-title"
        value={title}
        readOnly={!initial.canEdit}
        maxLength={120}
        onChange={(event) => {
          setTitle(event.target.value);
          markDirty({ title: event.target.value });
        }}
        className="w-full bg-transparent font-serif text-4xl tracking-tight text-ink outline-none placeholder:text-muted/70 sm:text-5xl"
        placeholder="Untitled document"
      />

      <p className="mt-2 mb-4 text-sm text-muted" aria-live="polite">
        {statusLabel[status]}
        {words > 0 ? ` · ${words} ${words === 1 ? "word" : "words"}` : ""}
        {!initial.canEdit ? " · Read only" : ""}
      </p>

      {!initial.canEdit ? (
        <p className="mb-4 rounded-md border border-line bg-sheet px-3 py-2 text-sm text-muted">
          You can read this draft. Ask {initial.owner.name} if you need edit access.
        </p>
      ) : null}

      {error ? (
        <p className="mb-4 rounded-md border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger" role="alert">
          {error}{" "}
          {error.includes("Reload") ? (
            <button type="button" className="font-semibold underline" onClick={() => window.location.reload()}>
              Reload
            </button>
          ) : null}
        </p>
      ) : null}

      <DocumentEditor
        content={initial.content}
        editable={initial.canEdit}
        onChange={(html, text) => {
          const count = text.trim() ? text.trim().split(/\s+/).length : 0;
          setWords(count);
          // TipTap emits one update when it finishes loading the saved HTML.
          if (!sawEditorUpdate.current) {
            sawEditorUpdate.current = true;
            draft.current.html = html;
            return;
          }
          if (!initial.canEdit) return;
          markDirty({ html });
        }}
      />

      <ShareDialog
        documentId={initial.id}
        ownerName={initial.owner.name}
        ownerEmail={initial.owner.email}
        shares={shares}
        canManage={initial.canManageSharing}
        open={shareOpen}
        onClose={() => setShareOpen(false)}
      />
    </div>
  );
}

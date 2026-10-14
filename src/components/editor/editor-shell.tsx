"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { DocumentEditor } from "@/components/editor/document-editor";
import { PresenceBar } from "@/components/editor/presence-bar";
import { DocumentPanels } from "@/components/documents/document-panels";
import { ShareDialog } from "@/components/documents/share-dialog";
import { api, ApiError } from "@/lib/api-client";
import { roleLabel } from "@/lib/format";
import type { AttachmentView, CommentView, DocumentDetail, VersionListItem } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { confirmFolio } from "@/components/ui/folio-dialogs";

type SaveState = "saved" | "saving" | "unsaved" | "error";

const statusLabel: Record<SaveState, string> = {
  saved: "Saved",
  saving: "Saving…",
  unsaved: "Unsaved changes",
  error: "Could not save",
};

export function EditorShell({
  document: initial,
  viewerId,
  viewerName,
  viewerEmail,
  comments,
  versions,
  attachments,
}: {
  document: DocumentDetail;
  viewerId: string;
  viewerName: string;
  viewerEmail: string;
  comments: CommentView[];
  versions: VersionListItem[];
  attachments: AttachmentView[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initial.title);
  const [status, setStatus] = useState<SaveState>("saved");
  const [error, setError] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [panel, setPanel] = useState<"comments" | "history" | "files">("comments");
  const [shares, setShares] = useState(initial.shares);
  const [words, setWords] = useState(0);
  const sawEditorUpdate = useRef(false);

  const draft = useRef({
    title: initial.title,
    html: initial.content,
    json: initial.contentJson,
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
      json: draft.current.json,
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
          contentJson: snapshot.json,
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

  function markDirty(partial: { title?: string; html?: string; json?: string }) {
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

  async function createBlank() {
    setBusy(true);
    try {
      const result = await api<{ document: { id: string } }>("/api/documents", {
        method: "POST",
        body: JSON.stringify({}),
      });
      router.push(`/documents/${result.document.id}`);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create a document.");
    } finally {
      setBusy(false);
    }
  }

  async function makeCopy() {
    setBusy(true);
    const copyTitle = `${draft.current.title.trim() || "Untitled"} copy`.slice(0, 120);
    try {
      const result = await api<{ document: { id: string } }>("/api/documents", {
        method: "POST",
        body: JSON.stringify({ title: copyTitle }),
      });
      await api(`/api/documents/${result.document.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: copyTitle,
          content: draft.current.html,
          contentJson: draft.current.json,
        }),
      });
      router.push(`/documents/${result.document.id}`);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not copy this document.");
    } finally {
      setBusy(false);
    }
  }

  async function removeDocument() {
    const confirmed = await confirmFolio({
      title: "Delete document",
      message: `“${draft.current.title}” will be removed from your desk. This cannot be undone.`,
      confirmLabel: "Delete",
      danger: true,
    });
    if (!confirmed) return;
    try {
      await api(`/api/documents/${initial.id}`, { method: "DELETE" });
      router.push("/documents");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not delete this document.");
    }
  }

  return (
    <div>
      {error ? (
        <p className="no-print mx-auto mt-3 max-w-[960px] rounded-md border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger" role="alert">
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
        contentJson={initial.contentJson}
        editable={initial.canEdit}
        documentId={initial.id}
        canDelete={initial.canDelete}
        busy={busy}
        onNew={() => void createBlank()}
        onOpen={() => router.push("/documents")}
        onMakeCopy={() => void makeCopy()}
        onShare={() => setShareOpen(true)}
        onRename={() => document.getElementById("document-title")?.focus()}
        onHistory={() => {
          setPanel("history");
          document.getElementById("document-tools")?.scrollIntoView({ behavior: "smooth" });
        }}
        onDelete={() => void removeDocument()}
        onNotice={setError}
        viewerName={viewerName}
        viewerEmail={viewerEmail}
        leading={
          <div className="flex min-w-0 items-center gap-2">
            <label className="sr-only" htmlFor="document-title">
              Title
            </label>
            <input
              id="document-title"
              value={title}
              readOnly={!initial.canEdit}
              maxLength={120}
              title={`Owned by ${initial.owner.name}${shares.length > 0 ? `. Shared with ${shares.map((person) => person.name).join(", ")}` : ""}`}
              onChange={(event) => {
                setTitle(event.target.value);
                markDirty({ title: event.target.value });
              }}
              className="h-8 min-w-0 flex-1 rounded-md bg-transparent px-2 text-[15px] font-semibold tracking-tight text-ink outline-none placeholder:text-muted/70 hover:bg-ink/[0.04] focus:bg-ink/[0.04]"
              placeholder="Untitled document"
            />
            <span className="hidden shrink-0 text-xs text-muted sm:inline" aria-live="polite">
              {statusLabel[status]}
              {words > 0 ? ` · ${words} ${words === 1 ? "word" : "words"}` : ""}
            </span>
            <span className="hidden shrink-0 text-xs text-muted lg:inline">{roleLabel(initial.role)}</span>
            <PresenceBar
              documentId={initial.id}
              viewerId={viewerId}
              activity={status === "unsaved" || status === "saving" ? "editing" : "viewing"}
              compact
            />
            {initial.canEdit ? (
              <Button variant="ghost" className="!h-8 !px-3 !py-0" onClick={() => void flushRef.current()}>
                Save
              </Button>
            ) : null}
            <Button className="!h-8 !bg-accent !px-3.5 !py-0 !text-white hover:!bg-[#18574f]" onClick={() => setShareOpen(true)}>
              Share
            </Button>
          </div>
        }
        onChange={(html, text, json) => {
          const count = text.trim() ? text.trim().split(/\s+/).length : 0;
          setWords(count);
          // TipTap emits one update when it finishes loading the saved document.
          if (!sawEditorUpdate.current) {
            sawEditorUpdate.current = true;
            draft.current.html = html;
            draft.current.json = json;
            return;
          }
          if (!initial.canEdit) return;
          markDirty({ html, json });
        }}
      />

      <div id="document-tools" className="no-print mx-auto max-w-3xl px-4 pb-16">
        <DocumentPanels
          documentId={initial.id}
          viewerId={viewerId}
          canEdit={initial.canEdit}
          canDelete={initial.canDelete}
          comments={comments}
          versions={versions}
          attachments={attachments}
          panel={panel}
          onPanelChange={setPanel}
          onDocumentReplaced={() => {
            router.refresh();
          }}
        />
      </div>

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

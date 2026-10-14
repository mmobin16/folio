"use client";

import { useState } from "react";
import { api } from "@/lib/api-client";
import { formatTimestamp } from "@/lib/format";
import type { AttachmentView, CommentView, DocumentDetail, VersionDetail, VersionListItem } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { confirmFolio } from "@/components/ui/folio-dialogs";
import { FileField } from "@/components/ui/file-field";

type Panel = "comments" | "history" | "files";

export function DocumentPanels({
  documentId,
  viewerId,
  canEdit,
  canDelete,
  comments: initialComments,
  versions: initialVersions,
  attachments: initialAttachments,
  onDocumentReplaced,
  panel: controlledPanel,
  onPanelChange,
}: {
  documentId: string;
  viewerId: string;
  canEdit: boolean;
  canDelete: boolean;
  comments: CommentView[];
  versions: VersionListItem[];
  attachments: AttachmentView[];
  onDocumentReplaced: () => void;
  panel?: Panel;
  onPanelChange?: (panel: Panel) => void;
}) {
  const [internalPanel, setInternalPanel] = useState<Panel>("comments");
  const panel = controlledPanel ?? internalPanel;
  function setPanel(next: Panel) {
    setInternalPanel(next);
    onPanelChange?.(next);
  }
  const [comments, setComments] = useState(initialComments);
  const [versions, setVersions] = useState(initialVersions);
  const [attachments, setAttachments] = useState(initialAttachments);
  const [error, setError] = useState<string | null>(null);

  return (
    <section className="mt-8">
      <div className="flex gap-2" role="tablist" aria-label="Document tools">
        {(
          [
            ["comments", "Comments"],
            ["history", "History"],
            ["files", "Files"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={panel === id}
            onClick={() => {
              setPanel(id);
              setError(null);
            }}
            className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
              panel === id ? "bg-ink text-sheet" : "border border-line bg-sheet text-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {error ? (
        <p className="mt-3 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
      {panel === "comments" ? (
        <CommentsPanel
          documentId={documentId}
          viewerId={viewerId}
          canEdit={canEdit}
          canDelete={canDelete}
          comments={comments}
          onChange={setComments}
          onApplied={onDocumentReplaced}
          onError={setError}
        />
      ) : null}
      {panel === "history" ? (
        <HistoryPanel
          documentId={documentId}
          canEdit={canEdit}
          versions={versions}
          onChange={setVersions}
          onRestored={onDocumentReplaced}
          onError={setError}
        />
      ) : null}
      {panel === "files" ? (
        <FilesPanel
          documentId={documentId}
          viewerId={viewerId}
          canEdit={canEdit}
          canDelete={canDelete}
          attachments={attachments}
          onChange={setAttachments}
          onImported={onDocumentReplaced}
          onError={setError}
        />
      ) : null}
    </section>
  );
}

function CommentsPanel({
  documentId,
  viewerId,
  canEdit,
  canDelete,
  comments,
  onChange,
  onApplied,
  onError,
}: {
  documentId: string;
  viewerId: string;
  canEdit: boolean;
  canDelete: boolean;
  comments: CommentView[];
  onChange: (comments: CommentView[]) => void;
  onApplied: () => void;
  onError: (message: string | null) => void;
}) {
  const [body, setBody] = useState("");
  const [suggestion, setSuggestion] = useState("");
  const [kind, setKind] = useState<"comment" | "suggestion">("comment");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");

  async function publish(event: React.FormEvent) {
    event.preventDefault();
    onError(null);
    try {
      const result = await api<{ comments: CommentView[] }>(`/api/documents/${documentId}/comments`, {
        method: "POST",
        body: JSON.stringify({
          body,
          kind,
          suggestion: kind === "suggestion" ? suggestion : undefined,
        }),
      });
      onChange(result.comments);
      setBody("");
      setSuggestion("");
      setKind("comment");
    } catch (caught) {
      onError(caught instanceof Error ? caught.message : "Could not add that comment.");
    }
  }

  async function reply(parentId: string) {
    onError(null);
    try {
      const result = await api<{ comments: CommentView[] }>(`/api/documents/${documentId}/comments`, {
        method: "POST",
        body: JSON.stringify({ body: replyBody, parentId }),
      });
      onChange(result.comments);
      setReplyTo(null);
      setReplyBody("");
    } catch (caught) {
      onError(caught instanceof Error ? caught.message : "Could not reply.");
    }
  }

  async function act(commentId: string, action: "resolve" | "apply") {
    onError(null);
    try {
      const result = await api<{ comments: CommentView[]; document?: DocumentDetail }>(
        `/api/documents/${documentId}/comments/${commentId}`,
        { method: "PATCH", body: JSON.stringify({ action }) },
      );
      onChange(result.comments);
      if (action === "apply") onApplied();
    } catch (caught) {
      onError(caught instanceof Error ? caught.message : "Could not update that comment.");
    }
  }

  async function remove(commentId: string) {
    const confirmed = await confirmFolio({
      title: "Delete comment",
      message: "This comment will be removed.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!confirmed) return;
    onError(null);
    try {
      const result = await api<{ comments: CommentView[] }>(
        `/api/documents/${documentId}/comments/${commentId}`,
        { method: "DELETE" },
      );
      onChange(result.comments);
    } catch (caught) {
      onError(caught instanceof Error ? caught.message : "Could not delete that comment.");
    }
  }

  return (
    <div className="mt-4 space-y-4">
      {comments.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line px-4 py-6 text-sm text-muted">
          No comments yet.
        </p>
      ) : (
        <ul className="space-y-3">
          {comments.map((comment) => (
            <li key={comment.id} className="rounded-lg border border-line bg-sheet px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">
                    {comment.author.name}
                    <span className="ml-2 font-normal text-muted">{comment.author.email}</span>
                  </p>
                  <p className="text-xs text-muted">
                    {formatTimestamp(comment.createdAt)}
                    {comment.kind === "suggestion" ? " · Suggestion" : ""}
                    {comment.resolvedAt ? " · Resolved" : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  {!comment.resolvedAt ? (
                    <button type="button" className="text-xs font-semibold" onClick={() => void act(comment.id, "resolve")}>
                      Resolve
                    </button>
                  ) : null}
                  {canDelete || comment.author.id === viewerId ? (
                    <button type="button" className="text-xs font-semibold text-danger" onClick={() => void remove(comment.id)}>
                      Delete
                    </button>
                  ) : null}
                </div>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm">{comment.body}</p>
              {comment.suggestion ? (
                <blockquote className="mt-2 border-l-2 border-accent pl-3 text-sm text-muted">
                  {comment.suggestion}
                </blockquote>
              ) : null}
              {comment.kind === "suggestion" && canEdit && !comment.resolvedAt ? (
                <Button className="mt-3" variant="secondary" onClick={() => void act(comment.id, "apply")}>
                  Apply suggestion
                </Button>
              ) : null}
              <ul className="mt-3 space-y-2">
                {comment.replies.map((replyItem) => (
                  <li key={replyItem.id} className="rounded-md bg-paper px-3 py-2">
                    <p className="text-sm font-semibold">
                      {replyItem.author.name}
                      <span className="ml-2 font-normal text-xs text-muted">{formatTimestamp(replyItem.createdAt)}</span>
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm">{replyItem.body}</p>
                  </li>
                ))}
              </ul>
              {replyTo === comment.id ? (
                <form
                  className="mt-3 flex gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void reply(comment.id);
                  }}
                >
                  <input
                    value={replyBody}
                    onChange={(event) => setReplyBody(event.target.value)}
                    required
                    placeholder="Reply"
                    className="min-w-0 flex-1 rounded-md border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-accent"
                  />
                  <Button type="submit" variant="secondary">
                    Reply
                  </Button>
                </form>
              ) : (
                <button type="button" className="mt-2 text-xs font-semibold" onClick={() => setReplyTo(comment.id)}>
                  Reply
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={(event) => void publish(event)} className="rounded-lg border border-line bg-sheet p-4">
        <div className="flex gap-3 text-sm">
          <label className="font-semibold">
            <input
              type="radio"
              name="kind"
              checked={kind === "comment"}
              onChange={() => setKind("comment")}
              className="mr-1"
            />
            Comment
          </label>
          <label className="font-semibold">
            <input
              type="radio"
              name="kind"
              checked={kind === "suggestion"}
              onChange={() => setKind("suggestion")}
              className="mr-1"
            />
            Suggestion
          </label>
        </div>
        <label className="mt-3 block text-sm font-semibold" htmlFor="comment-body">
          {kind === "suggestion" ? "What should change?" : "Comment"}
        </label>
        <textarea
          id="comment-body"
          required
          value={body}
          onChange={(event) => setBody(event.target.value)}
          rows={3}
          className="mt-1 w-full rounded-md border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-accent"
        />
        {kind === "suggestion" ? (
          <>
            <label className="mt-3 block text-sm font-semibold" htmlFor="suggestion-body">
              Proposed text
            </label>
            <textarea
              id="suggestion-body"
              required
              value={suggestion}
              onChange={(event) => setSuggestion(event.target.value)}
              rows={3}
              className="mt-1 w-full rounded-md border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-accent"
            />
            <p className="mt-1 text-xs text-muted">This stays a proposal until someone with edit access applies it.</p>
          </>
        ) : null}
        <Button type="submit" className="mt-3">
          {kind === "suggestion" ? "Add suggestion" : "Add comment"}
        </Button>
      </form>
    </div>
  );
}

function HistoryPanel({
  documentId,
  canEdit,
  versions,
  onChange,
  onRestored,
  onError,
}: {
  documentId: string;
  canEdit: boolean;
  versions: VersionListItem[];
  onChange: (versions: VersionListItem[]) => void;
  onRestored: () => void;
  onError: (message: string | null) => void;
}) {
  const [preview, setPreview] = useState<VersionDetail | null>(null);

  async function open(versionId: string) {
    onError(null);
    try {
      const result = await api<{ version: VersionDetail }>(
        `/api/documents/${documentId}/versions/${versionId}`,
      );
      setPreview(result.version);
    } catch (caught) {
      onError(caught instanceof Error ? caught.message : "Could not open that version.");
    }
  }

  async function restore(versionId: string) {
    const confirmed = await confirmFolio({
      title: "Restore version",
      message: "The current draft will be replaced with this version.",
      confirmLabel: "Restore",
    });
    if (!confirmed) return;
    onError(null);
    try {
      await api(`/api/documents/${documentId}/versions/${versionId}/restore`, { method: "POST" });
      const listed = await api<{ versions: VersionListItem[] }>(`/api/documents/${documentId}/versions`);
      onChange(listed.versions);
      setPreview(null);
      onRestored();
    } catch (caught) {
      onError(caught instanceof Error ? caught.message : "Could not restore that version.");
    }
  }

  return (
    <div className="mt-4">
      {versions.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line px-4 py-6 text-sm text-muted">
          History starts when the draft is edited.
        </p>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-sheet">
          {versions.map((version) => (
            <li key={version.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="font-semibold">{version.title}</p>
                <p className="text-xs text-muted">
                  {formatTimestamp(version.createdAt)} · {version.authorName}
                </p>
              </div>
              <div className="flex gap-2">
                <button type="button" className="text-sm font-semibold" onClick={() => void open(version.id)}>
                  View
                </button>
                {canEdit ? (
                  <button type="button" className="text-sm font-semibold" onClick={() => void restore(version.id)}>
                    Restore
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
      {preview ? (
        <div className="mt-4 rounded-lg border border-line bg-sheet p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-serif text-2xl">{preview.title}</h3>
              <p className="text-xs text-muted">
                {formatTimestamp(preview.createdAt)} · {preview.authorName}
              </p>
            </div>
            <button type="button" className="text-sm font-semibold" onClick={() => setPreview(null)}>
              Close
            </button>
          </div>
          <div className="folio-prose mt-3 min-h-0" dangerouslySetInnerHTML={{ __html: preview.content || "<p>Empty document</p>" }} />
        </div>
      ) : null}
    </div>
  );
}

function FilesPanel({
  documentId,
  viewerId,
  canEdit,
  canDelete,
  attachments,
  onChange,
  onImported,
  onError,
}: {
  documentId: string;
  viewerId: string;
  canEdit: boolean;
  canDelete: boolean;
  attachments: AttachmentView[];
  onChange: (attachments: AttachmentView[]) => void;
  onImported: () => void;
  onError: (message: string | null) => void;
}) {
  async function attach(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = event.currentTarget.elements.namedItem("file");
    const file = input instanceof HTMLInputElement ? input.files?.[0] : undefined;
    if (!file) {
      onError("Choose a file to attach.");
      return;
    }
    onError(null);
    try {
      const body = new FormData();
      body.set("file", file);
      const result = await api<{ attachments: AttachmentView[] }>(`/api/documents/${documentId}/attachments`, {
        method: "POST",
        body,
      });
      onChange(result.attachments);
      event.currentTarget.reset();
    } catch (caught) {
      onError(caught instanceof Error ? caught.message : "Could not attach that file.");
    }
  }

  async function importFile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = event.currentTarget.elements.namedItem("file");
    const file = input instanceof HTMLInputElement ? input.files?.[0] : undefined;
    if (!file) {
      onError("Choose a .txt, .md, or .docx file.");
      return;
    }
    const confirmed = await confirmFolio({
      title: "Replace document",
      message: "The current body will be replaced with this file. The title stays the same.",
      confirmLabel: "Replace",
    });
    if (!confirmed) return;
    onError(null);
    try {
      const body = new FormData();
      body.set("file", file);
      await api(`/api/documents/${documentId}/import`, { method: "POST", body });
      onImported();
    } catch (caught) {
      onError(caught instanceof Error ? caught.message : "Could not import that file.");
    }
  }

  async function remove(attachment: AttachmentView) {
    const confirmed = await confirmFolio({
      title: "Remove file",
      message: `“${attachment.filename}” will be removed from this document.`,
      confirmLabel: "Remove",
      danger: true,
    });
    if (!confirmed) return;
    onError(null);
    try {
      const result = await api<{ attachments: AttachmentView[] }>(
        `/api/documents/${documentId}/attachments/${attachment.id}`,
        { method: "DELETE" },
      );
      onChange(result.attachments);
    } catch (caught) {
      onError(caught instanceof Error ? caught.message : "Could not remove that file.");
    }
  }

  return (
    <div className="mt-4 space-y-4">
      <div className="flex flex-wrap gap-2 text-sm">
        <a className="rounded-full border border-line bg-sheet px-3 py-1.5 font-semibold" href={`/api/documents/${documentId}/export`}>
          Download Markdown
        </a>
        <a
          className="rounded-full border border-line bg-sheet px-3 py-1.5 font-semibold"
          href={`/api/documents/${documentId}/export?format=pdf`}
        >
          Download PDF
        </a>
        <a
          className="rounded-full border border-line bg-sheet px-3 py-1.5 font-semibold"
          href={`/api/documents/${documentId}/export?format=txt`}
        >
          Download text
        </a>
      </div>

      {attachments.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line px-4 py-6 text-sm text-muted">No files attached.</p>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-sheet">
          {attachments.map((file) => (
            <li key={file.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <a className="font-semibold hover:text-accent" href={`/api/documents/${documentId}/attachments/${file.id}`}>
                  {file.filename}
                </a>
                <p className="text-xs text-muted">
                  {file.uploadedByName} · {formatTimestamp(file.createdAt)} · {Math.max(1, Math.round(file.size / 1024))} KB
                </p>
              </div>
              {canDelete || file.uploadedById === viewerId ? (
                <button type="button" className="text-xs font-semibold text-danger" onClick={() => void remove(file)}>
                  Remove
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {canEdit ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <form onSubmit={(event) => void attach(event)} className="rounded-lg border border-line bg-sheet p-4">
            <h3 className="font-semibold">Attach a file</h3>
            <p className="mt-1 text-xs text-muted">PDF, image, text, Markdown, or Word. 2 MB maximum.</p>
            <FileField
              name="file"
              required
              accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.txt,.md,.docx,application/pdf,image/*,text/plain,text/markdown"
            />
            <Button type="submit" className="mt-3" variant="secondary">
              Attach
            </Button>
          </form>
          <form onSubmit={(event) => void importFile(event)} className="rounded-lg border border-line bg-sheet p-4">
            <h3 className="font-semibold">Import into this document</h3>
            <p className="mt-1 text-xs text-muted">.txt, .md, or .docx replaces the body. The title stays.</p>
            <FileField
              name="file"
              accept=".txt,.md,.markdown,.docx,text/plain,text/markdown"
              required
            />
            <Button type="submit" className="mt-3" variant="secondary">
              Replace body
            </Button>
          </form>
        </div>
      ) : (
        <p className="text-sm text-muted">Viewers can download files. They cannot attach or import.</p>
      )}
    </div>
  );
}

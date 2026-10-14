"use client";

import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "next/link";
import type { ReactNode } from "react";
import { EditorContextMenu } from "@/components/editor/context-menu";
import { MenuBar } from "@/components/editor/menu-bar";
import { Chart, PageBreak, TextAlign } from "@/components/editor/nodes";
import { Toolbar } from "@/components/editor/toolbar";
import { LogoutButton } from "@/components/shell/logout-button";

type DocumentEditorProps = {
  content: string;
  contentJson: string;
  editable: boolean;
  documentId: string;
  canDelete: boolean;
  busy: boolean;
  leading: ReactNode;
  onChange: (html: string, text: string, json: string) => void;
  onNew: () => void;
  onOpen: () => void;
  onMakeCopy: () => void;
  onShare: () => void;
  onRename: () => void;
  onHistory: () => void;
  onDelete: () => void;
  onNotice: (message: string) => void;
  viewerName: string;
  viewerEmail: string;
};

function initials(name: string): string {
  const letters = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  return letters || "?";
}

function initialContent(html: string, json: string): string | Record<string, unknown> {
  if (json.trim()) {
    try {
      const parsed = JSON.parse(json) as unknown;
      if (parsed && typeof parsed === "object") return parsed as Record<string, unknown>;
    } catch {
      // Fall back to the sanitized HTML copy.
    }
  }
  return html || "<p></p>";
}

export function DocumentEditor({
  content,
  contentJson,
  editable,
  documentId,
  canDelete,
  busy,
  leading,
  onChange,
  onNew,
  onOpen,
  onMakeCopy,
  onShare,
  onRename,
  onHistory,
  onDelete,
  onNotice,
  viewerName,
  viewerEmail,
}: DocumentEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: {
          openOnClick: false,
          autolink: true,
          defaultProtocol: "https",
        },
      }),
      PageBreak,
      TextAlign,
      Chart,
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      Image.configure({ inline: true, allowBase64: true }),
      Placeholder.configure({
        placeholder: "Start writing. This draft saves itself.",
      }),
    ],
    content: initialContent(content, contentJson),
    editable,
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    editorProps: {
      attributes: {
        class: "folio-prose",
        spellcheck: "true",
        "aria-label": "Document body",
      },
    },
    onUpdate: ({ editor: current }) => {
      onChange(current.getHTML(), current.getText(), JSON.stringify(current.getJSON()));
    },
  });

  return (
    <div>
      <header className="no-print sticky top-0 z-20 border-b border-line bg-sheet">
        <div className="flex h-[52px] items-center gap-3 px-3 sm:px-4">
          <Link href="/documents" className="shrink-0 font-serif text-[1.35rem] leading-none tracking-tight text-ink">
            Folio
          </Link>
          <span className="hidden h-5 w-px shrink-0 bg-line sm:block" aria-hidden="true" />
          <div className="min-w-0 flex-1">{leading}</div>
          <div className="flex shrink-0 items-center gap-1">
            <Link
              href="/account"
              title={`${viewerName} · ${viewerEmail}`}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-ink text-[11px] font-semibold text-sheet"
            >
              {initials(viewerName)}
            </Link>
            <LogoutButton />
          </div>
        </div>
        <div className="flex h-9 items-center border-t border-line/80 px-2 sm:px-3">
          {editor ? (
            <MenuBar
              editor={editor as Editor}
              documentId={documentId}
              canEdit={editable}
              canDelete={canDelete}
              busy={busy}
              onNew={onNew}
              onOpen={onOpen}
              onMakeCopy={onMakeCopy}
              onShare={onShare}
              onRename={onRename}
              onHistory={onHistory}
              onDelete={onDelete}
              onNotice={onNotice}
            />
          ) : null}
        </div>
        {editor ? <Toolbar editor={editor} locked={!editable} /> : null}
      </header>
      <div className="doc-canvas">
        {editor ? (
          <>
            <EditorContent editor={editor} />
            <EditorContextMenu editor={editor} editable={editable} />
          </>
        ) : (
          <div className="folio-prose text-muted">Opening the editor…</div>
        )}
      </div>
    </div>
  );
}

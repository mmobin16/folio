"use client";

import { useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { askForLink } from "@/components/editor/commands";

type MenuId = "file" | "edit" | "insert" | "format";

type Item = {
  label: string;
  shortcut?: string;
  disabled?: boolean;
  danger?: boolean;
  href?: string;
  onSelect?: () => void;
};

function packList(value: string, limit: number): string {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .join("|")
    .slice(0, limit);
}

function MenuItems({ items, onClose }: { items: Item[]; onClose: () => void }) {
  return (
    <div className="absolute left-0 top-full z-30 mt-1 min-w-56 rounded-lg border border-line bg-sheet py-1 text-sm shadow-[0_12px_40px_rgba(30,26,22,0.14)]" role="menu">
      {items.map((item) =>
        item.href ? (
          <a
            key={item.label}
            role="menuitem"
            href={item.href}
            className="flex items-center justify-between gap-6 px-3 py-1.5 text-ink hover:bg-ink/5"
            onClick={onClose}
          >
            <span>{item.label}</span>
          </a>
        ) : (
          <button
            key={item.label}
            type="button"
            role="menuitem"
            disabled={item.disabled}
            className={`flex w-full items-center justify-between gap-6 px-3 py-1.5 text-left hover:bg-ink/5 disabled:text-muted disabled:hover:bg-transparent ${
              item.danger ? "text-danger" : "text-ink"
            }`}
            onClick={() => {
              item.onSelect?.();
              onClose();
            }}
          >
            <span>{item.label}</span>
            {item.shortcut ? <span className="text-xs text-muted">{item.shortcut}</span> : null}
          </button>
        ),
      )}
    </div>
  );
}

export function MenuBar({
  editor,
  documentId,
  canEdit,
  canDelete,
  busy,
  onNew,
  onOpen,
  onMakeCopy,
  onShare,
  onRename,
  onHistory,
  onDelete,
  onNotice,
}: {
  editor: Editor;
  documentId: string;
  canEdit: boolean;
  canDelete: boolean;
  busy: boolean;
  onNew: () => void;
  onOpen: () => void;
  onMakeCopy: () => void;
  onShare: () => void;
  onRename: () => void;
  onHistory: () => void;
  onDelete: () => void;
  onNotice: (message: string) => void;
}) {
  const [open, setOpen] = useState<MenuId | null>(null);
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(3);
  const [chartTitle, setChartTitle] = useState("Chart");
  const [chartLabels, setChartLabels] = useState("Jan, Feb, Mar");
  const [chartValues, setChartValues] = useState("40, 70, 55");
  const rootRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onPointer(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(null);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(null);
    }
    window.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  function toggle(id: MenuId) {
    setOpen((current) => (current === id ? null : id));
  }

  function insertImage(file: File) {
    if (!file.type.startsWith("image/")) {
      onNotice("Choose a PNG, JPEG, GIF, or WebP image.");
      return;
    }
    if (file.size > 1_500_000) {
      onNotice("Images must be 1.5 MB or smaller.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const src = typeof reader.result === "string" ? reader.result : "";
      if (!src.startsWith("data:image/") || src.length > 2_500_000) {
        onNotice("That image could not be added.");
        return;
      }
      editor.chain().focus().setImage({ src, alt: file.name }).run();
    };
    reader.readAsDataURL(file);
  }

  const fileItems: Item[] = [
    { label: "New", disabled: busy, onSelect: onNew },
    { label: "Open", onSelect: onOpen },
    { label: "Make a copy", disabled: busy, onSelect: onMakeCopy },
    { label: "Share", onSelect: onShare },
    { label: "Download Markdown", href: `/api/documents/${documentId}/export` },
    { label: "Download PDF", href: `/api/documents/${documentId}/export?format=pdf` },
    { label: "Download text", href: `/api/documents/${documentId}/export?format=txt` },
    { label: "Rename", disabled: !canEdit, onSelect: onRename },
    { label: "Version history", onSelect: onHistory },
    { label: "Print", shortcut: "Ctrl+P", onSelect: () => window.print() },
    { label: "Move to trash", danger: true, disabled: !canDelete, onSelect: onDelete },
  ];

  const editItems: Item[] = [
    { label: "Undo", shortcut: "Ctrl+Z", disabled: !canEdit || !editor.can().undo(), onSelect: () => editor.chain().focus().undo().run() },
    { label: "Redo", shortcut: "Ctrl+Y", disabled: !canEdit || !editor.can().redo(), onSelect: () => editor.chain().focus().redo().run() },
    {
      label: "Cut",
      shortcut: "Ctrl+X",
      disabled: !canEdit || editor.state.selection.empty,
      onSelect: () => {
        document.execCommand("copy");
        editor.chain().focus().deleteSelection().run();
      },
    },
    {
      label: "Copy",
      shortcut: "Ctrl+C",
      disabled: editor.state.selection.empty,
      onSelect: () => document.execCommand("copy"),
    },
    { label: "Select all", shortcut: "Ctrl+A", onSelect: () => editor.chain().focus().selectAll().run() },
    {
      label: "Delete",
      disabled: !canEdit || editor.state.selection.empty,
      onSelect: () => editor.chain().focus().deleteSelection().run(),
    },
  ];

  const formatItems: Item[] = [
    { label: "Bold", shortcut: "Ctrl+B", disabled: !canEdit, onSelect: () => editor.chain().focus().toggleBold().run() },
    { label: "Italic", shortcut: "Ctrl+I", disabled: !canEdit, onSelect: () => editor.chain().focus().toggleItalic().run() },
    { label: "Underline", shortcut: "Ctrl+U", disabled: !canEdit, onSelect: () => editor.chain().focus().toggleUnderline().run() },
    { label: "Paragraph", disabled: !canEdit, onSelect: () => editor.chain().focus().setParagraph().run() },
    { label: "Heading 1", disabled: !canEdit, onSelect: () => editor.chain().focus().toggleHeading({ level: 1 }).run() },
    { label: "Heading 2", disabled: !canEdit, onSelect: () => editor.chain().focus().toggleHeading({ level: 2 }).run() },
    { label: "Heading 3", disabled: !canEdit, onSelect: () => editor.chain().focus().toggleHeading({ level: 3 }).run() },
    { label: "Bulleted list", disabled: !canEdit, onSelect: () => editor.chain().focus().toggleBulletList().run() },
    { label: "Numbered list", disabled: !canEdit, onSelect: () => editor.chain().focus().toggleOrderedList().run() },
    { label: "Link", shortcut: "Ctrl+K", disabled: !canEdit, onSelect: () => askForLink(editor) },
  ];

  const menus: Array<{ id: MenuId; label: string; items?: Item[] }> = [
    { id: "file", label: "File", items: fileItems },
    { id: "edit", label: "Edit", items: editItems },
    { id: "insert", label: "Insert" },
    { id: "format", label: "Format", items: formatItems },
  ];

  return (
    <div ref={rootRef} className="flex items-center gap-0.5" role="menubar">
      <input
        ref={imageRef}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) insertImage(file);
          setOpen(null);
        }}
      />
      {menus.map((menu) => (
        <div key={menu.id} className="relative">
          <button
            type="button"
            role="menuitem"
            aria-expanded={open === menu.id}
            aria-haspopup="menu"
            className={`rounded-md px-2.5 py-1 text-[13px] text-ink/80 ${open === menu.id ? "bg-ink/5 text-ink" : "hover:bg-ink/5 hover:text-ink"}`}
            onClick={() => toggle(menu.id)}
          >
            {menu.label}
          </button>
          {open === menu.id && menu.items ? <MenuItems items={menu.items} onClose={() => setOpen(null)} /> : null}
          {open === "insert" && menu.id === "insert" ? (
            <div className="absolute left-0 top-full z-30 mt-1 w-72 rounded-lg border border-line bg-sheet p-2 text-sm shadow-[0_12px_40px_rgba(30,26,22,0.14)]" role="menu">
              <button
                type="button"
                role="menuitem"
                disabled={!canEdit}
                className="block w-full rounded-md px-2 py-1.5 text-left hover:bg-ink/5 disabled:text-muted"
                onClick={() => imageRef.current?.click()}
              >
                Image
              </button>
              <form
                className="mt-1 rounded-md px-2 py-2 hover:bg-ink/5"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!canEdit) return;
                  editor
                    .chain()
                    .focus()
                    .insertTable({
                      rows: Math.min(20, Math.max(1, rows)),
                      cols: Math.min(12, Math.max(1, cols)),
                      withHeaderRow: true,
                    })
                    .run();
                  setOpen(null);
                }}
              >
                <p className="font-semibold">Table</p>
                <div className="mt-2 flex items-center gap-2">
                  <label className="text-xs text-muted">
                    Rows
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={rows}
                      disabled={!canEdit}
                      onChange={(event) => setRows(Number(event.target.value))}
                      className="ml-1 w-14 rounded border border-line bg-sheet px-1 py-0.5"
                    />
                  </label>
                  <label className="text-xs text-muted">
                    Columns
                    <input
                      type="number"
                      min={1}
                      max={12}
                      value={cols}
                      disabled={!canEdit}
                      onChange={(event) => setCols(Number(event.target.value))}
                      className="ml-1 w-14 rounded border border-line bg-sheet px-1 py-0.5"
                    />
                  </label>
                  <button type="submit" disabled={!canEdit} className="rounded-full bg-ink px-2.5 py-1 text-xs font-semibold text-sheet disabled:opacity-40">
                    Insert
                  </button>
                </div>
              </form>
              <form
                className="mt-1 rounded-md px-2 py-2 hover:bg-ink/5"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!canEdit) return;
                  editor
                    .chain()
                    .focus()
                    .insertContent({
                      type: "chart",
                      attrs: {
                        title: chartTitle.trim().slice(0, 80) || "Chart",
                        labels: packList(chartLabels, 400),
                        values: packList(chartValues, 200),
                      },
                    })
                    .run();
                  setOpen(null);
                }}
              >
                <p className="font-semibold">Chart</p>
                <label className="mt-2 block text-xs text-muted">
                  Title
                  <input
                    value={chartTitle}
                    disabled={!canEdit}
                    maxLength={80}
                    onChange={(event) => setChartTitle(event.target.value)}
                    className="mt-1 w-full rounded border border-line bg-sheet px-2 py-1 text-sm text-ink"
                  />
                </label>
                <label className="mt-2 block text-xs text-muted">
                  Labels, separated by commas
                  <input
                    value={chartLabels}
                    disabled={!canEdit}
                    onChange={(event) => setChartLabels(event.target.value)}
                    className="mt-1 w-full rounded border border-line bg-sheet px-2 py-1 text-sm text-ink"
                  />
                </label>
                <label className="mt-2 block text-xs text-muted">
                  Values, separated by commas
                  <input
                    value={chartValues}
                    disabled={!canEdit}
                    onChange={(event) => setChartValues(event.target.value)}
                    className="mt-1 w-full rounded border border-line bg-sheet px-2 py-1 text-sm text-ink"
                  />
                </label>
                <button type="submit" disabled={!canEdit} className="mt-2 rounded-full bg-ink px-2.5 py-1 text-xs font-semibold text-sheet disabled:opacity-40">
                  Insert chart
                </button>
              </form>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import type { Editor } from "@tiptap/react";
import { askForLink, pasteFromClipboard, selectedText } from "@/components/editor/commands";

type MenuState = { x: number; y: number } | null;

export function EditorContextMenu({ editor, editable }: { editor: Editor; editable: boolean }) {
  const [menu, setMenu] = useState<MenuState>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const dom = editor.view.dom;
    function onContext(event: Event) {
      const mouse = event as MouseEvent;
      event.preventDefault();
      const width = 240;
      const height = 280;
      setNotice(null);
      setMenu({
        x: Math.max(8, Math.min(mouse.clientX, window.innerWidth - width - 8)),
        y: Math.max(8, Math.min(mouse.clientY, window.innerHeight - height - 8)),
      });
    }
    dom.addEventListener("contextmenu", onContext);
    return () => dom.removeEventListener("contextmenu", onContext);
  }, [editor]);

  useEffect(() => {
    if (!menu) return;
    function close() {
      setMenu(null);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }
    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", close, true);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", close, true);
    };
  }, [menu]);

  if (!menu) return null;

  const hasSelection = !editor.state.selection.empty;

  async function copySelection() {
    const text = selectedText(editor);
    try {
      if (text && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        document.execCommand("copy");
      }
    } catch {
      document.execCommand("copy");
    }
    setMenu(null);
  }

  async function cutSelection() {
    await copySelection();
    editor.chain().focus().deleteSelection().run();
  }

  async function paste(plain: boolean) {
    try {
      await pasteFromClipboard(editor, plain);
      setMenu(null);
    } catch {
      setNotice("Allow clipboard access to paste.");
    }
  }

  const items: Array<{ label: string; disabled?: boolean; action: () => void }> = [
    { label: "Cut", disabled: !editable || !hasSelection, action: () => void cutSelection() },
    { label: "Copy", disabled: !hasSelection, action: () => void copySelection() },
    { label: "Paste", disabled: !editable, action: () => void paste(false) },
    { label: "Paste without formatting", disabled: !editable, action: () => void paste(true) },
    {
      label: "Delete",
      disabled: !editable || !hasSelection,
      action: () => {
        editor.chain().focus().deleteSelection().run();
        setMenu(null);
      },
    },
  ];

  return (
    <div
      className="fixed z-40 w-60 overflow-hidden rounded-lg border border-line bg-sheet py-1 text-sm shadow-[0_12px_40px_rgba(30,26,22,0.16)]"
      style={{ left: menu.x, top: menu.y }}
      role="menu"
      onPointerDown={(event) => event.stopPropagation()}
    >
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          role="menuitem"
          disabled={item.disabled}
          className="block w-full px-3 py-1.5 text-left text-ink hover:bg-ink/5 disabled:text-muted disabled:hover:bg-transparent"
          onMouseDown={(event) => event.preventDefault()}
          onClick={item.action}
        >
          {item.label}
        </button>
      ))}
      <div className="my-1 border-t border-line" />
      <button
        type="button"
        role="menuitem"
        disabled={!editable}
        className="block w-full px-3 py-1.5 text-left text-ink hover:bg-ink/5 disabled:text-muted"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => {
          setMenu(null);
          askForLink(editor);
        }}
      >
        Insert link
      </button>
      {notice ? <p className="px-3 py-1.5 text-xs text-danger">{notice}</p> : null}
    </div>
  );
}

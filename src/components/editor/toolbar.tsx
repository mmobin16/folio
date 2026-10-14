"use client";

import { useEffect } from "react";
import type { Editor } from "@tiptap/react";
import { askForLink } from "@/components/editor/commands";

function ToolButton({
  active,
  disabled,
  locked = false,
  label,
  onClick,
  className = "",
  children,
}: {
  active?: boolean;
  disabled?: boolean;
  locked?: boolean;
  label: string;
  onClick: () => void;
  className?: string;
  children: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={label}
      title={label}
      disabled={locked || disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={`shrink-0 rounded px-2 py-1 text-sm transition disabled:opacity-40 ${
        active ? "bg-ink/10 text-ink" : "text-ink hover:bg-ink/5"
      } ${className}`}
    >
      {children}
    </button>
  );
}

export function Toolbar({ editor, locked = false }: { editor: Editor; locked?: boolean }) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        askForLink(editor);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editor]);

  return (
    <div className="flex items-center gap-0.5 overflow-x-auto border-t border-line bg-[#f6f1ea] px-2 py-1 sm:px-3" role="toolbar" aria-label="Formatting">
      <ToolButton
        locked={locked}
        label="Bold (Ctrl+B)"
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
        className="font-bold"
      >
        B
      </ToolButton>
      <ToolButton
        locked={locked}
        label="Italic (Ctrl+I)"
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className="font-serif"
      >
        𝐼
      </ToolButton>
      <ToolButton
        locked={locked}
        label="Underline (Ctrl+U)"
        active={editor.isActive("underline")}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className="underline underline-offset-2"
      >
        U
      </ToolButton>
      <ToolButton
        locked={locked}
        label="Link (Ctrl+K)"
        active={editor.isActive("link")}
        onClick={() => askForLink(editor)}
      >
        Link
      </ToolButton>
      <span className="mx-1 h-5 w-px bg-line" aria-hidden="true" />
      <ToolButton
        locked={locked}
        label="Paragraph"
        active={editor.isActive("paragraph")}
        onClick={() => editor.chain().focus().setParagraph().run()}
      >
        Text
      </ToolButton>
      <ToolButton
        locked={locked}
        label="Heading 1"
        active={editor.isActive("heading", { level: 1 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
      >
        H1
      </ToolButton>
      <ToolButton
        locked={locked}
        label="Heading 2"
        active={editor.isActive("heading", { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        H2
      </ToolButton>
      <ToolButton
        locked={locked}
        label="Heading 3"
        active={editor.isActive("heading", { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        H3
      </ToolButton>
      <span className="mx-1 h-5 w-px bg-line" aria-hidden="true" />
      <ToolButton
        locked={locked}
        label="Bulleted list"
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        List
      </ToolButton>
      <ToolButton
        locked={locked}
        label="Numbered list"
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        1. List
      </ToolButton>
      <ToolButton
        locked={locked}
        label="Quote"
        active={editor.isActive("blockquote")}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        Quote
      </ToolButton>
      <span className="mx-1 hidden h-5 w-px bg-line sm:block" aria-hidden="true" />
      <ToolButton
        locked={locked}
        label="Undo"
        disabled={!editor.can().undo()}
        onClick={() => editor.chain().focus().undo().run()}
      >
        Undo
      </ToolButton>
      <ToolButton
        locked={locked}
        label="Redo"
        disabled={!editor.can().redo()}
        onClick={() => editor.chain().focus().redo().run()}
      >
        Redo
      </ToolButton>
    </div>
  );
}

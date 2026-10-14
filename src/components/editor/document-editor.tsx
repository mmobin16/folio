"use client";

import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Toolbar } from "@/components/editor/toolbar";

type DocumentEditorProps = {
  content: string;
  editable: boolean;
  onChange: (html: string, text: string) => void;
};

export function DocumentEditor({ content, editable, onChange }: DocumentEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({
        placeholder: "Start writing. This draft saves itself.",
      }),
    ],
    content: content || "<p></p>",
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
      onChange(current.getHTML(), current.getText());
    },
  });

  return (
    <div className="sheet overflow-hidden rounded-lg border border-line">
      {editable && editor ? <Toolbar editor={editor} /> : null}
      {editor ? (
        <EditorContent editor={editor} />
      ) : (
        <div className="folio-prose text-muted">Opening the editor…</div>
      )}
    </div>
  );
}

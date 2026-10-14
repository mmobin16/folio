import type { Editor } from "@tiptap/react";
import { promptFolio } from "@/components/ui/folio-dialogs";

export async function askForLink(editor: Editor) {
  const previous = editor.getAttributes("link").href as string | undefined;
  const url = await promptFolio({
    title: "Insert link",
    label: "Link URL",
    value: previous ?? "https://",
    confirmLabel: "Apply",
  });
  if (url === null) return;
  if (!url.trim()) {
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    return;
  }
  editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
}

export function insertPlainText(editor: Editor, text: string) {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const content = lines.map((line) => ({
    type: "paragraph",
    content: line ? [{ type: "text", text: line }] : [],
  }));
  editor.chain().focus().insertContent(content).run();
}

export async function pasteFromClipboard(editor: Editor, plain: boolean) {
  if (!plain && typeof navigator.clipboard.read === "function") {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        if (!item.types.includes("text/html")) continue;
        const html = await (await item.getType("text/html")).text();
        editor.chain().focus().insertContent(html).run();
        return;
      }
    } catch {
      // Fall through to plain text when the browser withholds rich clipboard data.
    }
  }

  const text = await navigator.clipboard.readText();
  insertPlainText(editor, text);
}

export function selectedText(editor: Editor): string {
  const { from, to } = editor.state.selection;
  return editor.state.doc.textBetween(from, to, "\n");
}

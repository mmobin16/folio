/** Sample drafts created the first time the database is empty. */

export const WELCOME_TITLE = "Welcome to Folio";
export const CHECKLIST_TITLE = "Launch checklist";
export const READING_TITLE = "Reading notes";

export const WELCOME_HTML = `
<h1>Welcome to Folio</h1>
<p>This draft belongs to <strong>Alex Rivera</strong> and is shared with <strong>Jordan Lee</strong> as an editor.</p>
<h2>Try the editor</h2>
<ul>
  <li>Select a word and mark it <strong>bold</strong>, <em>italic</em>, or <u>underline</u>.</li>
  <li>Use the heading controls to change the size of a line.</li>
  <li>Start a bulleted list or a numbered list.</li>
</ul>
<h2>How sharing works</h2>
<ol>
  <li>The owner can invite another seeded account.</li>
  <li>Editors can change the title and the body.</li>
  <li>Viewers can read, but the toolbar stays hidden.</li>
</ol>
<blockquote><p>Only the owner can delete a document or change who has access.</p></blockquote>
<p>Edits save themselves. You can also press Ctrl+S or Cmd+S.</p>
`.trim();

export const CHECKLIST_HTML = `
<h1>Launch checklist</h1>
<p>This document is private. Jordan cannot open it until Alex shares it.</p>
<ol>
  <li>Write the draft.</li>
  <li>Share it with the right permission.</li>
  <li>Export a Markdown copy if you need one outside Folio.</li>
</ol>
`.trim();

export const READING_HTML = `
<h1>Reading notes</h1>
<p>Jordan's private notebook. It shows up under <em>Your documents</em> for Jordan and nowhere for Alex.</p>
<ul>
  <li>Owned documents and shared documents are separate lists.</li>
  <li>Share this note with Alex if you want a second pair of eyes.</li>
</ul>
`.trim();

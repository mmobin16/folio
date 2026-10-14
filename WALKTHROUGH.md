# Walkthrough script

Aim for 3 to 5 minutes. Record an unlisted YouTube or Loom video, then paste the public URL into `WALKTHROUGH_URL.txt`.

## 0:00 — What this is

"This is Folio, a small shared writing desk. I did not try to rebuild Google Docs. I focused on creating a draft, formatting it, saving it, importing a file, and sharing it with a second person."

Show the login screen. Point at the two demo accounts and the shared password `ajaia-demo`.

## 0:40 — Write and save

Sign in as Alex Rivera. Open **Welcome to Folio**.

- Show bold, italic, underline, a heading, and a list already in the document.
- Change the title or a sentence and wait until the status says **Saved**.
- Refresh the page and show that the change is still there.

## 1:40 — Share

Open **Share**.

- Alex is the owner. Jordan already has **Can edit**.
- Explain the rule: editors can change the draft, viewers cannot, and only the owner can delete or change access.
- Optional: open **Launch checklist** and grant Jordan **Can view**.

## 2:30 — The other person

Sign out. Sign in as Jordan Lee.

- **Reading notes** is under **Your documents**.
- **Welcome to Folio** is under **Shared with you**, from Alex.
- Open the welcome draft and show the toolbar, because Jordan can edit.
- If you granted view access on the checklist, open it and show the read-only banner and the missing toolbar.
- Open **Share** and show that Jordan cannot change the access list.

## 3:20 — Import

Go back to the desk. Choose **Import file** and upload `samples/plan.md` or `samples/standup.txt`.

- Mention the limit: `.txt`, `.md`, and `.docx`, up to 2 MB. Images in Word files are dropped.
- Show the new document open in the editor.

## 4:00 — What I left out, and how I used AI

"I left out live co-editing, comments, and version history. Two editors can overwrite each other, and the save returns a conflict instead of merging. I would add a simple version list next."

"I used Cursor with an AI agent to draft the Next.js app, the editor, and the tests. I rejected a CRDT, a required paid database, and storing unsanitized HTML. I checked it with the test suite, a production build, and this click-through."

Mention the README for local setup and the Turso variables for the Vercel deploy.

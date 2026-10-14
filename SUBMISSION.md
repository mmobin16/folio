# Submission

Candidate: Mobin Kashif (`mobin.kashif112233@gmail.com`)

Product: **Folio**, a shared writing desk for the Ajaia AI-Native Full Stack Developer assignment.

Folio is a Google Docs–style editor in a warm paper theme. A signed-in person can write, format, import, save, share, comment, and export. Access rules are enforced on the server. The same schema runs on a local SQLite file and on Turso when the app is deployed.

## What is in this folder

| Item | Path |
| --- | --- |
| Source | this repository (`src/`, `prisma/`, `tests/`, `samples/`) |
| Local setup and run instructions | [README.md](README.md) |
| Architecture note | [ARCHITECTURE.md](ARCHITECTURE.md) |
| AI workflow note | [AI_WORKFLOW.md](AI_WORKFLOW.md) |
| This file | [SUBMISSION.md](SUBMISSION.md) |
| Walkthrough script | [WALKTHROUGH.md](WALKTHROUGH.md) |
| Walkthrough video URL | [WALKTHROUGH_URL.txt](WALKTHROUGH_URL.txt) |
| Files to try in Import | `samples/plan.md`, `samples/standup.txt` |

## Reviewer access

Password for both accounts: `ajaia-demo`

- Alex Rivera — `alex.rivera@ajaia.dev` — owner of **Welcome to Folio** (shared, edit, with Jordan) and the private **Launch checklist**
- Jordan Lee — `jordan.lee@ajaia.dev` — editor on the welcome draft, owner of the private **Reading notes**

No paid service is required to run the app locally. Production on Vercel needs a free Turso database. The steps are in the README. On a fresh database the app creates the tables and seeds these two accounts on the first request.

## Live URL

Add the Vercel deployment URL here after import:

```text
https://
```

Set `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` on the Vercel project before the first request.

## Technology

| Layer | Choice | Role in Folio |
| --- | --- | --- |
| App | Next.js 16.4 App Router, React 19.3, TypeScript 5 | Pages and HTTP API in one project |
| Styling | Tailwind CSS 4 | Desk, editor chrome, and the paper page |
| Editor | TipTap 3.32 (ProseMirror) | Rich text, tables, images, page breaks, charts |
| Validation | Zod 3 | Request bodies on every mutation |
| HTML safety | sanitize-html | Allow-list for stored document HTML |
| Import | mammoth, marked, jszip | Word, Markdown, and zip reading |
| Export | turndown, a small PDF writer | Markdown, plain text, and PDF download |
| Data | Prisma 6.19, `@libsql/client` 0.18 | Typed queries against SQLite or Turso |
| Auth | Node `scrypt`, SHA-256 session hashes | Passwords and cookie tokens, no native bcrypt addon |
| Tests | Vitest 5 | Unit tests plus one real SQLite integration file |
| Hosting target | Vercel + Turso (libSQL) | Serverless app, hosted SQLite-compatible database |

Local development uses `prisma/dev.db`. If `TURSO_DATABASE_URL` is set, the running app uses that database instead. Prisma CLI itself always targets the local file.

## Features implemented

### Accounts and sessions

- Register, log in, and log out.
- Password rules and email checks on the forms and again in Zod on the API.
- Session cookie `folio_session`: HttpOnly, SameSite=Lax, Secure in production, seven days. The database stores the SHA-256 hash of the token, not the token.
- `/documents` and `/account` redirect anonymous visitors to login. Every page and API call still loads the session from the database, so a stale cookie is not treated as a person.
- Profile page: change the public name. Email stays the login identity.
- Two seeded demo accounts so a reviewer can open a shared draft immediately.
- Mutations reject a cross-origin `Origin` header.

### Desk

- Create a blank document, open it, rename it, and delete it. Delete uses a Folio dialog, not the browser’s `confirm`.
- Search by title.
- Sort the lists.
- Empty states when a list has no documents.
- **Your documents** and **Shared with you** are separate.
- Make a copy of the open document.

### Editor

The document opens in a three-row bar: title and Share on the first row, File / Edit / Insert / Format under that, then the formatting strip.

- Formatting: bold, italic, underline, headings 1–3, bulleted and numbered lists, quote, link, undo, and redo. Keyboard shortcuts include Ctrl/Cmd+B, I, U, K, and S.
- Insert: image (png, jpeg, gif, webp), table, and a bar chart.
- Right-click on a selection: Cut, Copy, Paste, Paste without formatting, Delete, Insert link.
- File menu: New, Open, Make a copy, Share, download Markdown / PDF / text, Rename, Version history, Print, Move to trash.
- Autosave about 700 ms after a change. Ctrl/Cmd+S saves immediately. The header shows Saved, Saving, or Unsaved changes, plus a word count.
- The body is stored twice: sanitized HTML in `content`, and cleaned TipTap JSON in `contentJson`. The first editor update after load is ignored so opening a document does not mark it dirty.
- Saves send `baseUpdatedAt`. If someone else saved in between, the API returns 409 and asks for a reload instead of overwriting the newer copy.
- Centered and right-aligned paragraphs survive import and save.
- Page breaks render as a gap between sheets. Print hides the chrome.

### Import

`POST /api/documents/import` creates a new document. `POST /api/documents/:id/import` replaces the body of the open document and keeps the title. Both accept `.txt`, `.md`, and `.docx`, up to 2 MB.

- Plain text is escaped, so a `.txt` file cannot smuggle HTML.
- Markdown is rendered with `marked`, then passed through the same sanitizer as the editor.
- A `.docx` file must be a zip. Mammoth converts the body. Pictures in the header are copied onto the document so the logo can render. The page header is placed at the top of every page when the file has a page break or a next-page section break.
- Tables stay tables. Embedded png, jpeg, gif, and webp images are kept as data URLs. Other data URLs are dropped.
- Floating text boxes, such as the weight box on a log sheet, are kept once and placed on the right of the following section line. Word stores that box twice (drawing plus fallback); Folio keeps one copy.
- The sanitizer allow-list is the tags the editor can round-trip. Scripts, event handlers, and `javascript:` links are removed.

A Word file already saved in Folio does not change until it is imported again. Import rewrites the stored HTML.

### Sharing

- The owner searches for a person by name or email and grants **Can view** or **Can edit**.
- The same person cannot be added twice.
- Revoke asks for confirmation, then deletes that share.
- Editors can change the draft. Viewers can read, comment, and suggest. Only the owner can change access or delete the document.
- The page hides controls the person cannot use. The API checks the role again on every request.
- A document you cannot see returns 403 when the row exists, and 404 when it does not.

### Comments, history, presence, files

- Comments and replies. A comment can be a suggestion. The author or an editor can resolve a thread. An editor can apply a suggestion into the draft. Delete asks for confirmation.
- Version history stores snapshots. An editor can restore one. Restore asks for confirmation.
- Presence is a heartbeat about every 8 seconds. The header shows who else has the document open. It records viewing and editing. It does not merge two people typing at once.
- Attachments upload on the Files tab, with the same 2 MB limit. Editors can remove a file after confirmation.

### Export

Anyone who can read the document can download:

- Markdown, via turndown
- Plain text
- PDF, a simple text PDF (Helvetica). It does not draw tables or images.

## Data stored

| Record | What it holds |
| --- | --- |
| User | Email, name, scrypt password hash |
| Profile | Public name and email |
| Session | Token hash and expiry |
| Document | Title, sanitized HTML, TipTap JSON, owner, timestamps |
| DocumentShare | `view` or `edit`. Unknown values are treated as view |
| DocumentVersion | Snapshot used by history and restore |
| Comment | Body, parent reply, suggestion flag, resolved state |
| DocumentPresence | Who is on the document, and whether they are viewing or editing |
| Attachment | File bytes and metadata for the Files tab |

## API

| Method | Path | Who |
| --- | --- | --- |
| POST | `/api/auth/register` | public, then signs the new person in |
| POST | `/api/auth/login` | public |
| POST | `/api/auth/logout` | any cookie |
| GET, PATCH | `/api/account` | signed in |
| GET | `/api/users/search` | signed in |
| GET, POST | `/api/documents` | signed in |
| POST | `/api/documents/import` | signed in, creates a draft |
| GET, PATCH, DELETE | `/api/documents/:id` | access rules above |
| POST | `/api/documents/:id/import` | editor or owner |
| PUT | `/api/documents/:id/share` | owner |
| DELETE | `/api/documents/:id/share/:userId` | owner |
| GET | `/api/documents/:id/export` | anyone who can read. Markdown by default, `?format=pdf` or `?format=txt` |
| GET, POST | `/api/documents/:id/comments` | anyone who can read |
| PATCH, DELETE | `/api/documents/:id/comments/:commentId` | resolve, apply, or delete |
| GET | `/api/documents/:id/versions` | anyone who can read |
| POST | `/api/documents/:id/versions/:versionId/restore` | editor or owner |
| GET, POST, DELETE | `/api/documents/:id/presence` | anyone who can read |
| GET, POST | `/api/documents/:id/attachments` | read to list, edit to upload |
| GET, DELETE | `/api/documents/:id/attachments/:attachmentId` | read to download, edit to remove |

Validation errors return `{ error: string }` with a 4xx status. Unexpected failures return a generic 500 and log the cause on the server.

## Tests and results

Command: `npx vitest run` from the `folio` directory.

Result on 15 October 2026, local Windows, Vitest 5.0.4:

```text
Test Files  4 passed (4)
Tests       30 passed (30)
Duration    2.54s
```

| File | Tests | What they lock |
| --- | --- | --- |
| `tests/permissions.test.ts` | 5 | Owner, editor, viewer, stranger, and a bad permission value |
| `tests/content.test.ts` | 8 | HTML sanitizing, TipTap JSON, PDF and plain text, Markdown export, passwords |
| `tests/import-file.test.ts` | 12 | Text, Markdown, and Word import, including pages, headers, images, and weight boxes |
| `tests/access.integration.test.ts` | 5 | A real temporary SQLite file through the same startup path as production |

### `tests/permissions.test.ts`

- The owner can edit, share, and delete.
- An editor can change the draft and cannot change the access list.
- A viewer is read only.
- Someone who was never invited is refused.
- An unknown permission value is treated as view.

### `tests/content.test.ts`

- Editor formatting is kept and script tags are dropped.
- `javascript:` links are rejected.
- A short plain-text preview is built from HTML.
- A TipTap document is kept and unsafe links are dropped.
- PDF and plain-text downloads are produced.
- A heading and a list become Markdown.
- Download file names are made safe.
- A matching password verifies, and a different one does not.

### `tests/import-file.test.ts`

- HTML in a `.txt` file is escaped, and blank lines stay paragraph breaks.
- Markdown headings, emphasis, and lists become document HTML.
- The document title comes from the file name.
- A Word table, the page header, and an embedded logo are kept.
- A page break splits the file and the header is repeated on both pages.
- A `lastRenderedPageBreak` inside a paragraph still repeats the header.
- A weight box that lives in a table cell stays in that row.
- A floating weight box that Word stored twice appears once, beside the section title.
- Safe image data URLs are kept and other data URLs are dropped.
- Page-break and chart divs are kept. Other divs, including ones with event handlers, are dropped.
- Centered text is kept. Other CSS is dropped.
- Unsupported types and empty files are rejected.

### `tests/access.integration.test.ts`

This file boots a temporary SQLite database through `ensureDatabase`, the same path a fresh Turso database uses. It would fail if the hand-written startup SQL drifted from the Prisma schema.

- The seed creates an owned draft and a shared draft with different visibility.
- An editor can update a shared draft. A viewer cannot.
- A private document stays hidden. A save with a stale `baseUpdatedAt` is refused (409).
- Sharing with an unknown email is rejected. An existing share can be revoked.
- The same database covers registration, structured saves, comments, version history, presence, and file attachments.

## Limits

- Presence shows who has the document open. It does not merge keystrokes. Two people who save at once: the later save gets 409 and is asked to reload.
- PDF export is text only. Tables and images stay in the editor and in Markdown/HTML. They are not drawn in the PDF.
- Word import keeps structure: tables, the repeating header, page breaks, pictures, and one copy of each floating weight box beside the following section line. It does not reproduce Google Docs column widths or absolute floating positions.
- A document that was imported before an import-pipeline change keeps its old HTML until the file is imported again.

## Still open

- The walkthrough video is not recorded yet. The script is `WALKTHROUGH.md`. Paste the public URL into `WALKTHROUGH_URL.txt` and into the assignment form.
- The live URL above is blank until the Vercel project is created.

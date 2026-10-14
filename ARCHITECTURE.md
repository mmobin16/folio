# Architecture

Folio is one product slice: a person writes a draft, saves it, and lets one other person read or edit it. The assignment also asks for file import and for the result to survive a refresh. Those four behaviors — edit, save, share, import — drove the structure. Everything else was cut so those four could be finished and tested.

## Stack

| Layer | Choice | Why |
| --- | --- | --- |
| UI | Next.js 16 App Router, React 19, TypeScript | One project for pages and the API. Deploys on Vercel without a separate backend. |
| Editor | TipTap 3 (ProseMirror) | Bold, italic, underline, headings, and lists are maintained extensions, including keyboard shortcuts. |
| API | Route handlers | Sharing rules are easier to audit as HTTP endpoints than as server actions scattered through components. |
| Database | Prisma 6 on SQLite / libSQL | Relational data (owner, share, session) with typed queries. The same schema runs on a local file and on Turso. |
| Tests | Vitest | Fast unit tests plus one test that uses a real SQLite file. |

Prisma CLI always targets `prisma/dev.db`. At runtime, `src/lib/db.ts` uses `TURSO_DATABASE_URL` when it is set and otherwise opens the same local file. An empty database receives `INIT_SQL` (generated from the Prisma schema) and then the demo seed. That startup step is what lets a fresh Turso database work on Vercel without a shell session.

## Data model

```text
User 1──* Document        the owner
User 1──* Session         login tokens, stored as SHA-256 hashes
User 1──* DocumentShare   access granted by the owner
Document 1──* DocumentShare
```

`Document.content` is sanitized HTML, not a custom JSON tree. TipTap already round-trips the tags we allow (paragraphs, headings, lists, bold, italic, underline, quotes, links). HTML is also what Mammoth and Markdown produce, so import and the editor share one storage format. A stricter ProseMirror JSON document would be the next step if we added operational transform or a CRDT. It was not worth a second storage format for this slice.

`DocumentShare.permission` is the string `view` or `edit`. SQLite has no enums. Unknown values are treated as `view` so a bad row cannot grant edit by accident.

## Access rules

Implemented once in `resolveAccess` and called by every document service method. The page receives the resulting flags and hides controls, but the API checks again.

| Action | Owner | Editor | Viewer | Stranger |
| --- | --- | --- | --- | --- |
| Read | yes | yes | yes | 403 if the row exists, 404 if it does not |
| Edit title and body | yes | yes | no | no |
| Change who has access | yes | no | no | no |
| Delete | yes | no | no | no |

A missing document and a document you cannot see are different responses on purpose. A reviewer who pastes the wrong id should see "no access" rather than a generic 404. The id is unguessable (a cuid), so the existence leak is small.

Saves send `baseUpdatedAt`. If the stored timestamp moved, the API returns 409 instead of silently overwriting the other person's edit. That is the stand-in for real-time collaboration: it does not merge, but it does not destroy the newer copy either.

## Auth

Two seeded users, no signup. A login creates a random 32-byte token, stores only its hash, and sets an `HttpOnly` cookie. `src/proxy.ts` redirects anonymous visits under `/documents` to the login page. That redirect is a convenience. `getCurrentUser` loads the session from the database on every page and API call, so a stale cookie is not treated as a person.

Passwords use Node's `scrypt`. A native bcrypt addon was rejected because it is fragile on Windows and on Vercel's build image. Login always runs scrypt, including when the email does not exist, so a missing account is not obviously faster than a wrong password.

Mutations reject a cross-origin `Origin` header. Same-site browser requests and `curl` (no Origin) are allowed.

## Editor

The editor is a client component. The document page is a server component that loads the draft and passes plain JSON props (ISO dates, booleans, HTML). Autosave waits 700 ms after a change, and Ctrl/Cmd+S saves immediately. If a save is still in flight when the user types again, the newer draft is written after the in-flight request finishes.

The first TipTap update is ignored. It is the editor loading the saved HTML, not a user edit, and saving it would mark a fresh open as dirty.

Imported and hand-written HTML both pass `sanitizeDocumentHtml` before insert. The allow-list is the tags the editor can round-trip. `javascript:` links are dropped.

## Import

`POST /api/documents/import` accepts one file and creates a new document owned by the signed-in user.

- `.txt` is escaped and split into paragraphs. It cannot smuggle HTML.
- `.md` is rendered with `marked`, then sanitized.
- `.docx` must start with a zip header, then Mammoth converts it to HTML and the same sanitizer runs.

The product choice is "import creates a new draft", not "replace the document I have open". That is harder to do by accident.

## API

| Method | Path | Who |
| --- | --- | --- |
| POST | `/api/auth/login` | public |
| POST | `/api/auth/logout` | any cookie |
| GET | `/api/documents` | signed in |
| POST | `/api/documents` | signed in, creates an owned draft |
| POST | `/api/documents/import` | signed in |
| GET, PATCH, DELETE | `/api/documents/:id` | access rules above |
| PUT | `/api/documents/:id/share` | owner, upserts view or edit |
| DELETE | `/api/documents/:id/share/:userId` | owner |
| GET | `/api/documents/:id/export` | anyone who can read |

Validation errors use Zod and return `{ error: string }` with a 4xx status. Unexpected failures return a generic 500 and log the cause on the server.

## Tests

`tests/permissions.test.ts` locks the access table. `tests/content.test.ts` and `tests/import-file.test.ts` lock the HTML boundary. `tests/access.integration.test.ts` boots a temporary SQLite file through the same `ensureDatabase` path production uses, then walks owner, editor, viewer, stale save, and revoke. The integration test is the one that would fail if the hand-written `INIT_SQL` drifted from the Prisma schema.

## What was cut, and why

**Real-time collaboration.** A CRDT or WebSocket server does not fit Vercel serverless or a 4–6 hour slice, and a buggy presence indicator would be worse than a clear autosave status.

**Open signup.** Seeded accounts make the sharing demo deterministic. Reviewers do not have to create a second user.

**Postgres.** A correct relational model does not require Postgres at this size. SQLite locally plus Turso in production keeps the schema identical and the cost at zero.

**Version history and comments.** Both are listed as the next 2–4 hours in the README. They should sit on top of the document row that already exists, not instead of sharing.

## Deploy note

`next build` does not connect to the database. Document routes are dynamic because they read the session cookie. The first live request creates tables if needed. If Turso credentials are missing, that request fails with a database error rather than writing into a file that Vercel will throw away.

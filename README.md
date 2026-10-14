# Folio

Folio is a shared writing desk. It is a Google Docs-style editor for the Ajaia full-stack assignment: accounts, rich-text documents, file import, sharing, comments, version history, and export.

Simultaneous typing is presence plus a conflict check, not a live merge. Two people can still overwrite each other; a save that lost the race returns 409 and asks for a reload.

## What you can do

- Create an account, or sign in as one of two seeded people. Sessions survive a refresh.
- Edit your name and email from **Account**.
- Create, rename, search, sort, edit, and delete a document you own.
- Format text: bold, italic, underline, links, headings, paragraphs, bulleted lists, numbered lists, and quotes. Undo and redo are in the toolbar.
- Autosave, or press Ctrl/Cmd+S. Reopen the same draft after a refresh with the formatting intact. The editor stores sanitized HTML and a TipTap JSON document.
- Import a `.txt`, `.md`, or `.docx` file (up to 2 MB) as a new document, or replace the body of a document you can edit. Word tables stay tables, and pictures — including a logo in the page header — are kept.
- Attach a PDF, image, text, Markdown, or Word file (2 MB) to a document.
- Share a document as **Can edit** or **Can view**. Search for a registered person by name or email. Only the owner can change access or delete the document.
- See **Owned by me** and **Shared with me** as separate lists. Shared drafts name the person who shared them.
- Comment, reply, resolve, or propose a suggestion. A suggestion does not change the draft until someone with edit access applies it.
- Open version history and restore an earlier snapshot.
- See who currently has the document open, including who is editing.
- Download the current draft as Markdown, PDF, or plain text.

## Demo accounts

Both accounts use the password `ajaia-demo`.

| Person | Email | What you will see |
| --- | --- | --- |
| Alex Rivera | `alex.rivera@ajaia.dev` | Owns "Welcome to Folio" and a private "Launch checklist". |
| Jordan Lee | `jordan.lee@ajaia.dev` | Owns "Reading notes". Can edit the welcome draft Alex shared. |

The login screen lists both people. Choosing one fills the form. **Create an account** is on the login page for anyone else. Sharing only works for an email that already has an account.

Suggested review path:

1. Sign in as Alex and open **Welcome to Folio**. Change a heading or a list and wait for **Saved**.
2. Open **Share**. Jordan already has edit access. Grant Jordan **Can view** on **Launch checklist**.
3. Sign out and sign in as Jordan.
4. **Welcome to Folio** is under **Shared with you** and can be edited. **Launch checklist** is read only. **Reading notes** is Jordan's own document, and Alex cannot see it.

Sample files for import live in `samples/`.

## Run locally

Requirements: Node.js 20 or newer (developed on Node 24) and npm. No database server is required.

```bash
npm install
npm run db:setup
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

`npm run db:setup` creates `prisma/dev.db` and seeds the demo accounts. If you skip it, the first request creates the tables and seed data anyway.

### Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Next.js development server |
| `npm run build` | Generate the Prisma client and build for production |
| `npm start` | Serve the production build |
| `npm test` | Unit tests and a SQLite integration test for sharing |
| `npm run lint` | ESLint |
| `npm run db:setup` | Push the schema to the local SQLite file and seed it |
| `npm run db:seed` | Seed again without recreating tables |

## Tests

```bash
npm test
```

The suite covers:

- Who can read, edit, share, and delete.
- HTML sanitizing, structured JSON, Markdown and PDF export, and password hashing.
- Import of plain text and Markdown, including rejection of unsupported files.
- A real SQLite database: registration, seeded visibility, editor vs viewer, comments and suggestions, version restore, presence, attachments, stale-save rejection, and revoking access.

## Deploy on Vercel

Local SQLite cannot persist on Vercel's serverless filesystem. Production uses [Turso](https://turso.tech), which is hosted libSQL (SQLite over HTTP) and has a free tier. Reviewers do not need a paid account.

1. Create a free Turso account and install the [Turso CLI](https://docs.turso.tech/quickstart).
2. Create a database and a token:

   ```bash
   turso db create folio
   turso db show folio --url
   turso db tokens create folio
   ```

3. Push this repository to GitHub and import it in Vercel. The framework preset is Next.js. The root of the repo is the app.
4. In the Vercel project, set:

   | Name | Value |
   | --- | --- |
   | `TURSO_DATABASE_URL` | The `libsql://...` URL from `turso db show` |
   | `TURSO_AUTH_TOKEN` | The token from `turso db tokens create` |

5. Deploy. On the first request Folio creates the tables and seeds Alex and Jordan. You do not run a migrate command against Turso.

`DATABASE_URL` is only for local development. Leave it unset on Vercel. When `TURSO_DATABASE_URL` is present, the app ignores the local file.

## Environment

See `.env.example`.

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Local only | SQLite file. `file:./dev.db` is resolved to `prisma/dev.db`. |
| `TURSO_DATABASE_URL` | Production | Hosted libSQL URL. |
| `TURSO_AUTH_TOKEN` | Production | Turso token. Omit it locally. |

Sessions are random tokens stored only as a SHA-256 hash. The cookie is `HttpOnly`, `SameSite=Lax`, and `Secure` in production. It lasts 7 days.

## Import limits

Stated in the import dialog and enforced by the API:

- Extensions: `.txt`, `.md`, `.markdown`, `.docx`
- Maximum size: 2 MB
- Word documents must be real `.docx` zip files. Old `.doc` files are rejected.
- Scripts and unsupported tags are stripped. Headings below H3 become H3. Tables and PNG, JPEG, GIF, and WebP pictures are kept.

## Project map

```text
src/app              pages and route handlers
src/components       login, library, editor, share dialog
src/lib              permissions, sanitizer, import, passwords, database client
src/server           auth, document CRUD, seed data
prisma/schema.prisma SQLite schema
tests                unit and integration tests
samples              files you can import
```

The HTTP API is under `/api`. Document rules live in `src/server/documents.ts` and `src/lib/permissions.ts`, not only in the React components.

## What is not in this version

- Live cursors or character-by-character merging. Presence shows who is here. A save that lost the race returns 409 and asks for a reload.
- Password reset and SSO.
- Drawing tools. Imported tables and pictures can be edited as text around them.

## More detail

- [ARCHITECTURE.md](ARCHITECTURE.md) — data model, access rules, and why this scope.
- [AI_WORKFLOW.md](AI_WORKFLOW.md) — how AI tools were used and what was checked by hand.
- [SUBMISSION.md](SUBMISSION.md) — what is in the hand-off.
- [WALKTHROUGH.md](WALKTHROUGH.md) — script for the 3–5 minute video.

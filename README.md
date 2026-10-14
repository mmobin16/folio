# Folio

Folio is a small shared writing desk. It is the working slice of a Google Docs-style product built for the Ajaia full-stack assignment: create and edit rich-text documents, import a file into a new draft, and share that draft with another person.

It is intentionally not a full Docs clone. Real-time co-editing, comments, and version history are out of scope. What is here works end to end, persists, and can be deployed without a paid service.

## What you can do

- Sign in as one of two seeded people.
- Create, rename, edit, and delete a document you own.
- Format text: bold, italic, underline, headings, bulleted lists, numbered lists, and quotes.
- Autosave, then reopen the same draft after a refresh with the formatting intact.
- Import a `.txt`, `.md`, or `.docx` file (up to 2 MB) as a new document. Images inside a Word file are skipped.
- Share a document as **Can edit** or **Can view**. Only the owner can change access or delete the document.
- See **Your documents** and **Shared with you** as separate lists.
- Download the current draft as Markdown.

## Demo accounts

Both accounts use the password `ajaia-demo`.

| Person | Email | What you will see |
| --- | --- | --- |
| Alex Rivera | `alex.rivera@ajaia.dev` | Owns "Welcome to Folio" and a private "Launch checklist". |
| Jordan Lee | `jordan.lee@ajaia.dev` | Owns "Reading notes". Can edit the welcome draft Alex shared. |

The login screen lists both people. Choosing one fills the form. There is no open registration, so sharing always targets a real account.

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
- HTML sanitizing, Markdown export, and password hashing.
- Import of plain text and Markdown, including rejection of unsupported files.
- A real SQLite database: seeded visibility, editor vs viewer, stale-save rejection, and revoking access.

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
- Images, scripts, and unsupported tags are stripped. Headings below H3 become H3.

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

- Real-time cursors or simultaneous editing. Two people can overwrite each other. A save that lost the race returns 409 and asks for a reload.
- Comments, suggestions, and version history.
- Public signup, password reset, and SSO.
- PDF export. Markdown download is the portable copy.
- Images and tables in the editor.

## With another 2–4 hours

1. A short version history: keep the previous HTML snapshot on each save and let the owner restore it.
2. Presence: show "Jordan is viewing" with a lightweight polling endpoint, still without a CRDT.
3. Append-only import into the open document, not only import-as-new.

## More detail

- [ARCHITECTURE.md](ARCHITECTURE.md) — data model, access rules, and why this scope.
- [AI_WORKFLOW.md](AI_WORKFLOW.md) — how AI tools were used and what was checked by hand.
- [SUBMISSION.md](SUBMISSION.md) — what is in the hand-off.
- [WALKTHROUGH.md](WALKTHROUGH.md) — script for the 3–5 minute video.

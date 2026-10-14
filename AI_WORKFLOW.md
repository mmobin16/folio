# AI workflow

I used Cursor's agent, running Grok, as a pair programmer for this take-home. I set the constraints before implementation: Next.js and TypeScript, a real database with CRUD, a GitHub repo I can deploy on Vercel, and a scope a reviewer can actually click through. The agent drafted the application inside those constraints. I am treating the result as my submission, so the checks below are part of the work, not a claim that every line was typed by hand.

## Where it sped things up

- Scaffolding the App Router project, Prisma schema, and route handlers as one pass instead of wiring them file by file.
- TipTap's Next.js setup (`immediatelyRender: false`, StarterKit including underline) so the editor did not fight server rendering.
- The first drafts of the sanitizer, Markdown import, and the sharing permission table, which are easy to get subtly wrong and easy to pin down with tests.
- The Turso-versus-local-file split, which I would have spent longer rediscovering from Prisma's driver-adapter docs.

## What I rejected or changed

- **Real-time collaboration.** The first instinct for a "Google Docs" prompt is a CRDT. I kept autosave plus a 409 when two saves collide. Shipping a half-working collaborative cursor would have crowded out sharing and import.
- **A required Postgres host.** Prisma on Postgres is the usual full-stack shape, and it needs an account before `npm run dev` works. Local SQLite with the same schema on Turso means a reviewer can run the app with no signup, and Vercel still has a free hosted database.
- **Open registration.** Seeded accounts make the owner/editor/viewer story obvious. A signup form would add password-reset scope for no review benefit.
- **Native bcrypt.** It fails often enough on Windows and in serverless builds. Node's `scrypt` is enough for demo passwords.
- **Storing raw editor HTML.** The agent-shaped import path was "save whatever Mammoth returns". That would persist scripts and odd Word markup. Every write now goes through an allow-list, and the tests check that a `<script>` does not survive.
- **The default Next.js starter UI.** The generated page was replaced with a paper-and-ink editor so the writing surface is the product, not a template gallery.
- **`font: inherit` on inputs.** That shorthand clobbered the title size. It is now `font-family: inherit` only, which I found by looking at the running page, not by reading the first CSS draft.

## How I checked it

- `npm test` — 19 tests, including a temporary SQLite file that creates tables through the same startup SQL as production and then checks owner, editor, viewer, stale save, and revoke.
- `npm run lint` and `npm run build` — the production build completes, and document routes stay dynamic so the build does not need a live database.
- Browser pass against `npm run dev`:
  - Sign in as Alex. The desk lists two owned drafts and nothing shared.
  - Open **Welcome to Folio**. Headings, bold, italic, underline, and both list types render. The toolbar state follows the cursor.
  - Rename the document, see **Saved**, reload, and see the new title.
  - Open **Share**. Alex is owner, Jordan is "Can edit", and the grant form is there.
  - Sign out, sign in as Jordan. **Reading notes** is owned. **Welcome to Folio** is under **Shared with you**, attributed to Alex. Jordan gets the editor and does not get Delete.
- HTTP check of import: posting `samples/plan.md` as Alex returns a document whose HTML has an `h1`, `strong`, `em`, and a list. Posting the same bytes as `photo.png` returns 400. I deleted that imported draft afterward so the seeded desk stays as the three sample documents.

I did not record the walkthrough video. `WALKTHROUGH.md` is the script for that recording. The live Vercel URL is created when this repo is imported with the Turso environment variables from the README.

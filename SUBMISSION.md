# Submission

Candidate: Mobin Kashif (`mobin.kashif112233@gmail.com`)

Product: **Folio**, a shared writing desk for the Ajaia AI-Native Full Stack Developer assignment.

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

- Alex Rivera — `alex.rivera@ajaia.dev` — owner of the welcome draft and a private checklist
- Jordan Lee — `jordan.lee@ajaia.dev` — editor on the welcome draft, owner of a private note

No paid service is required to run the app locally. Production on Vercel needs a free Turso database. The steps are in the README.

## Live URL

Add the Vercel deployment URL here after import:

```text
https://
```

Set `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` on the Vercel project before the first request. The app creates tables and seeds the two accounts itself.

## What works

- Create, rename, edit, autosave, reopen, and delete documents.
- Bold, italic, underline, headings, bulleted lists, numbered lists, quotes.
- Import `.txt`, `.md`, and `.docx` (2 MB) into a new document.
- Owner, editor, and viewer. Owned and shared documents are separate lists.
- Persistence in SQLite locally and libSQL/Turso on Vercel.
- Validation, sanitized HTML, and 19 automated tests.

## What is incomplete

- The walkthrough video is not recorded yet. Use `WALKTHROUGH.md`. Paste the public URL into `WALKTHROUGH_URL.txt` and into the assignment form.
- The live URL above is blank until the Vercel project is created.
- No real-time collaboration, comments, or version history.

## Next 2–4 hours

1. Save a snapshot of the HTML on each successful save and add a restore list for the owner.
2. Poll for "someone else has this open" without attempting a CRDT.
3. Offer "import into this draft" in addition to "import as a new document".

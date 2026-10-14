import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DEMO_USERS } from "../src/server/demo-accounts";
import { CHECKLIST_TITLE, WELCOME_TITLE } from "../src/server/sample-documents";
import { DocumentError } from "../src/server/errors";

const directory = mkdtempSync(path.join(tmpdir(), "folio-"));
const databasePath = path.join(directory, "test.db").replaceAll("\\", "/");

delete process.env.TURSO_DATABASE_URL;
delete process.env.TURSO_AUTH_TOKEN;
process.env.DATABASE_URL = `file:${databasePath}`;

const { prisma, ensureDatabase } = await import("../src/lib/db");
const documents = await import("../src/server/documents");
const accounts = await import("../src/server/accounts");
const comments = await import("../src/server/comments");
const versions = await import("../src/server/versions");
const presence = await import("../src/server/presence");
const attachments = await import("../src/server/attachments");

describe("document access", () => {
  let alexId = "";
  let jordanId = "";

  beforeAll(async () => {
    await ensureDatabase();
    const alex = await prisma.user.findUniqueOrThrow({ where: { email: DEMO_USERS[0].email } });
    const jordan = await prisma.user.findUniqueOrThrow({ where: { email: DEMO_USERS[1].email } });
    alexId = alex.id;
    jordanId = jordan.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
    try {
      rmSync(directory, { recursive: true, force: true });
    } catch {
      // Windows can hold the SQLite file open briefly after the client disconnects.
    }
  });

  it("seeds an owned draft and a shared draft with different visibility", async () => {
    const alex = await documents.listDocuments(alexId);
    const jordan = await documents.listDocuments(jordanId);

    expect(alex.owned.map((item) => item.title)).toEqual(
      expect.arrayContaining([WELCOME_TITLE, CHECKLIST_TITLE]),
    );
    expect(alex.shared).toHaveLength(0);
    expect(jordan.shared.map((item) => item.title)).toContain(WELCOME_TITLE);
    expect(jordan.owned.map((item) => item.title)).not.toContain(WELCOME_TITLE);
    expect(jordan.shared.find((item) => item.title === WELCOME_TITLE)?.role).toBe("edit");
  });

  it("lets an editor update a shared draft and blocks a viewer", async () => {
    const alexList = await documents.listDocuments(alexId);
    const welcome = alexList.owned.find((item) => item.title === WELCOME_TITLE);
    const checklist = alexList.owned.find((item) => item.title === CHECKLIST_TITLE);
    expect(welcome).toBeTruthy();
    expect(checklist).toBeTruthy();

    const edited = await documents.updateDocument(jordanId, welcome!.id, {
      content: "<p>Jordan edited this.</p>",
      baseUpdatedAt: (await documents.getDocument(jordanId, welcome!.id)).updatedAt,
    });
    expect(edited.content).toContain("Jordan edited this.");

    await documents.grantAccess(alexId, checklist!.id, DEMO_USERS[1].email, "view");
    await expect(
      documents.updateDocument(jordanId, checklist!.id, { title: "Taken over" }),
    ).rejects.toMatchObject({ status: 403 });

    await expect(documents.deleteDocument(jordanId, checklist!.id)).rejects.toBeInstanceOf(
      DocumentError,
    );
    await expect(documents.grantAccess(jordanId, welcome!.id, DEMO_USERS[0].email, "edit")).rejects.toMatchObject({
      status: 403,
    });
  });

  it("hides a private document and refuses a stale save", async () => {
    const created = await documents.createDocument(alexId, {
      title: "Private scratch",
      content: "<p>Secret</p>",
    });
    await expect(documents.getDocument(jordanId, created.id)).rejects.toMatchObject({ status: 403 });
    await expect(documents.getDocument(alexId, "missing-id")).rejects.toMatchObject({ status: 404 });

    const current = await documents.getDocument(alexId, created.id);
    const saved = await documents.updateDocument(alexId, created.id, {
      title: "Private scratch v2",
      baseUpdatedAt: current.updatedAt,
    });
    expect(saved.title).toBe("Private scratch v2");

    await expect(
      documents.updateDocument(alexId, created.id, {
        title: "Too late",
        baseUpdatedAt: current.updatedAt,
      }),
    ).rejects.toMatchObject({ status: 409 });

    await documents.deleteDocument(alexId, created.id);
    await expect(documents.getDocument(alexId, created.id)).rejects.toMatchObject({ status: 404 });
  });

  it("rejects sharing with an unknown email and can revoke access", async () => {
    const created = await documents.createDocument(alexId, { title: "Share target" });
    await expect(
      documents.grantAccess(alexId, created.id, "nobody@ajaia.dev", "edit"),
    ).rejects.toMatchObject({ status: 404 });

    const shared = await documents.grantAccess(alexId, created.id, DEMO_USERS[1].email, "edit");
    expect(shared.shares).toHaveLength(1);

    const revoked = await documents.revokeAccess(alexId, created.id, jordanId);
    expect(revoked.shares).toHaveLength(0);
    await documents.deleteDocument(alexId, created.id);
  });

  it("covers accounts, structured saves, comments, history, presence, and files", async () => {
    const casey = await accounts.registerAccount({
      name: "Casey Ng",
      email: "casey.ng@ajaia.dev",
      password: "long-password",
    });
    const profile = await accounts.updateProfile(casey.id, {
      name: "Casey N.",
      email: "casey.ng@ajaia.dev",
    });
    expect(profile.name).toBe("Casey N.");
    await expect(accounts.registerAccount({
      name: "Casey Again",
      email: "casey.ng@ajaia.dev",
      password: "long-password",
    })).rejects.toMatchObject({ status: 409 });

    const created = await documents.createDocument(alexId, {
      title: "Structured draft",
      content: "<p>Original</p>",
      contentJson: JSON.stringify({ type: "doc", content: [{ type: "paragraph" }] }),
    });
    expect(created.contentJson).toContain("paragraph");
    await expect(documents.getDocument(casey.id, created.id)).rejects.toMatchObject({ status: 403 });

    const edited = await documents.updateDocument(alexId, created.id, {
      content: "<p>Original revised</p>",
      contentJson: JSON.stringify({
        type: "doc",
        content: [{ type: "paragraph", content: [{ type: "text", text: "Original revised" }] }],
      }),
      baseUpdatedAt: created.updatedAt,
    });
    const again = await documents.updateDocument(alexId, created.id, {
      title: "Structured draft",
      content: "<p>Latest body</p>",
      baseUpdatedAt: edited.updatedAt,
    });
    expect(again.content).toContain("Latest body");

    const history = await versions.listVersions(alexId, created.id);
    expect(history.length).toBeGreaterThanOrEqual(2);
    expect(history.length).toBeLessThanOrEqual(3);
    const details = await Promise.all(
      history.map((version) => versions.getVersion(alexId, created.id, version.id)),
    );
    const original = details.find((version) => version.content.includes("Original</p>"));
    expect(original).toBeTruthy();
    await versions.restoreVersion(alexId, created.id, original!.id);
    const restored = await documents.getDocument(alexId, created.id);
    expect(restored.content).toContain("Original</p>");
    expect(restored.content).not.toContain("Latest body");

    await documents.grantAccess(alexId, created.id, DEMO_USERS[1].email, "view");
    await expect(
      documents.grantAccess(alexId, created.id, DEMO_USERS[1].email, "view"),
    ).rejects.toMatchObject({ status: 409 });
    await expect(versions.restoreVersion(jordanId, created.id, original!.id)).rejects.toMatchObject({
      status: 403,
    });

    const beforeComment = await documents.getDocument(alexId, created.id);
    const thread = await comments.addComment(jordanId, created.id, {
      body: "Please add a line",
      kind: "suggestion",
      suggestion: "Added from a suggestion",
    });
    expect(thread).toHaveLength(1);
    const afterComment = await documents.getDocument(alexId, created.id);
    expect(afterComment.content).toBe(beforeComment.content);

    const replied = await comments.addComment(alexId, created.id, {
      body: "I will consider it",
      parentId: thread[0].id,
    });
    expect(replied[0].replies).toHaveLength(1);

    await expect(comments.applySuggestion(jordanId, created.id, thread[0].id)).rejects.toMatchObject({
      status: 403,
    });
    const applied = await comments.applySuggestion(alexId, created.id, thread[0].id);
    expect(applied.document.content).toContain("Added from a suggestion");
    await expect(comments.addComment(casey.id, created.id, { body: "nope" })).rejects.toMatchObject({
      status: 403,
    });

    await presence.touchPresence(alexId, created.id, "editing");
    const people = await presence.listPresence(jordanId, created.id);
    expect(people.some((person) => person.userId === alexId && person.activity === "editing")).toBe(true);
    await presence.clearPresence(alexId, created.id);
    const gone = await presence.listPresence(jordanId, created.id);
    expect(gone.some((person) => person.userId === alexId)).toBe(false);

    await expect(
      attachments.addAttachment(alexId, created.id, {
        filename: "virus.exe",
        mimeType: "application/octet-stream",
        bytes: Buffer.from("nope"),
      }),
    ).rejects.toMatchObject({ status: 400 });
    await attachments.addAttachment(alexId, created.id, {
      filename: "note.txt",
      mimeType: "text/plain",
      bytes: Buffer.from("hello attachment"),
    });
    const files = await attachments.listAttachments(jordanId, created.id);
    expect(files.map((file) => file.filename)).toContain("note.txt");
    const downloaded = await attachments.readAttachment(jordanId, created.id, files[0].id);
    expect(downloaded.bytes.toString()).toBe("hello attachment");
    await expect(
      attachments.addAttachment(jordanId, created.id, {
        filename: "other.txt",
        mimeType: "text/plain",
        bytes: Buffer.from("no"),
      }),
    ).rejects.toMatchObject({ status: 403 });

    const matches = await accounts.searchUsers(alexId, "casey");
    expect(matches.some((match) => match.email === "casey.ng@ajaia.dev")).toBe(true);

    await documents.deleteDocument(alexId, created.id);
  });
});

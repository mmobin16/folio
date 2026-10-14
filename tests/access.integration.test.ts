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
});

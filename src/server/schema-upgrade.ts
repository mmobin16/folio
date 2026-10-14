import type { Client } from "@libsql/client";

/**
 * Adds tables and columns introduced after the first Folio schema.
 * Safe to run on every boot: each statement is skipped when the object exists.
 */
const EXTRA_TABLES = `
CREATE TABLE IF NOT EXISTS "Profile" (
    "userId" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "DocumentVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "documentId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "contentJson" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DocumentVersion_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DocumentVersion_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "Comment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "documentId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "parentId" TEXT,
    "body" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'comment',
    "suggestion" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" DATETIME,
    "resolvedById" TEXT,
    CONSTRAINT "Comment_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Comment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Comment_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Comment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Comment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "DocumentPresence" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "documentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "activity" TEXT NOT NULL DEFAULT 'viewing',
    "lastSeenAt" DATETIME NOT NULL,
    CONSTRAINT "DocumentPresence_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DocumentPresence_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "Attachment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "documentId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "data" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Attachment_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Attachment_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "Profile_email_key" ON "Profile"("email");
CREATE INDEX IF NOT EXISTS "DocumentVersion_documentId_createdAt_idx" ON "DocumentVersion"("documentId", "createdAt");
CREATE INDEX IF NOT EXISTS "Comment_documentId_idx" ON "Comment"("documentId");
CREATE INDEX IF NOT EXISTS "Comment_parentId_idx" ON "Comment"("parentId");
CREATE UNIQUE INDEX IF NOT EXISTS "DocumentPresence_documentId_userId_key" ON "DocumentPresence"("documentId", "userId");
CREATE INDEX IF NOT EXISTS "DocumentPresence_documentId_idx" ON "DocumentPresence"("documentId");
CREATE INDEX IF NOT EXISTS "Attachment_documentId_idx" ON "Attachment"("documentId");
`;

export async function upgradeExistingDatabase(client: Client): Promise<void> {
  const columns = await client.execute('PRAGMA table_info("Document")');
  const names = new Set(columns.rows.map((row) => String(row.name)));
  if (!names.has("contentJson")) {
    await client.execute(
      `ALTER TABLE "Document" ADD COLUMN "contentJson" TEXT NOT NULL DEFAULT ''`,
    );
  }

  const presence = await client.execute(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'DocumentPresence'",
  );
  await client.executeMultiple(EXTRA_TABLES);

  if (presence.rows.length > 0) {
    const presenceColumns = await client.execute('PRAGMA table_info("DocumentPresence")');
    const presenceNames = new Set(presenceColumns.rows.map((row) => String(row.name)));
    if (!presenceNames.has("activity")) {
      await client.execute(
        `ALTER TABLE "DocumentPresence" ADD COLUMN "activity" TEXT NOT NULL DEFAULT 'viewing'`,
      );
    }
  }
}

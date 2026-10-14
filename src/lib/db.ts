import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";
import { createClient } from "@libsql/client";
import { INIT_SQL } from "@/server/schema-sql";
import { upgradeExistingDatabase } from "@/server/schema-upgrade";
import { seedDemoData } from "@/server/seed";

type Connection = {
  url: string;
  authToken?: string;
};

/**
 * Local file URLs are resolved the same way Prisma CLI resolves them:
 * a relative `file:./dev.db` lives next to prisma/schema.prisma.
 * Turso URLs (`libsql://` or `https://`) are used unchanged.
 */
export function resolveConnection(): Connection {
  const tursoUrl = process.env.TURSO_DATABASE_URL?.trim();
  if (tursoUrl) {
    const authToken = process.env.TURSO_AUTH_TOKEN?.trim();
    return authToken ? { url: tursoUrl, authToken } : { url: tursoUrl };
  }

  const configured = process.env.DATABASE_URL?.trim() || "file:./dev.db";
  if (!configured.startsWith("file:")) return { url: configured };

  const spec = configured.slice("file:".length);
  if (spec.startsWith("//")) return { url: configured };

  const normalized = spec.replace(/\\/g, "/");
  const absolute =
    path.win32.isAbsolute(normalized) || normalized.startsWith("/")
      ? path.resolve(normalized)
      : path.resolve(process.cwd(), "prisma", normalized.replace(/^\.\//, ""));

  return { url: `file:${absolute.replace(/\\/g, "/")}` };
}

function createPrismaClient() {
  const connection = resolveConnection();
  const adapter = new PrismaLibSQL({
    url: connection.url,
    authToken: connection.authToken,
  });
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  ready?: Promise<void>;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();
globalForPrisma.prisma = prisma;

/**
 * Creates tables on an empty database, then seeds demo accounts.
 * The promise is cached so concurrent requests in one process share one run.
 */
export function ensureDatabase(): Promise<void> {
  if (!globalForPrisma.ready) {
    globalForPrisma.ready = prepareDatabase().catch((error: unknown) => {
      globalForPrisma.ready = undefined;
      throw error;
    });
  }
  return globalForPrisma.ready;
}

async function prepareDatabase(): Promise<void> {
  const connection = resolveConnection();
  const client = createClient({
    url: connection.url,
    authToken: connection.authToken,
  });

  try {
    const existing = await client.execute(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'User'",
    );
    if (existing.rows.length === 0) {
      await client.executeMultiple(INIT_SQL);
    } else {
      await upgradeExistingDatabase(client);
    }
  } finally {
    client.close();
  }

  await seedDemoData(prisma);
}

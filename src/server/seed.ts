import type { PrismaClient } from "@prisma/client";
import { hashPassword } from "@/lib/passwords";
import { DEMO_PASSWORD, DEMO_USERS } from "@/server/demo-accounts";
import {
  CHECKLIST_HTML,
  CHECKLIST_TITLE,
  READING_HTML,
  READING_TITLE,
  WELCOME_HTML,
  WELCOME_TITLE,
} from "@/server/sample-documents";

/**
 * Inserts the two demo people and their sample drafts when those emails
 * are absent. Safe to run on every boot: existing accounts are left alone,
 * and the welcome draft is not duplicated.
 */
export async function seedDemoData(prisma: PrismaClient): Promise<void> {
  const passwordHash = hashPassword(DEMO_PASSWORD);

  const alex = await prisma.user.upsert({
    where: { email: DEMO_USERS[0].email },
    update: {},
    create: {
      email: DEMO_USERS[0].email,
      name: DEMO_USERS[0].name,
      passwordHash,
    },
  });

  const jordan = await prisma.user.upsert({
    where: { email: DEMO_USERS[1].email },
    update: {},
    create: {
      email: DEMO_USERS[1].email,
      name: DEMO_USERS[1].name,
      passwordHash,
    },
  });

  const welcome = await prisma.document.findFirst({
    where: { ownerId: alex.id, title: WELCOME_TITLE },
    select: { id: true },
  });

  if (!welcome) {
    await prisma.document.create({
      data: {
        ownerId: alex.id,
        title: WELCOME_TITLE,
        content: WELCOME_HTML,
        shares: {
          create: { userId: jordan.id, permission: "edit" },
        },
      },
    });
  }

  const checklist = await prisma.document.findFirst({
    where: { ownerId: alex.id, title: CHECKLIST_TITLE },
    select: { id: true },
  });
  if (!checklist) {
    await prisma.document.create({
      data: {
        ownerId: alex.id,
        title: CHECKLIST_TITLE,
        content: CHECKLIST_HTML,
      },
    });
  }

  const reading = await prisma.document.findFirst({
    where: { ownerId: jordan.id, title: READING_TITLE },
    select: { id: true },
  });
  if (!reading) {
    await prisma.document.create({
      data: {
        ownerId: jordan.id,
        title: READING_TITLE,
        content: READING_HTML,
      },
    });
  }
}

/**
 * Seeded accounts used by the login screen and the database seed.
 * Registration is intentionally closed so sharing can be demonstrated
 * with two known people.
 */
export const DEMO_PASSWORD = "ajaia-demo";

export const DEMO_USERS = [
  {
    email: "alex.rivera@ajaia.dev",
    name: "Alex Rivera",
    blurb: "Owns the welcome draft and a private checklist.",
  },
  {
    email: "jordan.lee@ajaia.dev",
    name: "Jordan Lee",
    blurb: "Can edit the welcome draft. Also has a private note.",
  },
] as const;

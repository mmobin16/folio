import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address.").max(200),
  password: z.string().min(1, "Enter a password.").max(200),
});

export const registerSchema = z.object({
  name: z.string().trim().min(1, "Enter your name.").max(80, "Name must be 80 characters or fewer."),
  email: z.string().trim().email("Enter a valid email address.").max(200),
  password: z.string().min(8, "Use at least 8 characters.").max(200),
});

export const profileSchema = z.object({
  name: z.string().trim().min(1, "Enter your name.").max(80, "Name must be 80 characters or fewer."),
  email: z.string().trim().email("Enter a valid email address.").max(200),
});

export const createDocumentSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title cannot be empty.")
    .max(120, "Title must be 120 characters or fewer.")
    .optional(),
});

export const updateDocumentSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Title cannot be empty.")
      .max(120, "Title must be 120 characters or fewer.")
      .optional(),
    content: z.string().max(4_000_000, "This document is too large to save.").optional(),
    contentJson: z.string().max(4_000_000, "This document is too large to save.").optional(),
    baseUpdatedAt: z.string().datetime().optional(),
  })
  .refine((value) => value.title !== undefined || value.content !== undefined, {
    message: "Nothing to update.",
  });

export const shareSchema = z.object({
  email: z.string().trim().email("Enter the email of a Folio account.").max(200),
  permission: z.enum(["view", "edit"]),
});

export const commentSchema = z.object({
  body: z.string().trim().min(1, "Write a comment.").max(2000, "Comments must be 2000 characters or fewer."),
  parentId: z.string().trim().min(1).max(40).optional(),
  kind: z.enum(["comment", "suggestion"]).optional(),
  suggestion: z.string().trim().max(5000, "Suggestions must be 5000 characters or fewer.").optional(),
});

export const presenceSchema = z.object({
  activity: z.enum(["viewing", "editing"]),
});

export function firstZodMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Check the form and try again.";
}

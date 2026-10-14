import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address.").max(200),
  password: z.string().min(1, "Enter a password.").max(200),
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
    content: z.string().max(500_000, "This document is too large to save.").optional(),
    baseUpdatedAt: z.string().datetime().optional(),
  })
  .refine((value) => value.title !== undefined || value.content !== undefined, {
    message: "Nothing to update.",
  });

export const shareSchema = z.object({
  email: z.string().trim().email("Enter the email of a Folio account.").max(200),
  permission: z.enum(["view", "edit"]),
});

export function firstZodMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Check the form and try again.";
}

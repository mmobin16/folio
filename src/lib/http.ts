import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AccountError, DocumentError } from "@/server/errors";
import { ImportError } from "@/lib/import-file";
import { firstZodMessage } from "@/lib/validators";

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

/**
 * Browsers send Origin on cross-site requests. Reject a mismatch so a
 * foreign page cannot ride a signed-in reviewer's cookie.
 * Missing Origin is allowed for same-origin navigations and curl.
 */
export function rejectCrossOrigin(request: Request): NextResponse | null {
  const origin = request.headers.get("origin");
  if (!origin) return null;

  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!host) return jsonError("The request is missing a host.", 400);

  try {
    if (new URL(origin).host !== host) {
      return jsonError("Cross-origin request blocked.", 403);
    }
  } catch {
    return jsonError("The request origin is invalid.", 400);
  }

  return null;
}

export function toErrorResponse(error: unknown) {
  if (error instanceof DocumentError || error instanceof AccountError || error instanceof ImportError) {
    return jsonError(error.message, error.status);
  }
  if (error instanceof ZodError) {
    return jsonError(firstZodMessage(error), 400);
  }
  console.error(error);
  return jsonError("Something went wrong. Please try again.", 500);
}

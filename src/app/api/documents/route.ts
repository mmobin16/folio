import { NextResponse } from "next/server";
import { jsonError, readJson, rejectCrossOrigin, toErrorResponse } from "@/lib/http";
import { createDocumentSchema, firstZodMessage } from "@/lib/validators";
import { requireApiUser } from "@/server/auth";
import { createDocument, listDocuments } from "@/server/documents";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await requireApiUser();
    if (user instanceof NextResponse) return user;
    const documents = await listDocuments(user.id);
    return NextResponse.json(documents);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request) {
  const blocked = rejectCrossOrigin(request);
  if (blocked) return blocked;

  try {
    const user = await requireApiUser();
    if (user instanceof NextResponse) return user;

    const parsed = createDocumentSchema.safeParse((await readJson(request)) ?? {});
    if (!parsed.success) return jsonError(firstZodMessage(parsed.error), 400);

    const document = await createDocument(user.id, parsed.data);
    return NextResponse.json({ document }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

import { NextResponse } from "next/server";
import { toErrorResponse } from "@/lib/http";
import { searchUsers } from "@/server/accounts";
import { requireApiUser } from "@/server/auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = await requireApiUser();
    if (user instanceof NextResponse) return user;
    const query = new URL(request.url).searchParams.get("q") ?? "";
    const users = await searchUsers(user.id, query);
    return NextResponse.json({ users });
  } catch (error) {
    return toErrorResponse(error);
  }
}

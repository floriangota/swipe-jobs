import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/guards";
import { listMatches } from "@/features/chat/service/match.service";

// GET /matches (api-contract.md §6). Both roles; cursor-paginated inbox with the
// unlocked counterpart name + last message + unread count. NO phone/email here —
// contact is revealed only by GET /matches/:id (golden rule).
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "unauthenticated", message: "Not signed in." } },
      { status: 401 },
    );
  }

  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get("cursor");
  const limitParam = searchParams.get("limit");
  const limit = limitParam != null ? Number(limitParam) : undefined;

  const { matches, nextCursor } = await listMatches(user.id, {
    cursor,
    limit: Number.isFinite(limit) ? limit : undefined,
  });

  return NextResponse.json({ data: matches, meta: { next_cursor: nextCursor } });
}

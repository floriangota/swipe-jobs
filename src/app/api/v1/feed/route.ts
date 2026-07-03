import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/guards";
import { getWorkerFeed } from "@/features/swipe/service/feed.service";

// GET /feed (api-contract.md §4). Worker only; cursor-paginated. Cards carry no
// employer contact fields (golden rule).
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "unauthenticated", message: "Not signed in." } },
      { status: 401 },
    );
  }
  if (user.role !== "worker") {
    return NextResponse.json(
      { error: { code: "forbidden", message: "Workers only." } },
      { status: 403 },
    );
  }

  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get("cursor");
  const limitParam = searchParams.get("limit");
  const limit = limitParam != null ? Number(limitParam) : undefined;

  const { cards, nextCursor } = await getWorkerFeed({
    cursor,
    limit: Number.isFinite(limit) ? limit : undefined,
  });

  return NextResponse.json({ data: cards, meta: { next_cursor: nextCursor } });
}

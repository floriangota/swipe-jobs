import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/guards";
import { getOwnListings } from "@/features/listings/service/listing.service";

// GET /listings/mine (api-contract.md §3). Employer only; cursor-paginated.
// interested/matched counts are PLACEHOLDERS (0) until M5. No contact fields.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "unauthenticated", message: "Not signed in." } },
      { status: 401 },
    );
  }
  if (user.role !== "employer") {
    return NextResponse.json(
      { error: { code: "forbidden", message: "Employers only." } },
      { status: 403 },
    );
  }

  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get("cursor");
  const limitParam = searchParams.get("limit");
  const limit = limitParam != null ? Number(limitParam) : undefined;

  const { items, nextCursor } = await getOwnListings(user.id, {
    cursor,
    limit: Number.isFinite(limit) ? limit : undefined,
  });

  return NextResponse.json({ data: items, meta: { next_cursor: nextCursor } });
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/guards";
import { getListingCandidates, listingAccess } from "@/features/swipe/service/candidate.service";

// GET /listings/:id/candidates (api-contract.md §5). Employer, owner-only. Workers who
// right-swiped this listing and the employer hasn't swiped yet. NO contact fields.
export const dynamic = "force-dynamic";

function err(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return err("unauthenticated", "Not signed in.", 401);
  if (user.role !== "employer") return err("forbidden", "Employers only.", 403);

  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return err("not_found", "Listing not found.", 404);

  const access = await listingAccess(user.id, id);
  if (access === "not_found") return err("not_found", "Listing not found.", 404);
  if (access === "forbidden") return err("forbidden", "That listing isn't yours.", 403);

  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get("cursor");
  const limitParam = searchParams.get("limit");
  const limit = limitParam != null ? Number(limitParam) : undefined;

  const { candidates, nextCursor } = await getListingCandidates(id, {
    cursor,
    limit: Number.isFinite(limit) ? limit : undefined,
  });

  return NextResponse.json({ data: candidates, meta: { next_cursor: nextCursor } });
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/guards";
import { getListing } from "@/features/listings/service/listing.service";

// GET /listings/:id (api-contract.md §3). Any authed; owner-scoped in M3 — a
// non-owner (incl. workers) gets 404 until the M5 feed adds worker read.
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "unauthenticated", message: "Not signed in." } },
      { status: 401 },
    );
  }

  const { id } = await params;
  if (!z.uuid().safeParse(id).success) {
    return NextResponse.json(
      { error: { code: "not_found", message: "Listing not found." } },
      { status: 404 },
    );
  }

  const listing = await getListing(user.id, id);
  if (!listing) {
    return NextResponse.json(
      { error: { code: "not_found", message: "Listing not found." } },
      { status: 404 },
    );
  }

  return NextResponse.json({ data: listing });
}

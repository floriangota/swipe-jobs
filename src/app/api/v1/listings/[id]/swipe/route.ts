import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/guards";
import { checkRateLimit } from "@/features/auth/rate-limit";
import { swipeSchema } from "@/features/swipe/schemas";
import { recordWorkerSwipe } from "@/features/swipe/service/swipe.service";

// POST /listings/:id/swipe (api-contract.md §4). Worker registers interest. Idempotent:
// a repeat swipe on the same listing returns a clean 409.
export const dynamic = "force-dynamic";

function err(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return err("unauthenticated", "Not signed in.", 401);
  if (user.status !== "active") return err("account_inactive", "This account is not active.", 403);
  if (user.role !== "worker") return err("forbidden", "Workers only.", 403);

  const rl = await checkRateLimit(`swipe:${user.id}`); // generous, capped — wired in M9
  if (!rl.ok) {
    const res = err("rate_limited", "Slow down a moment.", 429);
    if (rl.retryAfterSeconds) res.headers.set("Retry-After", String(rl.retryAfterSeconds));
    return res;
  }

  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return err("not_found", "Listing not found.", 404);

  const body = await request.json().catch(() => null);
  const parsed = swipeSchema.safeParse(body);
  if (!parsed.success) return err("invalid_input", "A direction is required.", 400);

  const result = await recordWorkerSwipe(user.id, id, parsed.data.direction);
  switch (result.status) {
    case "no_profile":
      return err("forbidden", "Complete your profile first.", 403);
    case "gone":
      return err("not_found", "That listing is no longer available.", 404);
    case "already_swiped":
      return err("already_swiped", "You already swiped this listing.", 409);
    case "ok":
      return NextResponse.json(
        { data: { swiped: true, interest_registered: result.interestRegistered } },
        { status: 201 },
      );
  }
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/guards";
import { checkRateLimit } from "@/features/auth/rate-limit";
import { swipeSchema } from "@/features/swipe/schemas";
import { recordEmployerSwipe } from "@/features/swipe/service/swipe.service";

// POST /listings/:id/candidates/:workerId/swipe (api-contract.md §5). Employer swipes a
// candidate; a mutual right-swipe materializes the match atomically. Contact reveal +
// chat unlock in M6 — M5 returns { matched, match_id }.
export const dynamic = "force-dynamic";

function err(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; workerId: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return err("unauthenticated", "Not signed in.", 401);
  if (user.status !== "active") return err("account_inactive", "This account is not active.", 403);
  if (user.role !== "employer") return err("forbidden", "Employers only.", 403);
  if (!user.emailVerified) return err("forbidden", "Verify your email to match.", 403); // soft-gate

  const rl = await checkRateLimit(`swipe:${user.id}`);
  if (!rl.ok) {
    const res = err("rate_limited", "Slow down a moment.", 429);
    if (rl.retryAfterSeconds) res.headers.set("Retry-After", String(rl.retryAfterSeconds));
    return res;
  }

  const { id, workerId } = await params;
  if (!z.uuid().safeParse(id).success || !z.uuid().safeParse(workerId).success) {
    return err("not_found", "Not found.", 404);
  }

  const body = await request.json().catch(() => null);
  const parsed = swipeSchema.safeParse(body);
  if (!parsed.success) return err("invalid_input", "A direction is required.", 400);

  const result = await recordEmployerSwipe(id, workerId, parsed.data.direction);
  switch (result.status) {
    case "forbidden":
      return err("forbidden", "That listing isn't yours.", 403);
    case "already_swiped":
      return err("already_swiped", "You already swiped this candidate.", 409);
    case "ok":
      return NextResponse.json(
        { data: { matched: result.matched, match_id: result.matchId } },
        { status: 201 },
      );
  }
}

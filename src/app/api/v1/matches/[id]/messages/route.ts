import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/guards";
import { checkRateLimit } from "@/features/auth/rate-limit";
import { messageSchema } from "@/features/chat/schemas";
import { listMessages, sendMessage } from "@/features/chat/service/message.service";

// GET + POST /matches/:id/messages (api-contract.md §6). Party-only (messages RLS is
// the backstop); POST sanitizes on write, is rate-limited (global + per-match keys,
// docs/security.md), soft-gated on email verification, and rejects closed matches
// with 422. Live delivery is the DB broadcast trigger's job — REST is the source of
// truth and history.
export const dynamic = "force-dynamic";

function err(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return err("unauthenticated", "Not signed in.", 401);

  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return err("not_found", "Match not found.", 404);

  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get("cursor");
  const limitParam = searchParams.get("limit");
  const limit = limitParam != null ? Number(limitParam) : undefined;

  const result = await listMessages(id, {
    cursor,
    limit: Number.isFinite(limit) ? limit : undefined,
  });
  if (result.status === "not_found") return err("not_found", "Match not found.", 404);

  return NextResponse.json({
    data: result.page.messages,
    meta: { next_cursor: result.page.nextCursor },
  });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return err("unauthenticated", "Not signed in.", 401);
  if (user.status !== "active") return err("account_inactive", "This account is not active.", 403);
  if (!user.emailVerified) return err("forbidden", "Verify your email to chat.", 403); // soft-gate

  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return err("not_found", "Match not found.", 404);

  // Moderate per-match + global per-user (docs/security.md). No-op seam until M9.
  for (const key of [`message:${user.id}`, `message:${user.id}:${id}`]) {
    const rl = await checkRateLimit(key);
    if (!rl.ok) {
      const res = err("rate_limited", "Slow down a moment.", 429);
      if (rl.retryAfterSeconds) res.headers.set("Retry-After", String(rl.retryAfterSeconds));
      return res;
    }
  }

  const body = await request.json().catch(() => null);
  const parsed = messageSchema.safeParse(body);
  if (!parsed.success) return err("invalid_input", "A message body is required.", 400);

  const result = await sendMessage(user.id, id, parsed.data.body);
  switch (result.status) {
    case "not_found":
      return err("not_found", "Match not found.", 404);
    case "closed":
      return err("match_closed", "This conversation is closed.", 422);
    case "invalid":
      return err("invalid_input", "A message body is required.", 400);
    case "ok":
      return NextResponse.json({ data: result.message }, { status: 201 });
  }
}

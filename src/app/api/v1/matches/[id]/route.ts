import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/guards";
import { matchStatusUpdateSchema } from "@/features/chat/schemas";
import { getMatchDetail, updateMatchStatus } from "@/features/chat/service/match.service";

// GET + PATCH /matches/:id (api-contract.md §6). GET is THE golden-rule reveal point:
// contact (surname/phone/email) appears here and ONLY here, and only for the two
// match parties — a non-party gets 404 (the match_detail DB function returns zero
// rows, so existence never leaks). PATCH changes status (close / hired).
export const dynamic = "force-dynamic";

function err(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return err("unauthenticated", "Not signed in.", 401);

  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return err("not_found", "Match not found.", 404);

  const detail = await getMatchDetail(id);
  if (!detail) return err("not_found", "Match not found.", 404);

  return NextResponse.json({ data: detail });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return err("unauthenticated", "Not signed in.", 401);
  if (user.status !== "active") return err("account_inactive", "This account is not active.", 403);

  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return err("not_found", "Match not found.", 404);

  const body = await request.json().catch(() => null);
  const parsed = matchStatusUpdateSchema.safeParse(body);
  if (!parsed.success) return err("invalid_input", "A valid status is required.", 400);

  const result = await updateMatchStatus(id, parsed.data.status);
  switch (result.status) {
    case "not_found":
      return err("not_found", "Match not found.", 404);
    case "forbidden":
      return err("forbidden", "You can't change this match's status.", 403);
    case "invalid_transition":
      return err("invalid_status", "This match is already closed.", 409);
    case "ok":
      return NextResponse.json({ data: { id, status: result.matchStatus } });
  }
}

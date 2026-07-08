import "server-only";
import { createClient } from "@/lib/supabase/server";
import { clampLimit, decodeCursor, encodeCursor } from "@/lib/cursor";
import { MESSAGE_MAX_LENGTH } from "../schemas";
import { sanitizeMessageBody } from "../sanitize";
import { toMessageView, type MatchStatus, type MessageRow, type MessageView } from "../types";

export interface MessagesPage {
  messages: MessageView[]; // newest first (the thread UI reverses for display)
  nextCursor: string | null; // older messages
}

/**
 * The caller's view of a match row via RLS ("match parties read matches"): a
 * non-party (or a nonexistent id) reads as null → 404, so match existence never
 * leaks to outsiders.
 */
async function getMatchForCaller(
  supabase: Awaited<ReturnType<typeof createClient>>,
  matchId: string,
): Promise<{ id: string; status: MatchStatus } | null> {
  const { data } = await supabase
    .from("matches")
    .select("id, status")
    .eq("id", matchId)
    .maybeSingle();
  return data as { id: string; status: MatchStatus } | null;
}

export type ListMessagesResult =
  | { status: "ok"; page: MessagesPage }
  | { status: "not_found" };

/**
 * Chat history, keyset-paginated newest-first. `match_messages` is SECURITY INVOKER:
 * the messages RLS ("match parties read messages") is the guard — defense in depth
 * on top of the match visibility check above.
 */
export async function listMessages(
  matchId: string,
  opts?: { cursor?: string | null; limit?: number },
): Promise<ListMessagesResult> {
  const supabase = await createClient();
  const match = await getMatchForCaller(supabase, matchId);
  if (!match) return { status: "not_found" };

  // max 49 (not 50): the DB function caps at 50 and we fetch limit+1 as the has-more
  // sentinel, so limit must stay ≤ 49 or the extra row is silently dropped and
  // next_cursor wrongly goes null while older messages remain.
  const limit = clampLimit(opts?.limit, { def: 30, max: 49 });
  const cursor = opts?.cursor ? decodeCursor(opts.cursor) : null;

  const { data, error } = await supabase.rpc("match_messages", {
    p_match_id: matchId,
    p_cursor_created_at: cursor?.createdAt ?? null,
    p_cursor_id: cursor?.id ?? null,
    p_limit: limit + 1, // fetch one extra to detect another page
  });
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as MessageRow[];
  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;
  const messages = pageRows.map(toMessageView);

  const last = pageRows[pageRows.length - 1];
  const nextCursor =
    hasMore && last ? encodeCursor({ createdAt: last.created_at, id: last.id }) : null;
  return { status: "ok", page: { messages, nextCursor } };
}

export type SendMessageResult =
  | { status: "ok"; message: MessageView }
  | { status: "not_found" }
  | { status: "closed" }
  | { status: "invalid" };

/**
 * Send a message: verify the caller sees the match (party), reject closed matches
 * (422 per contract; chat stays open on 'hired'), sanitize on write, insert under
 * RLS — the "match parties send messages" policy re-checks party + verified + open
 * at the database even if this logic ever drifts. Realtime delivery is the DB
 * trigger's job, not ours.
 */
export async function sendMessage(
  callerUserId: string,
  matchId: string,
  rawBody: string,
): Promise<SendMessageResult> {
  const supabase = await createClient();
  const match = await getMatchForCaller(supabase, matchId);
  if (!match) return { status: "not_found" };
  if (match.status === "closed_by_worker" || match.status === "closed_by_employer") {
    return { status: "closed" };
  }

  const body = sanitizeMessageBody(rawBody);
  if (body.length === 0 || body.length > MESSAGE_MAX_LENGTH) return { status: "invalid" };

  const { data, error } = await supabase
    .from("messages")
    .insert({ match_id: matchId, sender_user_id: callerUserId, body })
    .select("id, match_id, sender_user_id, body, read_at, created_at")
    .single();
  if (error) {
    // RLS with-check rejection (42501): the match closed between our read and the
    // insert (or verification was revoked) — surface as closed, not a 500.
    if (error.code === "42501") return { status: "closed" };
    throw new Error(error.message);
  }
  return { status: "ok", message: toMessageView(data as MessageRow) };
}

export type MarkReadResult = { status: "ok"; marked: number } | { status: "not_found" };

/**
 * Read receipts: mark every counterpart message as read. The `mark_match_read`
 * SECURITY DEFINER function enforces party membership (-1 → 404) and nudges the
 * counterpart's open chat over the private channel.
 */
export async function markMatchRead(matchId: string): Promise<MarkReadResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("mark_match_read", { p_match_id: matchId });
  if (error) throw new Error(error.message);

  const marked = typeof data === "number" ? data : -1;
  if (marked < 0) return { status: "not_found" };
  return { status: "ok", marked };
}

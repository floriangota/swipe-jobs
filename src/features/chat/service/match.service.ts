import "server-only";
import { createClient } from "@/lib/supabase/server";
import { clampLimit, decodeCursor, encodeCursor } from "@/lib/cursor";
import {
  toMatchDetailView,
  toMatchListItemView,
  type MatchDetailRow,
  type MatchDetailView,
  type MatchInboxRow,
  type MatchListItemView,
  type MatchStatus,
} from "../types";

export interface MatchInboxPage {
  matches: MatchListItemView[];
  nextCursor: string | null;
}

/**
 * The caller's matches inbox, newest activity first. Served by the `match_inbox`
 * SECURITY DEFINER function, which scopes to matches the caller is party to and
 * returns the counterpart's display name + last message + unread count — never
 * phone/email (the inbox is not the reveal point).
 */
export async function listMatches(
  callerUserId: string,
  opts?: { cursor?: string | null; limit?: number },
): Promise<MatchInboxPage> {
  const supabase = await createClient();
  const limit = clampLimit(opts?.limit);
  const cursor = opts?.cursor ? decodeCursor(opts.cursor) : null;

  const { data, error } = await supabase.rpc("match_inbox", {
    p_cursor_activity_at: cursor?.createdAt ?? null,
    p_cursor_id: cursor?.id ?? null,
    p_limit: limit + 1, // fetch one extra to detect another page
  });
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as MatchInboxRow[];
  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;
  const matches = pageRows.map((row) => toMatchListItemView(row, callerUserId));

  const last = pageRows[pageRows.length - 1];
  const nextCursor =
    hasMore && last
      ? encodeCursor({ createdAt: last.activity_at, id: last.match_id })
      : null;
  return { matches, nextCursor };
}

/**
 * Match detail — THE golden-rule reveal point (api-contract.md §6). The
 * `match_detail` SECURITY DEFINER function checks party membership inline and
 * returns ZERO rows to a non-party, so a null here means 404: a non-party never
 * learns the match exists, let alone any contact field.
 */
export async function getMatchDetail(matchId: string): Promise<MatchDetailView | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("match_detail", { p_match_id: matchId });
  if (error) throw new Error(error.message);

  const row = (Array.isArray(data) ? data[0] : data) as MatchDetailRow | undefined;
  return row ? toMatchDetailView(row) : null;
}

export type MatchStatusUpdateResult =
  | { status: "ok"; matchStatus: MatchStatus }
  | { status: "not_found" }
  | { status: "forbidden" }
  | { status: "invalid_transition" };

interface UpdateMatchStatusRow {
  found: boolean;
  is_party: boolean;
  allowed: boolean;
  updated: boolean;
  current_status: MatchStatus | null;
}

/**
 * Change a match's status via the `update_match_status` SECURITY DEFINER function
 * (matches has no client UPDATE policy — transitions can't be policy-enforced).
 * Rules live in the function: worker → closed_by_worker; employer → closed_by_employer
 * or hired; only from 'active'; closed/hired are terminal. `hired` audit-logs the
 * north-star metric inside the same transaction.
 */
export async function updateMatchStatus(
  matchId: string,
  newStatus: MatchStatus,
): Promise<MatchStatusUpdateResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("update_match_status", {
    p_match_id: matchId,
    p_status: newStatus,
  });
  if (error) throw new Error(error.message);

  const row = (Array.isArray(data) ? data[0] : data) as UpdateMatchStatusRow | undefined;
  if (!row || !row.found) return { status: "not_found" };
  if (!row.is_party || !row.allowed) return { status: "forbidden" };
  if (!row.updated) return { status: "invalid_transition" };
  return { status: "ok", matchStatus: newStatus };
}

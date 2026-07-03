import "server-only";
import { createClient } from "@/lib/supabase/server";
import { clampLimit, decodeCursor, encodeCursor } from "../cursor";
import { toFeedCard, type FeedCard, type FeedRow } from "../types";

export interface FeedPage {
  cards: FeedCard[];
  nextCursor: string | null;
}

/**
 * The worker's swipe feed: active listings in their city, in their interested
 * categories, excluding ones they already swiped, keyset-paginated. Served by the
 * `worker_feed` SECURITY DEFINER function, which scopes to the caller's own worker
 * profile and selects a contact-free column set.
 */
export async function getWorkerFeed(opts?: {
  cursor?: string | null;
  limit?: number;
}): Promise<FeedPage> {
  const supabase = await createClient();
  const limit = clampLimit(opts?.limit);
  const cursor = opts?.cursor ? decodeCursor(opts.cursor) : null;

  const { data, error } = await supabase.rpc("worker_feed", {
    p_cursor_created_at: cursor?.createdAt ?? null,
    p_cursor_id: cursor?.id ?? null,
    p_limit: limit + 1, // fetch one extra to detect another page
  });
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as FeedRow[];
  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;
  const cards = pageRows.map(toFeedCard);

  const last = pageRows[pageRows.length - 1];
  const nextCursor =
    hasMore && last ? encodeCursor({ createdAt: last.created_at, id: last.id }) : null;
  return { cards, nextCursor };
}

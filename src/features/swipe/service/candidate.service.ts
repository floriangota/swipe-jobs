import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getOwnEmployerProfile } from "@/features/profiles/service/employer-profile.service";
import { clampLimit, decodeCursor, encodeCursor } from "../cursor";
import { toCandidateCardView, type CandidateCardView, type CandidateRow } from "../types";

export interface CandidateStackPage {
  candidates: CandidateCardView[];
  nextCursor: string | null;
}

export type ListingAccess = "owned" | "forbidden" | "not_found";

/**
 * Access check for the candidate stack: does the caller own this listing? Distinguishes
 * 403 (exists but not yours) from 404 (not visible / doesn't exist). Uses the fact that
 * an active listing is readable by any authed user (worker-read RLS) while a non-active
 * listing is only readable by its owner — so a non-owned, non-active listing reads as
 * not_found (no existence leak).
 */
export async function listingAccess(userId: string, listingId: string): Promise<ListingAccess> {
  const supabase = await createClient();
  const profile = await getOwnEmployerProfile(userId);
  const { data } = await supabase
    .from("listings")
    .select("employer_profile_id")
    .eq("id", listingId)
    .maybeSingle();
  const row = data as { employer_profile_id: string } | null;
  if (!row) return "not_found";
  return row.employer_profile_id === profile?.id ? "owned" : "forbidden";
}

/**
 * The employer's candidate stack for a listing: workers who right-swiped it and the
 * employer hasn't swiped yet. Served by the `listing_candidates` SECURITY DEFINER
 * function, which enforces ownership + the soft-gate and returns ONLY pre-match-safe
 * fields (first name + last initial — golden rule by construction).
 */
export async function getListingCandidates(
  listingId: string,
  opts?: { cursor?: string | null; limit?: number },
): Promise<CandidateStackPage> {
  const supabase = await createClient();
  const limit = clampLimit(opts?.limit);
  const cursor = opts?.cursor ? decodeCursor(opts.cursor) : null;

  const { data, error } = await supabase.rpc("listing_candidates", {
    p_listing_id: listingId,
    p_cursor_created_at: cursor?.createdAt ?? null,
    p_cursor_id: cursor?.id ?? null,
    p_limit: limit + 1,
  });
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as CandidateRow[];
  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;
  const candidates = pageRows.map(toCandidateCardView);

  const last = pageRows[pageRows.length - 1];
  const nextCursor =
    hasMore && last
      ? encodeCursor({ createdAt: last.swipe_created_at, id: last.swipe_id })
      : null;
  return { candidates, nextCursor };
}

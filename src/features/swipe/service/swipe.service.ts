import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getOwnWorkerProfile } from "@/features/profiles/service/worker-profile.service";
import type { SwipeDirection } from "../types";

export type WorkerSwipeResult =
  | { status: "ok"; interestRegistered: boolean }
  | { status: "no_profile" }
  | { status: "gone" }
  | { status: "already_swiped" };

/**
 * Record a worker's swipe on a listing. The listing must still be active (else 404
 * gone/closed). A repeat swipe hits the UNIQUE(worker_profile_id, listing_id) constraint
 * → clean already_swiped (idempotent, no double-write; no undo in MVP).
 */
export async function recordWorkerSwipe(
  userId: string,
  listingId: string,
  direction: SwipeDirection,
): Promise<WorkerSwipeResult> {
  const supabase = await createClient();
  const profile = await getOwnWorkerProfile(userId);
  if (!profile) return { status: "no_profile" };

  // Only active listings are swipeable (worker-read RLS returns active listings).
  const { data: listing } = await supabase
    .from("listings")
    .select("id")
    .eq("id", listingId)
    .eq("status", "active")
    .maybeSingle();
  if (!listing) return { status: "gone" };

  const { error } = await supabase.from("swipes").insert({
    worker_profile_id: profile.id,
    listing_id: listingId,
    direction,
  });
  if (error) {
    if (error.code === "23505") return { status: "already_swiped" }; // unique violation
    throw new Error(error.message);
  }
  return { status: "ok", interestRegistered: direction === "right" };
}

export type EmployerSwipeResult =
  | { status: "ok"; matched: boolean; matchId: string | null }
  | { status: "forbidden" }
  | { status: "already_swiped" };

interface EmployerSwipeRow {
  authorized: boolean;
  already_swiped: boolean;
  matched: boolean;
  match_id: string | null;
}

/**
 * Record an employer's swipe on a candidate and, on a mutual right-swipe, materialize
 * the match — atomically and race-safe via the `record_employer_swipe` function (one TX
 * + the UNIQUE constraint on matches). Ownership + the verified/visible soft-gate are
 * enforced inside the function.
 */
export async function recordEmployerSwipe(
  listingId: string,
  workerProfileId: string,
  direction: SwipeDirection,
): Promise<EmployerSwipeResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("record_employer_swipe", {
    p_listing_id: listingId,
    p_worker_profile_id: workerProfileId,
    p_direction: direction,
  });
  if (error) throw new Error(error.message);

  const row = (Array.isArray(data) ? data[0] : data) as EmployerSwipeRow | undefined;
  if (!row || !row.authorized) return { status: "forbidden" };
  if (row.already_swiped) return { status: "already_swiped" };
  return { status: "ok", matched: row.matched, matchId: row.match_id };
}

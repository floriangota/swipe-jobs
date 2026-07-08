import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// Background maintenance jobs run by Vercel Cron (service-role; no user session).

const TOKEN_GRACE_DAYS = 7; // keep used/expired tokens briefly for audit, then purge
const STALE_LISTING_DAYS = 60; // auto-close active listings with no swipe activity

export interface CleanupSummary {
  deletedTokens: number;
}

/** Purge email-verification tokens that are used or long expired. */
export async function cleanupExpiredTokens(): Promise<CleanupSummary> {
  const supabase = createAdminClient();
  const cutoff = new Date(Date.now() - TOKEN_GRACE_DAYS * 24 * 3600_000).toISOString();

  // Expired past the grace window, OR already used past the grace window.
  const { data, error } = await supabase
    .from("email_verifications")
    .delete()
    .or(`expires_at.lt.${cutoff},used_at.lt.${cutoff}`)
    .select("id");
  if (error) throw new Error(error.message);
  return { deletedTokens: (data ?? []).length };
}

export interface StaleListingSummary {
  closedListings: number;
}

/**
 * Close active listings with no swipe activity for STALE_LISTING_DAYS. Reversible
 * (employer can reopen) and audit-logged. Conservative for the pilot: only listings
 * both created and last-updated before the cutoff, with zero recent swipes.
 */
export async function closeStaleListings(): Promise<StaleListingSummary> {
  const supabase = createAdminClient();
  const cutoff = new Date(Date.now() - STALE_LISTING_DAYS * 24 * 3600_000).toISOString();

  const { data: candidates, error } = await supabase
    .from("listings")
    .select("id")
    .eq("status", "active")
    .lt("created_at", cutoff)
    .lt("updated_at", cutoff);
  if (error) throw new Error(error.message);

  const ids: string[] = (candidates ?? []).map((r) => (r as { id: string }).id);
  if (ids.length === 0) return { closedListings: 0 };

  // Exclude any listing that has a recent swipe (still getting interest).
  const { data: recentSwipes } = await supabase
    .from("swipes")
    .select("listing_id")
    .in("listing_id", ids)
    .gte("created_at", cutoff);
  const active = new Set((recentSwipes ?? []).map((r) => (r as { listing_id: string }).listing_id));
  const toClose = ids.filter((id) => !active.has(id));
  if (toClose.length === 0) return { closedListings: 0 };

  const { error: updErr } = await supabase
    .from("listings")
    .update({ status: "closed" })
    .in("id", toClose);
  if (updErr) throw new Error(updErr.message);

  // Audit each closure (system actor = null). Metadata carries no PII.
  await supabase.from("audit_logs").insert(
    toClose.map((id) => ({
      actor_user_id: null,
      action: "listing_closed_stale",
      target_type: "listing",
      target_id: id,
      metadata: { reason: "no_activity", days: STALE_LISTING_DAYS },
    })),
  );

  return { closedListings: toClose.length };
}

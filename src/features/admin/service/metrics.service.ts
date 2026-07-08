import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { AdminMetrics } from "../types";

async function count(
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: string,
): Promise<number> {
  const { count: c } = await supabase.from(table).select("id", { count: "exact", head: true });
  return c ?? 0;
}

/**
 * Marketplace-health metrics for the admin dashboard (cold-start visibility). Read
 * via the RLS-limited client — the admin RLS SELECT policies grant the cross-table
 * counts; a non-admin gets 0s (defense in depth).
 */
export async function getMetrics(): Promise<AdminMetrics> {
  const supabase = await createClient();

  const eq = async (table: string, col: string, val: string) => {
    const { count } = await supabase
      .from(table)
      .select("id", { count: "exact", head: true })
      .eq(col, val);
    return count ?? 0;
  };

  const [
    usersTotal,
    workers,
    employers,
    admins,
    suspended,
    active,
    paused,
    closed,
    matchesTotal,
    hired,
    pendingPhotos,
    openReports,
  ] = await Promise.all([
    count(supabase, "users"),
    eq("users", "role", "worker"),
    eq("users", "role", "employer"),
    eq("users", "role", "admin"),
    eq("users", "status", "suspended"),
    eq("listings", "status", "active"),
    eq("listings", "status", "paused"),
    eq("listings", "status", "closed"),
    count(supabase, "matches"),
    eq("matches", "status", "hired"),
    eq("photos", "status", "pending"),
    eq("reports", "status", "open"),
  ]);

  return {
    users: { total: usersTotal, workers, employers, admins, suspended },
    listings: { active, paused, closed },
    matches: { total: matchesTotal, hired },
    queues: { pendingPhotos, openReports },
  };
}

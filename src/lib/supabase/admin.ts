import "server-only";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import { getServerEnv } from "@/lib/env.server";

/**
 * Service-role Supabase client — BYPASSES Row Level Security. Server-only, for
 * privileged operations that legitimately need to sidestep RLS (e.g. writing
 * email-verification tokens, stamping email_verified_at). NEVER import into
 * client code and never use it on user-facing read paths where RLS is the guard.
 */
export function createAdminClient() {
  if (!env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error("Supabase is not configured (NEXT_PUBLIC_SUPABASE_URL).");
  }
  const { SUPABASE_SECRET_KEY } = getServerEnv();

  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env } from "@/lib/env";

/**
 * Server Supabase client (Server Components, route handlers, server actions).
 *
 * Uses the RLS-limited publishable key and the cookie getAll/setAll interface
 * (the current @supabase/ssr pattern). The secret key is never used here.
 *
 * M0: connection wiring only. Session refresh (a proxy.ts) arrives with auth in M1.
 */
export async function createClient() {
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local.",
    );
  }

  const cookieStore = await cookies();

  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Called from a Server Component, which cannot write cookies. Safe to
            // ignore when a session-refresh proxy is in place (added in M1).
          }
        },
      },
    },
  );
}

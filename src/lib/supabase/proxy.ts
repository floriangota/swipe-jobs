import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";

/**
 * Refreshes the Supabase auth session on each request (Next 16 proxy).
 *
 * CRITICAL invariants (Supabase SSR docs):
 *  - use ONLY getAll/setAll cookie methods;
 *  - do NOT put any logic between createServerClient() and getUser();
 *  - always return the (mutated) supabaseResponse object.
 * Breaking any of these causes intermittent logout loops.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  // No credentials (e.g. local dev before Supabase is wired) — no-op passthrough.
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    return supabaseResponse;
  }

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Do not insert code above this line. getUser() revalidates + refreshes tokens.
  await supabase.auth.getUser();

  return supabaseResponse;
}

import "server-only";

/**
 * Rate-limit seam. M1 ships a NO-OP and relies on Supabase Auth's built-in
 * per-IP/per-user limits as the backstop. Real limiting (Upstash Ratelimit,
 * keyed by user + IP) is wired in M9 — see docs/security.md and docs/roadmap.md.
 *
 * Callers already invoke this at the top of sensitive actions so M9 only needs
 * to fill in the implementation, not touch every call site.
 */
export interface RateLimitResult {
  ok: boolean;
  retryAfterSeconds?: number;
}

export async function checkRateLimit(_key: string): Promise<RateLimitResult> {
  // M9: wire Upstash Ratelimit here.
  return { ok: true };
}

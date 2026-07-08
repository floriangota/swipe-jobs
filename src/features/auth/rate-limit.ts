import "server-only";

/**
 * Rate limiting (docs/security.md). Real as of M9. Callers pass a namespaced key
 * (`<action>:<identity>`); the per-action budget is derived from the prefix, so no
 * call site changes when tuning limits.
 *
 * Backend: if UPSTASH_REDIS_REST_* is configured, a distributed fixed-window counter
 * over Redis (via the REST API — no extra dependency); otherwise an in-memory
 * fixed-window fallback (per-instance — fine for dev / a single Vercel instance;
 * set Upstash for multi-instance production). The limiter FAILS OPEN on backend
 * errors: abuse-prevention should never lock out every user during an outage.
 */

export interface RateLimitResult {
  ok: boolean;
  retryAfterSeconds?: number;
}

interface Budget {
  limit: number;
  windowSec: number;
}

// Per-action budgets (fixed window). Tight for auth/abuse surfaces, generous for swipes.
const BUDGETS: Record<string, Budget> = {
  login: { limit: 8, windowSec: 60 },
  signup: { limit: 5, windowSec: 60 },
  reset: { limit: 5, windowSec: 60 },
  "update-password": { limit: 5, windowSec: 60 },
  message: { limit: 30, windowSec: 60 },
  swipe: { limit: 120, windowSec: 60 },
  report: { limit: 10, windowSec: 600 },
  photo_upload: { limit: 10, windowSec: 600 },
};
const DEFAULT_BUDGET: Budget = { limit: 60, windowSec: 60 };

function budgetFor(key: string): Budget {
  const prefix = key.split(":", 1)[0] ?? "";
  return BUDGETS[prefix] ?? DEFAULT_BUDGET;
}

// ---- In-memory fixed-window store (testable) --------------------------------
interface WindowEntry {
  count: number;
  resetAt: number; // epoch ms
}

export function createInMemoryLimiter() {
  const store = new Map<string, WindowEntry>();
  let lastPrune = 0;

  return function check(key: string, budget: Budget, now: number): RateLimitResult {
    // Opportunistic prune so the map can't grow unbounded.
    if (now - lastPrune > 60_000) {
      for (const [k, e] of store) if (e.resetAt <= now) store.delete(k);
      lastPrune = now;
    }
    let entry = store.get(key);
    if (!entry || now >= entry.resetAt) {
      entry = { count: 0, resetAt: now + budget.windowSec * 1000 };
      store.set(key, entry);
    }
    entry.count += 1;
    if (entry.count <= budget.limit) return { ok: true };
    return { ok: false, retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000) };
  };
}

const memoryLimiter = createInMemoryLimiter();

// ---- Upstash Redis REST (distributed) ---------------------------------------
async function upstashCheck(key: string, budget: Budget): Promise<RateLimitResult | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  const redisKey = `rl:${key}`;
  try {
    // INCR then, on the first hit, set the window TTL (pipeline in one round-trip).
    const res = await fetch(`${url}/pipeline`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify([
        ["INCR", redisKey],
        ["EXPIRE", redisKey, String(budget.windowSec), "NX"],
        ["PTTL", redisKey],
      ]),
      cache: "no-store",
    });
    if (!res.ok) return null; // fail open
    const out = (await res.json()) as { result: unknown }[];
    const count = Number(out?.[0]?.result ?? 0);
    const pttl = Number(out?.[2]?.result ?? budget.windowSec * 1000);
    if (count <= budget.limit) return { ok: true };
    return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil(pttl / 1000)) };
  } catch {
    return null; // fail open on any transport error
  }
}

export async function checkRateLimit(key: string): Promise<RateLimitResult> {
  const budget = budgetFor(key);
  const distributed = await upstashCheck(key, budget);
  if (distributed) return distributed;
  return memoryLimiter(key, budget, Date.now());
}

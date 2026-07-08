import "server-only";
import { timingSafeEqual } from "node:crypto";
import { getServerEnv } from "@/lib/env.server";

/**
 * Authorize a Vercel Cron request. Vercel sends `Authorization: Bearer $CRON_SECRET`.
 * Fails CLOSED: if CRON_SECRET is unset, every request is rejected. Uses a constant-time
 * comparison (length check first — timingSafeEqual requires equal-length buffers) so the
 * secret can't be recovered byte-by-byte via response timing.
 */
export function isAuthorizedCron(request: Request): boolean {
  const { CRON_SECRET } = getServerEnv();
  if (!CRON_SECRET) return false;
  const header = request.headers.get("authorization");
  if (!header) return false;
  const expected = Buffer.from(`Bearer ${CRON_SECRET}`);
  const actual = Buffer.from(header);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

import "server-only";
import { getServerEnv } from "@/lib/env.server";

/**
 * Authorize a Vercel Cron request. Vercel sends `Authorization: Bearer $CRON_SECRET`.
 * Fails CLOSED: if CRON_SECRET is unset, every request is rejected. Constant-ish
 * comparison via a length check first (secrets are fixed-length per deploy).
 */
export function isAuthorizedCron(request: Request): boolean {
  const { CRON_SECRET } = getServerEnv();
  if (!CRON_SECRET) return false;
  const header = request.headers.get("authorization");
  return header === `Bearer ${CRON_SECRET}`;
}

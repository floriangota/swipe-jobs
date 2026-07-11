import { NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/cron";
import { dispatchPendingEmails } from "@/features/notifications/service/email-dispatch.service";
import {
  cleanupExpiredTokens,
  closeStaleListings,
} from "@/features/notifications/service/maintenance.service";

// Consolidated daily cron (Vercel Hobby allows only daily crons). Runs all three
// maintenance jobs in one scheduled invocation. On Vercel Pro, prefer the individual
// routes on tighter schedules (see vercel.json history) — e.g. dispatch-emails every
// couple of minutes so offline-message emails go out promptly. CRON_SECRET-gated.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: { code: "forbidden", message: "Forbidden." } }, { status: 401 });
  }
  // Independent jobs over different tables — run sequentially so one slow job doesn't
  // starve the others of the (short) Hobby function budget.
  const emails = await dispatchPendingEmails();
  const tokens = await cleanupExpiredTokens();
  const listings = await closeStaleListings();
  return NextResponse.json({ data: { emails, tokens, listings } });
}

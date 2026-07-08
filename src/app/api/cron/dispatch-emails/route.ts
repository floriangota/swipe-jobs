import { NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/cron";
import { dispatchPendingEmails } from "@/features/notifications/service/email-dispatch.service";

// Vercel Cron: send pending notification emails (new match, offline new message).
// CRON_SECRET-gated (fails closed). Node runtime (Resend). Idempotent via emailed_at.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: { code: "forbidden", message: "Forbidden." } }, { status: 401 });
  }
  const summary = await dispatchPendingEmails();
  return NextResponse.json({ data: summary });
}

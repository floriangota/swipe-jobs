import { NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/cron";
import { cleanupExpiredTokens } from "@/features/notifications/service/maintenance.service";

// Vercel Cron (daily): purge used/expired email-verification tokens. CRON_SECRET-gated.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: { code: "forbidden", message: "Forbidden." } }, { status: 401 });
  }
  const summary = await cleanupExpiredTokens();
  return NextResponse.json({ data: summary });
}

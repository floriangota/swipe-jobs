import { NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/cron";
import { closeStaleListings } from "@/features/notifications/service/maintenance.service";

// Vercel Cron (daily): close active listings with no swipe activity for 60 days
// (reversible + audit-logged). CRON_SECRET-gated.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: { code: "forbidden", message: "Forbidden." } }, { status: 401 });
  }
  const summary = await closeStaleListings();
  return NextResponse.json({ data: summary });
}

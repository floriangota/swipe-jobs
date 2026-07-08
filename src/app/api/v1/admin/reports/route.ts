import { NextResponse } from "next/server";
import { requireAdminApi } from "@/features/admin/api-guard";
import { listReports } from "@/features/admin/service/reports.service";

// GET /admin/reports?status=open (api-contract.md §11). Report queue.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAdminApi();
  if ("error" in auth) return auth.error;
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") === "all" ? "all" : "open";
  const reports = await listReports(status);
  return NextResponse.json({ data: reports });
}

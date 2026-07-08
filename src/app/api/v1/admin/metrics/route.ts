import { NextResponse } from "next/server";
import { requireAdminApi } from "@/features/admin/api-guard";
import { getMetrics } from "@/features/admin/service/metrics.service";

// GET /admin/metrics (api-contract.md §11). Marketplace-health counts.
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAdminApi();
  if ("error" in auth) return auth.error;
  const metrics = await getMetrics();
  return NextResponse.json({ data: metrics });
}

import { NextResponse } from "next/server";
import { requireAdminApi } from "@/features/admin/api-guard";
import { listAuditLogs } from "@/features/admin/service/audit.service";

// GET /admin/audit (roadmap M8: audit_logs surfaced). Cursor-paginated trail.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAdminApi();
  if ("error" in auth) return auth.error;
  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get("cursor");
  const { entries, nextCursor } = await listAuditLogs({ cursor });
  return NextResponse.json({ data: entries, meta: { next_cursor: nextCursor } });
}

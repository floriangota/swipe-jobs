import { NextResponse } from "next/server";
import { requireAdminApi } from "@/features/admin/api-guard";
import { listPendingPhotos } from "@/features/admin/service/moderation.service";

// GET /admin/photos?status=pending (api-contract.md §11). Moderation queue.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const auth = await requireAdminApi();
  if ("error" in auth) return auth.error;
  const photos = await listPendingPhotos();
  return NextResponse.json({ data: photos });
}

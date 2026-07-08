import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi, apiError } from "@/features/admin/api-guard";
import { reportResolveSchema } from "@/features/admin/schemas";
import { resolveReport } from "@/features/admin/service/reports.service";

// POST /admin/reports/:id/resolve (api-contract.md §11). dismiss | suspend_user | remove_listing.
export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi();
  if ("error" in auth) return auth.error;

  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return apiError("not_found", "Report not found.", 404);

  const body = await request.json().catch(() => null);
  const parsed = reportResolveSchema.safeParse(body);
  if (!parsed.success) return apiError("invalid_input", "A valid action is required.", 400);

  const result = await resolveReport(id, parsed.data.action, parsed.data.note);
  switch (result.status) {
    case "not_found":
      return apiError("not_found", "Report not found.", 404);
    case "invalid":
      return apiError("invalid_action", "That action can't be applied to this report.", 422);
    case "forbidden":
      return apiError("forbidden", "Not allowed.", 403);
    case "ok":
      return NextResponse.json({ data: { id, action: parsed.data.action } });
  }
}

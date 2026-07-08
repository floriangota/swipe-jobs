import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi, apiError } from "@/features/admin/api-guard";
import { photoReviewSchema } from "@/features/admin/schemas";
import { reviewPhoto } from "@/features/admin/service/moderation.service";

// POST /admin/photos/:id/review (api-contract.md §11). Approve/reject a photo.
export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi();
  if ("error" in auth) return auth.error;

  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return apiError("not_found", "Photo not found.", 404);

  const body = await request.json().catch(() => null);
  const parsed = photoReviewSchema.safeParse(body);
  if (!parsed.success) return apiError("invalid_input", "A decision is required.", 400);

  const result = await reviewPhoto(id, parsed.data.decision);
  switch (result.status) {
    case "not_found":
      return apiError("not_found", "Photo not found.", 404);
    case "forbidden":
      return apiError("forbidden", "Not allowed.", 403);
    case "ok":
      return NextResponse.json({ data: { id, status: parsed.data.decision } });
  }
}

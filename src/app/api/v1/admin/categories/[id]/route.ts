import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi, apiError } from "@/features/admin/api-guard";
import { categoryUpsertSchema } from "@/features/admin/schemas";
import { upsertCategory } from "@/features/admin/service/categories.service";

// PATCH /admin/categories/:id (api-contract.md §11). Edit a category (bilingual).
export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi();
  if ("error" in auth) return auth.error;

  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return apiError("not_found", "Category not found.", 404);

  const body = await request.json().catch(() => null);
  const parsed = categoryUpsertSchema.safeParse({ ...(body ?? {}), id });
  if (!parsed.success) return apiError("invalid_input", "A valid category is required.", 400);

  const result = await upsertCategory(parsed.data);
  if (result.status === "conflict") return apiError("conflict", "That slug is already in use.", 409);
  if (result.status === "forbidden") return apiError("forbidden", "Not allowed.", 403);
  return NextResponse.json({ data: { id: result.id } });
}

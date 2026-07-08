import { NextResponse } from "next/server";
import { requireAdminApi, apiError } from "@/features/admin/api-guard";
import { categoryUpsertSchema } from "@/features/admin/schemas";
import { listCategoriesAdmin, upsertCategory } from "@/features/admin/service/categories.service";

// GET/POST /admin/categories (api-contract.md §11). List + create (bilingual).
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAdminApi();
  if ("error" in auth) return auth.error;
  const categories = await listCategoriesAdmin();
  return NextResponse.json({ data: categories });
}

export async function POST(request: Request) {
  const auth = await requireAdminApi();
  if ("error" in auth) return auth.error;

  const body = await request.json().catch(() => null);
  // Creation: reject a client-supplied id.
  const parsed = categoryUpsertSchema.safeParse(body);
  if (!parsed.success || parsed.data.id) return apiError("invalid_input", "A valid category is required.", 400);

  const result = await upsertCategory(parsed.data);
  if (result.status === "conflict") return apiError("conflict", "That slug is already in use.", 409);
  if (result.status === "forbidden") return apiError("forbidden", "Not allowed.", 403);
  return NextResponse.json({ data: { id: result.id } }, { status: 201 });
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi, apiError } from "@/features/admin/api-guard";
import { suspendSchema } from "@/features/admin/schemas";
import { suspendUser } from "@/features/admin/service/users.service";

// POST /admin/users/:id/suspend (api-contract.md §11). Suspend a user (not self).
export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi();
  if ("error" in auth) return auth.error;

  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return apiError("not_found", "User not found.", 404);

  const body = await request.json().catch(() => null);
  const parsed = suspendSchema.safeParse(body);
  if (!parsed.success) return apiError("invalid_input", "A reason is required.", 400);

  const result = await suspendUser(id, parsed.data.reason);
  switch (result.status) {
    case "not_found":
      return apiError("not_found", "User not found.", 404);
    case "forbidden":
      // Also the self-suspension guard in the DB function.
      return apiError("forbidden", "Not allowed.", 403);
    case "ok":
      return NextResponse.json({ data: { id, status: "suspended" } });
  }
}

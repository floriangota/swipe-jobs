import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/guards";
import { deleteOwnPhoto } from "@/features/photos/service/photo.service";

// DELETE /photos/:id (api-contract.md §7). Owner-only (RLS-scoped).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "unauthenticated", message: "Not signed in." } },
      { status: 401 },
    );
  }

  const { id } = await params;
  if (!z.uuid().safeParse(id).success) {
    return NextResponse.json(
      { error: { code: "not_found", message: "Photo not found." } },
      { status: 404 },
    );
  }

  const ok = await deleteOwnPhoto(id);
  if (!ok) {
    return NextResponse.json(
      { error: { code: "forbidden", message: "Not your photo." } },
      { status: 403 },
    );
  }

  return new NextResponse(null, { status: 204 });
}

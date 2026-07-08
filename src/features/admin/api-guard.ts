import { NextResponse } from "next/server";
import { getCurrentUser, type AppUser } from "@/lib/auth/guards";

/**
 * Admin API gate (app layer — the DB enforces it again via admin RLS policies +
 * admin_* SECURITY DEFINER functions). Returns the admin user or a ready response.
 */
export async function requireAdminApi(): Promise<{ user: AppUser } | { error: NextResponse }> {
  const user = await getCurrentUser();
  if (!user) {
    return {
      error: NextResponse.json(
        { error: { code: "unauthenticated", message: "Not signed in." } },
        { status: 401 },
      ),
    };
  }
  if (user.role !== "admin") {
    return {
      error: NextResponse.json({ error: { code: "forbidden", message: "Admins only." } }, { status: 403 }),
    };
  }
  return { user };
}

export function apiError(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

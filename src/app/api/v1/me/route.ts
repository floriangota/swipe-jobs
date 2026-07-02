import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/guards";

// GET /me (api-contract.md §1). Own minimal record only — never contact fields.
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { error: { code: "unauthenticated", message: "Not signed in." } },
      { status: 401 },
    );
  }

  return NextResponse.json({
    data: {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
        city_id: user.cityId,
        email_verified: user.emailVerified,
      },
      // Profiles arrive in M2; the key ships now for a stable client contract.
      profile: null,
    },
  });
}

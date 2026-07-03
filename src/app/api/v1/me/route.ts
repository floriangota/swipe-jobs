import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/guards";
import { getOwnWorkerProfile } from "@/features/profiles/service/worker-profile.service";
import { getOwnEmployerProfile } from "@/features/profiles/service/employer-profile.service";

// GET /me (api-contract.md §1). Own record only — never other users' contact fields.
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { error: { code: "unauthenticated", message: "Not signed in." } },
      { status: 401 },
    );
  }

  // The user's OWN profile (own contact fields are fine — golden rule is about others).
  const profile =
    user.role === "worker"
      ? await getOwnWorkerProfile(user.id)
      : user.role === "employer"
        ? await getOwnEmployerProfile(user.id)
        : null;

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
      profile,
    },
  });
}

import { NextResponse, type NextRequest } from "next/server";
import { verifyToken } from "@/features/auth/service/verification.service";
import { getSiteUrl } from "@/lib/env";

// App-managed email verification link target (GET, because it's a link click).
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const base = getSiteUrl();

  if (!token) {
    return NextResponse.redirect(`${base}/verify-email?error=invalid`);
  }

  const result = await verifyToken(token);
  if (result.ok) {
    return NextResponse.redirect(`${base}/verify-email?verified=1`);
  }
  return NextResponse.redirect(`${base}/verify-email?error=${result.reason}`);
}

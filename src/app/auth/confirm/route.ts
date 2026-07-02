import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/env";

// Supabase-native recovery/confirm link target (GET). Exchanges the token_hash
// for a session cookie, then redirects to `next` (e.g. /update-password).
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const tokenHash = params.get("token_hash");
  const type = params.get("type") as EmailOtpType | null;
  const next = params.get("next") ?? "/";
  const base = getSiteUrl();

  // Only allow same-site relative redirects.
  const safeNext = next.startsWith("/") ? next : "/";

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      return NextResponse.redirect(`${base}${safeNext}`);
    }
  }

  return NextResponse.redirect(`${base}/login?error=link_invalid`);
}

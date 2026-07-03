import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

// Next 16 renamed middleware.ts -> proxy.ts; the exported function must be named
// `proxy` (Node.js runtime). Its only job is refreshing the Supabase session —
// authorization is enforced by service-layer guards + RLS, not here.
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  // Run on everything except static assets + generated icons/manifest/sw.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|manifest.webmanifest|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

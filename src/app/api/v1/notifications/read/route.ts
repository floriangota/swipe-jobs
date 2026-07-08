import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/guards";
import { markReadSchema } from "@/features/notifications/schemas";
import { markNotificationsRead } from "@/features/notifications/service/notification.service";

// POST /notifications/read (api-contract.md §9). Mark the caller's notifications read;
// { ids?: [...] } — omit or empty to mark all. Scoped to auth.uid() in the RPC.
export const dynamic = "force-dynamic";

function err(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return err("unauthenticated", "Not signed in.", 401);
  if (user.status !== "active") return err("account_inactive", "This account is not active.", 403);

  // Body is optional (no body = mark all). Only reject a present-but-malformed body.
  const raw = await request.json().catch(() => null);
  const parsed = markReadSchema.safeParse(raw ?? {});
  if (!parsed.success) return err("invalid_input", "Invalid notification ids.", 400);

  await markNotificationsRead(parsed.data.ids);
  return new NextResponse(null, { status: 204 });
}

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/guards";
import { listNotifications } from "@/features/notifications/service/notification.service";

// GET /notifications (api-contract.md §9). Own notifications only (RLS); cursor-paginated
// with the unread count in meta (for the header badge).
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "unauthenticated", message: "Not signed in." } },
      { status: 401 },
    );
  }

  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get("cursor");
  const limitParam = searchParams.get("limit");
  const limit = limitParam != null ? Number(limitParam) : undefined;

  const { notifications, nextCursor, unreadCount } = await listNotifications({
    cursor,
    limit: Number.isFinite(limit) ? limit : undefined,
  });

  return NextResponse.json({
    data: notifications,
    meta: { next_cursor: nextCursor, unread_count: unreadCount },
  });
}

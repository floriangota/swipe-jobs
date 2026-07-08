import "server-only";
import { createClient } from "@/lib/supabase/server";
import { clampLimit, decodeCursor, encodeCursor } from "@/lib/cursor";
import { toNotificationView, type NotificationRow, type NotificationView } from "../types";

export interface NotificationsPage {
  notifications: NotificationView[];
  nextCursor: string | null;
  unreadCount: number;
}

/** The caller's own notifications, newest first, keyset-paginated, plus the current
 *  unread count. RLS scopes reads to the caller's own rows. */
export async function listNotifications(opts?: {
  cursor?: string | null;
  limit?: number;
}): Promise<NotificationsPage> {
  const supabase = await createClient();
  const limit = clampLimit(opts?.limit);
  const cursor = opts?.cursor ? decodeCursor(opts.cursor) : null;

  let query = supabase
    .from("notifications")
    .select("id, type, payload, read_at, created_at")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit + 1); // fetch one extra to detect another page

  if (cursor) {
    // Keyset: (created_at, id) < (cursor.createdAt, cursor.id).
    query = query.or(
      `created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`,
    );
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as NotificationRow[];
  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;
  const notifications = pageRows.map(toNotificationView);

  const last = pageRows[pageRows.length - 1];
  const nextCursor =
    hasMore && last ? encodeCursor({ createdAt: last.created_at, id: last.id }) : null;

  const unreadCount = await getUnreadCount();
  return { notifications, nextCursor, unreadCount };
}

/** Count of the caller's unread notifications (for the header badge). */
export async function getUnreadCount(): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .is("read_at", null);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

/** Mark the caller's notifications read. ids null/empty => mark all. Returns the count.
 *  Enforced in the mark_notifications_read RPC (scoped to auth.uid()). */
export async function markNotificationsRead(ids?: string[]): Promise<number> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("mark_notifications_read", {
    p_ids: ids && ids.length > 0 ? ids : null,
  });
  if (error) throw new Error(error.message);
  return typeof data === "number" ? data : 0;
}

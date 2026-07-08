import "server-only";
import { createClient } from "@/lib/supabase/server";
import { clampLimit, decodeCursor, encodeCursor } from "@/lib/cursor";
import type { AuditLogView } from "../types";

interface AuditRow {
  id: string;
  actor_user_id: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface AuditPage {
  entries: AuditLogView[];
  nextCursor: string | null;
}

/** The security/analytics trail, newest first (admin RLS SELECT policy grants it). */
export async function listAuditLogs(opts?: {
  cursor?: string | null;
  limit?: number;
}): Promise<AuditPage> {
  const supabase = await createClient();
  const limit = clampLimit(opts?.limit, { def: 30, max: 50 });
  const cursor = opts?.cursor ? decodeCursor(opts.cursor) : null;

  let query = supabase
    .from("audit_logs")
    .select("id, actor_user_id, action, target_type, target_id, metadata, created_at")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit + 1);
  if (cursor) {
    query = query.or(
      `created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`,
    );
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as AuditRow[];
  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;

  const last = pageRows[pageRows.length - 1];
  const nextCursor =
    hasMore && last ? encodeCursor({ createdAt: last.created_at, id: last.id }) : null;

  return {
    entries: pageRows.map((r) => ({
      id: r.id,
      actorUserId: r.actor_user_id,
      action: r.action,
      targetType: r.target_type,
      targetId: r.target_id,
      metadata: r.metadata ?? {},
      createdAt: r.created_at,
    })),
    nextCursor,
  };
}

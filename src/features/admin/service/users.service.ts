import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { AdminUserView } from "../types";

interface UserRow {
  id: string;
  email: string;
  role: "worker" | "employer" | "admin";
  status: "active" | "suspended" | "deleted";
  email_verified_at: string | null;
  created_at: string;
}

/** List users for the admin console (newest first). Admin RLS SELECT policy grants
 *  reading all users; a non-admin sees only their own row. */
export async function listUsers(opts?: { search?: string; limit?: number }): Promise<AdminUserView[]> {
  const supabase = await createClient();
  let query = supabase
    .from("users")
    .select("id, email, role, status, email_verified_at, created_at")
    .order("created_at", { ascending: false })
    .limit(Math.min(Math.max(opts?.limit ?? 100, 1), 200));
  if (opts?.search) query = query.ilike("email", `%${opts.search}%`);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return ((data ?? []) as UserRow[]).map((r) => ({
    id: r.id,
    email: r.email,
    role: r.role,
    status: r.status,
    emailVerified: r.email_verified_at != null,
    createdAt: r.created_at,
  }));
}

export type SuspendResult = { status: "ok" } | { status: "not_found" } | { status: "forbidden" };

/** Suspend a user via the admin_suspend_user SECURITY DEFINER function (re-checks
 *  admin, refuses self-suspension, audit-logs). */
export async function suspendUser(userId: string, reason: string): Promise<SuspendResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_suspend_user", {
    p_user_id: userId,
    p_reason: reason,
  });
  if (error) throw new Error(error.message);
  const row = (Array.isArray(data) ? data[0] : data) as { ok: boolean; not_found: boolean } | undefined;
  if (!row) return { status: "forbidden" };
  if (row.not_found) return { status: "not_found" };
  if (!row.ok) return { status: "forbidden" };
  return { status: "ok" };
}

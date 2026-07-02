import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

export type AppRole = "worker" | "employer" | "admin";
export type AppStatus = "active" | "suspended" | "deleted";

export interface AppUser {
  id: string;
  email: string;
  role: AppRole;
  status: AppStatus;
  cityId: string;
  emailVerified: boolean;
}

interface UsersRow {
  id: string;
  email: string;
  role: AppRole;
  status: AppStatus;
  city_id: string;
  email_verified_at: string | null;
}

/**
 * The current app user, or null if not authenticated / not yet provisioned.
 * Uses getUser() (authoritative — revalidates against the Auth server), so a
 * revoked/suspended session is caught even if the JWT hasn't expired.
 */
export async function getCurrentUser(): Promise<AppUser | null> {
  // Zero-config boot (e.g. local dev before Supabase is wired): no user.
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;

  const { data } = await supabase
    .from("users")
    .select("id, email, role, status, city_id, email_verified_at")
    .eq("id", user.id)
    .single();

  const row = data as UsersRow | null;
  if (!row) return null;

  return {
    id: row.id,
    email: row.email,
    role: row.role,
    status: row.status,
    cityId: row.city_id,
    emailVerified: row.email_verified_at != null,
  };
}

/** Page guard: redirects unauthenticated or non-active users to /login. */
export async function requireUser(): Promise<AppUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.status !== "active") redirect("/login?reason=inactive");
  return user;
}

/** Page guard: requires one of the given roles (else home). */
export async function requireRole(...roles: AppRole[]): Promise<AppUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect("/");
  return user;
}

/** Page guard for verified-only areas (match/chat land in M5/M6). */
export async function requireVerified(): Promise<AppUser> {
  const user = await requireUser();
  if (!user.emailVerified) redirect("/verify-email");
  return user;
}

import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { PendingPhotoView, PhotoType } from "../types";

const SIGNED_URL_TTL = 300; // 5 min — moderation previews

interface PhotoRow {
  id: string;
  type: PhotoType;
  status: "pending" | "approved" | "rejected";
  user_id: string;
  storage_path: string;
  created_at: string;
  users: { email: string } | { email: string }[] | null;
}

/**
 * The pending-photo moderation queue. Admin RLS SELECT policies grant reading all
 * photos + owner profiles + signing the private objects. A non-admin gets 0 rows.
 */
export async function listPendingPhotos(): Promise<PendingPhotoView[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("photos")
    .select("id, type, status, user_id, storage_path, created_at, users(email)")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(100);
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as PhotoRow[];
  if (rows.length === 0) return [];

  const userIds = [...new Set(rows.map((r) => r.user_id))];
  const [workers, employers] = await Promise.all([
    supabase.from("worker_profiles").select("user_id, first_name, last_name").in("user_id", userIds),
    supabase.from("employer_profiles").select("user_id, business_name").in("user_id", userIds),
  ]);
  const nameByUser = new Map<string, string>();
  for (const w of (workers.data ?? []) as { user_id: string; first_name: string; last_name: string }[]) {
    nameByUser.set(w.user_id, `${w.first_name} ${w.last_name}`);
  }
  for (const e of (employers.data ?? []) as { user_id: string; business_name: string }[]) {
    nameByUser.set(e.user_id, e.business_name);
  }

  return Promise.all(
    rows.map(async (r) => {
      const { data: signed } = await supabase.storage
        .from("photos")
        .createSignedUrl(r.storage_path, SIGNED_URL_TTL);
      const owner = Array.isArray(r.users) ? r.users[0] : r.users;
      return {
        id: r.id,
        type: r.type,
        status: r.status,
        ownerUserId: r.user_id,
        ownerEmail: owner?.email ?? "—",
        ownerName: nameByUser.get(r.user_id) ?? "—",
        createdAt: r.created_at,
        signedUrl: signed?.signedUrl ?? null,
      };
    }),
  );
}

export type ReviewPhotoResult = { status: "ok" } | { status: "not_found" } | { status: "forbidden" };

/** Approve/reject a photo (approve wires it onto the owner's profile) via the
 *  admin_review_photo SECURITY DEFINER function, which re-checks admin + audit-logs. */
export async function reviewPhoto(
  photoId: string,
  decision: "approved" | "rejected",
): Promise<ReviewPhotoResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_review_photo", {
    p_photo_id: photoId,
    p_decision: decision,
  });
  if (error) throw new Error(error.message);
  const row = (Array.isArray(data) ? data[0] : data) as { ok: boolean; not_found: boolean } | undefined;
  if (!row) return { status: "forbidden" };
  if (row.not_found) return { status: "not_found" };
  if (!row.ok) return { status: "forbidden" };
  return { status: "ok" };
}

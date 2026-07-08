import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Right-to-erasure (Kosovo LPPD / GDPR). Irreversibly deletes the account and all its
 * data. Order matters: remove the user's private storage objects first (they don't
 * cascade from the DB), THEN hard-delete the auth user — which cascades
 * public.users → worker/employer profiles, swipes, matches, messages, notifications,
 * photos, and reports (every child FK is ON DELETE CASCADE). Uses the service-role
 * client; the caller (a server action) has already authenticated the user and passes
 * only their OWN id.
 */
export async function eraseAccount(userId: string): Promise<void> {
  const admin = createAdminClient();

  // 1. Delete the user's photo objects (photos/{userId}/…) from the private bucket.
  const { data: objects } = await admin.storage.from("photos").list(userId, { limit: 1000 });
  if (objects && objects.length > 0) {
    await admin.storage.from("photos").remove(objects.map((o) => `${userId}/${o.name}`));
  }

  // 2. Hard-delete the auth user → cascades all public.* rows for this user.
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) throw new Error(`Account erasure failed: ${error.message}`);
}

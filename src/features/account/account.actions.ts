"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/guards";
import { eraseAccount } from "./service/account.service";

export type DeleteAccountState = { error?: string } | undefined;

/**
 * Permanently delete the signed-in user's account and all their data, then sign out.
 * The confirmation phrase must be typed exactly (guards against a misclick).
 */
export async function deleteAccount(
  _prev: DeleteAccountState,
  formData: FormData,
): Promise<DeleteAccountState> {
  const user = await requireUser();

  const confirm = String(formData.get("confirm") ?? "").trim();
  if (confirm !== "DELETE") return { error: "confirm_mismatch" };

  try {
    await eraseAccount(user.id);
  } catch {
    return { error: "delete_failed" };
  }

  // Clear the (now-orphaned) session cookie; the auth user no longer exists.
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/?deleted=1");
}

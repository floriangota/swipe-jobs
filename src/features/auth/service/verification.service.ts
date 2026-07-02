import "server-only";
import { randomBytes, createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds

// Store only the hash; the raw token lives only in the emailed link.
function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

/** Create a single-use verification token, persist its hash, return the raw token. */
export async function createVerificationToken(userId: string): Promise<string> {
  const admin = createAdminClient();
  const rawToken = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS).toISOString();

  const { error } = await admin.from("email_verifications").insert({
    user_id: userId,
    token_hash: hashToken(rawToken),
    expires_at: expiresAt,
  });
  if (error) throw new Error(`Failed to create verification token: ${error.message}`);

  return rawToken;
}

export type VerifyResult = { ok: true } | { ok: false; reason: "invalid" | "expired" | "used" };

interface TokenRow {
  id: string;
  user_id: string;
  expires_at: string;
  used_at: string | null;
}

/** Validate a raw token; on success mark it used and stamp email_verified_at. */
export async function verifyToken(rawToken: string): Promise<VerifyResult> {
  const admin = createAdminClient();

  const { data } = await admin
    .from("email_verifications")
    .select("id, user_id, expires_at, used_at")
    .eq("token_hash", hashToken(rawToken))
    .maybeSingle();

  const row = data as TokenRow | null;
  if (!row) return { ok: false, reason: "invalid" };
  if (row.used_at) return { ok: false, reason: "used" };
  if (new Date(row.expires_at).getTime() < Date.now()) return { ok: false, reason: "expired" };

  const now = new Date().toISOString();

  // Atomically claim the token (used_at IS NULL guard prevents double-use races).
  const { data: claimed } = await admin
    .from("email_verifications")
    .update({ used_at: now })
    .eq("id", row.id)
    .is("used_at", null)
    .select("id")
    .maybeSingle();
  if (!claimed) return { ok: false, reason: "used" };

  await admin.from("users").update({ email_verified_at: now }).eq("id", row.user_id);

  return { ok: true };
}

/** Whether the user may request another verification email (cooldown elapsed). */
export async function canResendVerification(userId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("email_verifications")
    .select("created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const row = data as { created_at: string } | null;
  if (!row) return true;
  return Date.now() - new Date(row.created_at).getTime() > RESEND_COOLDOWN_MS;
}

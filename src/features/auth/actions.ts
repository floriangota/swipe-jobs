"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/guards";
import { getSiteUrl } from "@/lib/env";
import { getUserLocale } from "@/i18n/locale";
import { checkRateLimit } from "./rate-limit";
import {
  loginSchema,
  requestResetSchema,
  resendVerificationSchema,
  signupSchema,
  updatePasswordSchema,
} from "./schemas";
import { sendVerificationEmail } from "./service/email.service";
import { canResendVerification, createVerificationToken } from "./service/verification.service";

// Returned to the client via useActionState. Codes are looked up in the Auth
// i18n namespace so no server text is shown to users directly.
export type ActionState = { error?: string; success?: string } | undefined;

/**
 * FormData → plain object, dropping React's Server-Action internals (`$ACTION_*`,
 * `$ACTION_REF_*`, `$ACTION_KEY`). Those are injected into a `<form action>` payload
 * and would otherwise trip our strict (reject-unknown-fields) Zod schemas. Genuine
 * unknown *user* fields are still rejected by `strictObject`.
 */
function formObject(formData: FormData): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("$ACTION")) obj[key] = value;
  }
  return obj;
}

/** Best-effort client IP for rate limiting (Vercel/proxies set x-forwarded-for). */
async function clientIp(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() || "unknown";
  return h.get("x-real-ip")?.trim() || "unknown";
}

async function issueVerification(userId: string, email: string, locale: "sq" | "en") {
  const token = await createVerificationToken(userId);
  const verifyUrl = `${getSiteUrl()}/auth/verify?token=${encodeURIComponent(token)}`;
  await sendVerificationEmail(email, locale, verifyUrl);
}

export async function signup(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = signupSchema.safeParse(formObject(formData));
  if (!parsed.success) return { error: "invalid_input" };
  const { email, password, role, cityId, locale } = parsed.data;

  // Tight, keyed by BOTH account and IP (docs/security.md 'tight/IP') so signups
  // can't be farmed from one host by varying the email.
  const ip = await clientIp();
  if (!(await checkRateLimit(`signup:${email}`)).ok || !(await checkRateLimit(`signup:${ip}`)).ok) {
    return { error: "rate_limited" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    // Read by the handle_new_user() trigger; role is re-clamped in SQL too.
    options: { data: { role, city_id: cityId ?? "", locale } },
  });
  if (error) return { error: "signup_failed" };

  // Soft gate: Confirm-email is OFF, so the user is signed in immediately. We send
  // our own verification email; failure is non-fatal (they can resend).
  if (data.user?.id) {
    try {
      await issueVerification(data.user.id, email, locale);
    } catch {
      // swallow — surfaced via the /verify-email resend flow
    }
  }

  revalidatePath("/", "layout");
  // Straight into profile onboarding (the soft-gate verification nudge shows in
  // the header meanwhile). Onboarding is the guided first step.
  redirect("/onboarding");
}

export async function login(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse(formObject(formData));
  if (!parsed.success) return { error: "invalid_input" };
  const { email, password } = parsed.data;

  const ip = await clientIp();
  if (!(await checkRateLimit(`login:${email}`)).ok || !(await checkRateLimit(`login:${ip}`)).ok) {
    return { error: "rate_limited" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "invalid_credentials" }; // generic — no enumeration

  // Suspended/deleted accounts may authenticate but must not proceed.
  const user = await getCurrentUser();
  if (user && user.status !== "active") {
    await supabase.auth.signOut();
    return { error: "account_inactive" };
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function logout(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

export async function requestPasswordReset(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = requestResetSchema.safeParse(formObject(formData));
  if (!parsed.success) return { error: "invalid_input" };
  const { email } = parsed.data;

  // Return the SAME generic success even when throttled — never reveal outcome.
  const ip = await clientIp();
  if (!(await checkRateLimit(`reset:${email}`)).ok || !(await checkRateLimit(`reset:${ip}`)).ok) {
    return { success: "reset_sent" };
  }

  const supabase = await createClient();
  try {
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${getSiteUrl()}/auth/confirm?next=/update-password`,
    });
  } catch {
    // Never reveal whether the email exists.
  }

  // ALWAYS the same generic response (no enumeration).
  return { success: "reset_sent" };
}

export async function updatePassword(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = updatePasswordSchema.safeParse(formObject(formData));
  if (!parsed.success) return { error: "invalid_input" };

  // Explicit authz (don't rely solely on supabase-js rejecting an anonymous call).
  // The recovery-link exchange (/auth/confirm) establishes this session first.
  const user = await getCurrentUser();
  if (!user) return { error: "not_authenticated" };
  if (user.status !== "active") return { error: "account_inactive" };
  if (!(await checkRateLimit(`update-password:${user.id}`)).ok) return { error: "rate_limited" };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: "update_failed" };

  revalidatePath("/", "layout");
  redirect("/?password=updated");
}

export async function resendVerification(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  // Validate the (hidden) email field for shape, but authorize off the session.
  const parsed = resendVerificationSchema.safeParse(formObject(formData));
  if (!parsed.success) return { error: "invalid_input" };

  const user = await getCurrentUser();
  if (!user) return { error: "not_authenticated" };
  if (user.emailVerified) return { success: "already_verified" };
  if (!(await canResendVerification(user.id))) return { error: "cooldown" };

  try {
    await issueVerification(user.id, user.email, await getUserLocale());
  } catch {
    return { error: "send_failed" };
  }
  return { success: "resend_sent" };
}

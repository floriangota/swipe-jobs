import "server-only";
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";
import { getServerEnv } from "@/lib/env.server";
import { getSiteUrl } from "@/lib/env";
import {
  renderNewMatchEmail,
  renderNewMessageEmail,
  type EmailLocale,
} from "../emails/notification-emails";

// Recipient locale is not persisted per-user yet, so async (cron) emails default to
// the app default locale. Ferizaj is Albanian-first; a per-user `users.locale` is an
// M9 i18n-pass item. (The synchronous verification email still honors the cookie.)
const DEFAULT_LOCALE: EmailLocale = "sq";

const MATCH_BATCH = 100;
const MESSAGE_BATCH = 500;
const OFFLINE_MINUTES = 5; // don't email a message the recipient may still be reading

export interface DispatchSummary {
  matchEmailsSent: number;
  messageEmailsSent: number;
  skippedRead: number;
  failures: number;
}

interface NotifRow {
  id: string;
  user_id: string;
  payload: Record<string, unknown>;
  created_at: string;
  user: { email: string } | { email: string }[] | null;
}

function recipientEmail(row: NotifRow): string | null {
  const u = Array.isArray(row.user) ? row.user[0] : row.user;
  return u?.email ?? null;
}

/**
 * Dispatch pending notification emails. Called by the Vercel Cron route. Uses the
 * service-role client (no user session; reads across users + writes emailed_at).
 * Idempotent: emailed_at gates re-sends, so overlapping cron runs won't double-send.
 */
export async function dispatchPendingEmails(): Promise<DispatchSummary> {
  const supabase = createAdminClient();
  const { RESEND_API_KEY, RESEND_FROM_EMAIL } = getServerEnv();
  const resend = new Resend(RESEND_API_KEY);
  const site = getSiteUrl();
  const summary: DispatchSummary = {
    matchEmailsSent: 0,
    messageEmailsSent: 0,
    skippedRead: 0,
    failures: 0,
  };

  // ---- new_match: email immediately (one per party notification) ----
  const { data: matchRows } = await supabase
    .from("notifications")
    .select("id, user_id, payload, created_at, user:users(email)")
    .eq("type", "new_match")
    .is("emailed_at", null)
    .order("created_at", { ascending: true })
    .limit(MATCH_BATCH);

  for (const row of (matchRows ?? []) as NotifRow[]) {
    const to = recipientEmail(row);
    const matchId = String(row.payload.match_id ?? "");
    if (!to || !matchId) {
      await markEmailed(supabase, [row.id]); // unroutable — don't retry forever
      continue;
    }
    const email = renderNewMatchEmail(DEFAULT_LOCALE, {
      counterpartName: String(row.payload.counterpart_name ?? "SwipeJobs"),
      listingTitle: String(row.payload.listing_title ?? ""),
      url: `${site}/matches/${matchId}`,
    });
    const ok = await send(resend, RESEND_FROM_EMAIL, to, email);
    if (ok) {
      summary.matchEmailsSent += 1;
      await markEmailed(supabase, [row.id]);
    } else {
      summary.failures += 1; // leave emailed_at null → retried next run
    }
  }

  // ---- new_message: collapse per (recipient, match); skip if already read in-app ----
  const cutoff = new Date(Date.now() - OFFLINE_MINUTES * 60_000).toISOString();
  const { data: msgRows } = await supabase
    .from("notifications")
    .select("id, user_id, payload, created_at, user:users(email)")
    .eq("type", "new_message")
    .is("emailed_at", null)
    .is("read_at", null)
    .lt("created_at", cutoff)
    .order("created_at", { ascending: true })
    .limit(MESSAGE_BATCH);

  const candidates = (msgRows ?? []) as NotifRow[];

  // A message the recipient already opened (messages.read_at set) needs no email.
  const messageIds = candidates
    .map((r) => String(r.payload.message_id ?? ""))
    .filter(Boolean);
  const readMessageIds = new Set<string>();
  if (messageIds.length > 0) {
    const { data: msgs } = await supabase
      .from("messages")
      .select("id, read_at")
      .in("id", messageIds);
    for (const m of (msgs ?? []) as { id: string; read_at: string | null }[]) {
      if (m.read_at != null) readMessageIds.add(m.id);
    }
  }

  // Group the still-unread ones by (recipient, match).
  const groups = new Map<string, NotifRow[]>();
  const alreadyRead: string[] = [];
  for (const row of candidates) {
    const messageId = String(row.payload.message_id ?? "");
    if (messageId && readMessageIds.has(messageId)) {
      alreadyRead.push(row.id);
      continue;
    }
    const key = `${row.user_id}::${String(row.payload.match_id ?? "")}`;
    const list = groups.get(key) ?? [];
    list.push(row);
    groups.set(key, list);
  }
  if (alreadyRead.length > 0) {
    summary.skippedRead += alreadyRead.length;
    await markEmailed(supabase, alreadyRead); // seen in-app → no email, don't retry
  }

  for (const rows of groups.values()) {
    const latest = rows[rows.length - 1]!;
    const to = recipientEmail(latest);
    const matchId = String(latest.payload.match_id ?? "");
    if (!to || !matchId) {
      await markEmailed(supabase, rows.map((r) => r.id));
      continue;
    }
    const email = renderNewMessageEmail(DEFAULT_LOCALE, {
      senderName: String(latest.payload.sender_name ?? "SwipeJobs"),
      preview: String(latest.payload.preview ?? ""),
      count: rows.length,
      url: `${site}/matches/${matchId}`,
    });
    const ok = await send(resend, RESEND_FROM_EMAIL, to, email);
    if (ok) {
      summary.messageEmailsSent += 1;
      await markEmailed(supabase, rows.map((r) => r.id));
    } else {
      summary.failures += 1;
    }
  }

  return summary;
}

async function send(
  resend: Resend,
  from: string,
  to: string,
  email: { subject: string; html: string },
): Promise<boolean> {
  try {
    const { error } = await resend.emails.send({ from, to, subject: email.subject, html: email.html });
    return !error;
  } catch {
    return false;
  }
}

async function markEmailed(
  supabase: ReturnType<typeof createAdminClient>,
  ids: string[],
): Promise<void> {
  if (ids.length === 0) return;
  await supabase.from("notifications").update({ emailed_at: new Date().toISOString() }).in("id", ids);
}

import "server-only";
import { createClient } from "@/lib/supabase/server";
import { sanitizeMessageBody } from "@/features/chat/sanitize";
import type { ReportInput } from "../schemas";

export type SubmitReportResult =
  | { status: "ok"; reportId: string }
  | { status: "invalid_target" };

/**
 * File a report AS the current user. Inserted under RLS ("user files own report"),
 * so reporter_user_id is pinned to the caller. FK constraints reject a target that
 * doesn't exist; the CHECK constraint (and Zod) guarantee exactly one target. Free
 * text is sanitized on write (docs/security.md).
 */
export async function submitReport(
  userId: string,
  input: ReportInput,
): Promise<SubmitReportResult> {
  const supabase = await createClient();
  const details = input.details ? sanitizeMessageBody(input.details) : null;

  const { data, error } = await supabase
    .from("reports")
    .insert({
      reporter_user_id: userId,
      reported_user_id: input.reported_user_id ?? null,
      reported_listing_id: input.reported_listing_id ?? null,
      reported_message_id: input.reported_message_id ?? null,
      reason: input.reason,
      details: details && details.length > 0 ? details : null,
    })
    .select("id")
    .single();

  if (error) {
    // 23503 = FK violation (target doesn't exist), 23514 = CHECK (no target).
    if (error.code === "23503" || error.code === "23514") return { status: "invalid_target" };
    throw new Error(error.message);
  }
  return { status: "ok", reportId: (data as { id: string }).id };
}

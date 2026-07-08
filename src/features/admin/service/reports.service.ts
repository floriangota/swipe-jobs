import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { ReportReason, ReportStatus, ReportView } from "../types";

interface ReportRow {
  id: string;
  reason: ReportReason;
  details: string | null;
  status: ReportStatus;
  reported_user_id: string | null;
  reported_listing_id: string | null;
  reported_message_id: string | null;
  created_at: string;
  reporter: { email: string } | { email: string }[] | null;
}

/** The report queue (open + reviewing by default). Admin RLS SELECT policy grants it. */
export async function listReports(status: "open" | "all" = "open"): Promise<ReportView[]> {
  const supabase = await createClient();
  let query = supabase
    .from("reports")
    .select(
      "id, reason, details, status, reported_user_id, reported_listing_id, reported_message_id, created_at, reporter:reporter_user_id(email)",
    )
    .order("created_at", { ascending: false })
    .limit(100);
  if (status === "open") query = query.in("status", ["open", "reviewing"]);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return ((data ?? []) as ReportRow[]).map((r) => {
    const reporter = Array.isArray(r.reporter) ? r.reporter[0] : r.reporter;
    return {
      id: r.id,
      reason: r.reason,
      details: r.details,
      status: r.status,
      reporterEmail: reporter?.email ?? "—",
      reportedUserId: r.reported_user_id,
      reportedListingId: r.reported_listing_id,
      reportedMessageId: r.reported_message_id,
      createdAt: r.created_at,
    };
  });
}

export type ResolveReportResult =
  | { status: "ok" }
  | { status: "not_found" }
  | { status: "invalid" }
  | { status: "forbidden" };

/** Resolve a report (dismiss | suspend_user | remove_listing) via the
 *  admin_resolve_report SECURITY DEFINER function (re-checks admin + audit-logs). */
export async function resolveReport(
  reportId: string,
  action: "dismiss" | "suspend_user" | "remove_listing",
  note?: string,
): Promise<ResolveReportResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_resolve_report", {
    p_report_id: reportId,
    p_action: action,
    p_note: note ?? null,
  });
  if (error) throw new Error(error.message);
  const row = (Array.isArray(data) ? data[0] : data) as
    | { ok: boolean; not_found: boolean; invalid: boolean }
    | undefined;
  if (!row) return { status: "forbidden" };
  if (row.not_found) return { status: "not_found" };
  if (row.invalid) return { status: "invalid" };
  if (!row.ok) return { status: "forbidden" };
  return { status: "ok" };
}

import type { Metadata } from "next";
import { listAuditLogs } from "@/features/admin/service/audit.service";
import { AuditTable } from "@/features/admin/components/audit-table";
import { ErrorState } from "@/components/ui/states";

export const metadata: Metadata = { title: "Audit log · Admin · SwipeJobs" };

export default async function AdminAuditPage() {
  let page: Awaited<ReturnType<typeof listAuditLogs>>;
  try {
    page = await listAuditLogs();
  } catch {
    return <ErrorState title="Couldn't load the audit log" description="Please try again." />;
  }
  return <AuditTable initial={page.entries} initialCursor={page.nextCursor} />;
}

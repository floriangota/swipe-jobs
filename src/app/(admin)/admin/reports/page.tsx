import type { Metadata } from "next";
import { listReports } from "@/features/admin/service/reports.service";
import { ReportQueue } from "@/features/admin/components/report-queue";
import { ErrorState } from "@/components/ui/states";

export const metadata: Metadata = { title: "Reports · Admin · SwipeJobs" };

export default async function AdminReportsPage() {
  let reports: Awaited<ReturnType<typeof listReports>>;
  try {
    reports = await listReports("open");
  } catch {
    return <ErrorState title="Couldn't load reports" description="Please try again." />;
  }
  return <ReportQueue initial={reports} />;
}

import type { Metadata } from "next";
import { getMetrics } from "@/features/admin/service/metrics.service";
import { MetricTiles } from "@/features/admin/components/metric-tiles";
import { ErrorState } from "@/components/ui/states";

export const metadata: Metadata = { title: "Admin · SwipeJobs" };

export default async function AdminDashboardPage() {
  let metrics: Awaited<ReturnType<typeof getMetrics>>;
  try {
    metrics = await getMetrics();
  } catch {
    return <ErrorState title="Couldn't load metrics" description="Please try again." />;
  }
  return <MetricTiles metrics={metrics} />;
}

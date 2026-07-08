import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import type { AdminMetrics } from "../types";

function Tile({
  label,
  value,
  sub,
  href,
  accent,
}: {
  label: string;
  value: number;
  sub?: string;
  href?: string;
  accent?: boolean;
}) {
  const body = (
    <div
      className={cn(
        "rounded-xl border p-4 transition-colors",
        accent && value > 0
          ? "border-primary/40 bg-primary/5"
          : "border-border bg-card",
        href && "hover:bg-secondary/50",
      )}
    >
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
  return href ? (
    <Link href={href} className="rounded-xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
      {body}
    </Link>
  ) : (
    body
  );
}

/** Marketplace-health tiles for the admin dashboard. */
export function MetricTiles({ metrics }: { metrics: AdminMetrics }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <Tile label="Pending photos" value={metrics.queues.pendingPhotos} href="/admin/photos" accent sub="Awaiting review" />
      <Tile label="Open reports" value={metrics.queues.openReports} href="/admin/reports" accent sub="Needs action" />
      <Tile label="Hires" value={metrics.matches.hired} sub="North-star metric" />
      <Tile label="Users" value={metrics.users.total} href="/admin/users" sub={`${metrics.users.workers} workers · ${metrics.users.employers} employers`} />
      <Tile label="Suspended" value={metrics.users.suspended} sub="users" />
      <Tile label="Active listings" value={metrics.listings.active} sub={`${metrics.listings.paused} paused · ${metrics.listings.closed} closed`} />
      <Tile label="Matches" value={metrics.matches.total} sub="total" />
      <Tile label="Admins" value={metrics.users.admins} sub="staff accounts" />
    </div>
  );
}

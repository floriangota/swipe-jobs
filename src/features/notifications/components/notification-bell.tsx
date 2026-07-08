import Link from "next/link";
import { cn } from "@/lib/utils/cn";

/** Header bell + unread badge (server-rendered — updates on navigation). */
export function NotificationBell({ count, label }: { count: number; label: string }) {
  const display = count > 99 ? "99+" : String(count);
  return (
    <Link
      href="/notifications"
      aria-label={count > 0 ? `${label} (${count})` : label}
      className="relative flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-5" aria-hidden>
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      </svg>
      {count > 0 && (
        <span
          className={cn(
            "absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground tabular-nums",
          )}
        >
          {display}
        </span>
      )}
    </Link>
  );
}

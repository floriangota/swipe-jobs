import { cn } from "@/lib/utils/cn";

/** The SwipeJobs mark: a rounded square with the brand gradient + a check. */
export function Logo({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      role="img"
      aria-label="SwipeJobs"
      className={cn("size-8", className)}
      {...props}
    >
      <defs>
        <linearGradient id="sj-logo" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="oklch(0.645 0.2 25)" />
          <stop offset="1" stopColor="oklch(0.72 0.16 55)" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill="url(#sj-logo)" />
      <path
        d="M9 16.5 14 21.5 23 11"
        stroke="white"
        strokeWidth="2.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2 font-semibold tracking-tight", className)}>
      <Logo className="size-7" />
      <span>
        Swipe<span className="text-primary">Jobs</span>
      </span>
    </span>
  );
}

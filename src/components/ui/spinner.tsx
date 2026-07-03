import { cn } from "@/lib/utils/cn";

/** Accessible loading spinner. Inherits color from `currentColor`. */
export function Spinner({
  className,
  label,
  ...props
}: React.ComponentProps<"svg"> & { label?: string }) {
  return (
    <svg
      role="status"
      aria-label={label ?? "Loading"}
      viewBox="0 0 24 24"
      fill="none"
      className={cn("size-4 animate-spin", className)}
      {...props}
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-20" />
      <path
        d="M22 12a10 10 0 0 0-10-10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

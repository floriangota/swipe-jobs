import { cn } from "@/lib/utils/cn";

/** Shimmering placeholder for loading states. */
export function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      aria-hidden
      className={cn("animate-shimmer rounded-md bg-muted", className)}
      {...props}
    />
  );
}

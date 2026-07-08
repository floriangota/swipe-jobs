import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils/cn";

export default function Loading() {
  return (
    <div className="flex h-[calc(100dvh-11.5rem)] min-h-[24rem] flex-col">
      <div className="flex items-center gap-3 border-b border-border pb-3">
        <Skeleton className="size-9 rounded-full" />
        <Skeleton className="size-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <div className="flex flex-1 flex-col justify-end gap-2 py-4">
        {[64, 40, 72, 48, 56].map((w, i) => (
          <Skeleton
            key={i}
            className={cn("h-9 rounded-2xl", i % 2 ? "self-end" : "self-start")}
            style={{ width: `${w}%` }}
          />
        ))}
      </div>
      <Skeleton className="h-11 rounded-2xl" />
    </div>
  );
}

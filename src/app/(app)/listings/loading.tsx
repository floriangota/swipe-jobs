import { SkeletonCard } from "@/components/ui/states";

export default function Loading() {
  return (
    <div className="space-y-3">
      <div className="mb-6 h-8 w-40 animate-shimmer rounded-md bg-muted" aria-hidden />
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
    </div>
  );
}

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import { toast } from "@/stores/toast-store";
import type { PendingPhotoView } from "../types";

export function PhotoQueue({ initial }: { initial: PendingPhotoView[] }) {
  const [items, setItems] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);

  async function review(id: string, decision: "approved" | "rejected") {
    setBusy(id);
    try {
      const res = await fetch(`/api/v1/admin/photos/${id}/review`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setItems((prev) => prev.filter((p) => p.id !== id));
      toast.success({ title: decision === "approved" ? "Photo approved" : "Photo rejected" });
    } catch {
      toast.error({ title: "Couldn't update the photo" });
    } finally {
      setBusy(null);
    }
  }

  if (items.length === 0) {
    return <EmptyState title="Queue clear" description="No photos awaiting review." />;
  }

  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {items.map((p) => (
        <li key={p.id} className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="aspect-[4/3] w-full bg-muted">
            {p.signedUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.signedUrl} alt={`${p.ownerName} upload`} className="size-full object-cover" />
            ) : (
              <div className="flex size-full items-center justify-center text-sm text-muted-foreground">
                Preview unavailable
              </div>
            )}
          </div>
          <div className="p-3">
            <p className="text-sm font-semibold">{p.ownerName}</p>
            <p className="truncate text-xs text-muted-foreground">
              {p.type === "worker_photo" ? "Worker photo" : "Employer logo"} · {p.ownerEmail}
            </p>
            <div className="mt-3 flex gap-2">
              <Button
                intent="primary"
                size="sm"
                className="flex-1"
                loading={busy === p.id}
                onClick={() => void review(p.id, "approved")}
              >
                Approve
              </Button>
              <Button
                intent="destructive"
                size="sm"
                className="flex-1"
                disabled={busy === p.id}
                onClick={() => void review(p.id, "rejected")}
              >
                Reject
              </Button>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

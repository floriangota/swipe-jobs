"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import { toast } from "@/stores/toast-store";
import { cn } from "@/lib/utils/cn";
import type { ReportView } from "../types";

const REASON_LABEL: Record<ReportView["reason"], string> = {
  inappropriate_photo: "Inappropriate photo",
  spam: "Spam",
  harassment: "Harassment",
  fake: "Fake",
  other: "Other",
};

type Action = "dismiss" | "suspend_user" | "remove_listing";

export function ReportQueue({ initial }: { initial: ReportView[] }) {
  const [items, setItems] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);

  async function resolve(r: ReportView, action: Action) {
    setBusy(r.id);
    try {
      const res = await fetch(`/api/v1/admin/reports/${r.id}/resolve`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.status === 422) {
        toast.error({ title: "That action doesn't apply to this report" });
        return;
      }
      if (!res.ok) throw new Error(String(res.status));
      setItems((prev) => prev.filter((x) => x.id !== r.id));
      toast.success({ title: "Report resolved" });
    } catch {
      toast.error({ title: "Couldn't resolve the report" });
    } finally {
      setBusy(null);
    }
  }

  if (items.length === 0) {
    return <EmptyState title="No open reports" description="Nothing needs review right now." />;
  }

  return (
    <ul className="space-y-3">
      {items.map((r) => {
        const target = r.reportedUserId
          ? { label: "user", id: r.reportedUserId, canSuspend: true, canRemove: false }
          : r.reportedListingId
            ? { label: "listing", id: r.reportedListingId, canSuspend: false, canRemove: true }
            : { label: "message", id: r.reportedMessageId ?? "", canSuspend: false, canRemove: false };
        return (
          <li key={r.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium">
                {REASON_LABEL[r.reason]}
              </span>
              <span className="text-xs text-muted-foreground">
                {new Date(r.createdAt).toLocaleString("en-GB")}
              </span>
            </div>
            <p className="mt-2 text-sm">
              Reported {target.label} <code className="rounded bg-muted px-1 text-xs">{target.id.slice(0, 8)}</code> by{" "}
              {r.reporterEmail}
            </p>
            {r.details && <p className="mt-1 text-sm text-muted-foreground">“{r.details}”</p>}
            <div className={cn("mt-3 flex flex-wrap gap-2")}>
              <Button intent="ghost" size="sm" disabled={busy === r.id} onClick={() => void resolve(r, "dismiss")}>
                Dismiss
              </Button>
              {target.canSuspend && (
                <Button intent="destructive" size="sm" loading={busy === r.id} onClick={() => void resolve(r, "suspend_user")}>
                  Suspend user
                </Button>
              )}
              {target.canRemove && (
                <Button intent="destructive" size="sm" loading={busy === r.id} onClick={() => void resolve(r, "remove_listing")}>
                  Remove listing
                </Button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

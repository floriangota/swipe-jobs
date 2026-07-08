"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import { toast } from "@/stores/toast-store";
import type { AuditLogView } from "../types";

export function AuditTable({
  initial,
  initialCursor,
}: {
  initial: AuditLogView[];
  initialCursor: string | null;
}) {
  const [items, setItems] = useState(initial);
  const [cursor, setCursor] = useState(initialCursor);
  const [loading, setLoading] = useState(false);

  async function loadMore() {
    if (!cursor || loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/admin/audit?cursor=${encodeURIComponent(cursor)}`);
      if (!res.ok) throw new Error(String(res.status));
      const json = (await res.json()) as { data?: AuditLogView[]; meta?: { next_cursor: string | null } };
      const known = new Set(items.map((x) => x.id));
      setItems([...items, ...(json.data ?? []).filter((x) => !known.has(x.id))]);
      setCursor(json.meta?.next_cursor ?? null);
    } catch {
      toast.error({ title: "Couldn't load more" });
    } finally {
      setLoading(false);
    }
  }

  if (items.length === 0) return <EmptyState title="No audit entries" description="Security events will appear here." />;

  return (
    <>
      <ul className="space-y-1.5">
        {items.map((e) => (
          <li key={e.id} className="rounded-lg border border-border bg-card px-3 py-2 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-xs font-medium">{e.action}</span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {new Date(e.createdAt).toLocaleString("en-GB")}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {e.targetType ? `${e.targetType} ${e.targetId?.slice(0, 8) ?? ""}` : "—"}
              {e.actorUserId ? ` · by ${e.actorUserId.slice(0, 8)}` : " · system"}
            </p>
          </li>
        ))}
      </ul>
      {cursor && (
        <div className="mt-4 flex justify-center">
          <Button intent="outline" size="sm" loading={loading} onClick={() => void loadMore()}>
            Load more
          </Button>
        </div>
      )}
    </>
  );
}

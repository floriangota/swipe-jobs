"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/ui/states";
import { toast } from "@/stores/toast-store";
import { cn } from "@/lib/utils/cn";
import type { AdminUserView } from "../types";

function StatusBadge({ status }: { status: AdminUserView["status"] }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-xs font-medium",
        status === "active"
          ? "bg-success/15 text-success"
          : status === "suspended"
            ? "bg-destructive/15 text-destructive"
            : "bg-muted text-muted-foreground",
      )}
    >
      {status}
    </span>
  );
}

export function UserTable({ initial, currentUserId }: { initial: AdminUserView[]; currentUserId: string }) {
  const [items, setItems] = useState(initial);
  const [target, setTarget] = useState<AdminUserView | null>(null);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  async function suspend() {
    if (!target || reason.trim().length === 0) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/v1/admin/users/${target.id}/suspend`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setItems((prev) => prev.map((u) => (u.id === target.id ? { ...u, status: "suspended" } : u)));
      toast.success({ title: "User suspended" });
      setTarget(null);
      setReason("");
    } catch {
      toast.error({ title: "Couldn't suspend the user" });
    } finally {
      setSaving(false);
    }
  }

  if (items.length === 0) return <EmptyState title="No users" description="Nothing to show." />;

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Email</th>
              <th className="px-3 py-2 font-medium">Role</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Verified</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {items.map((u) => (
              <tr key={u.id} className="border-t border-border">
                <td className="max-w-[220px] truncate px-3 py-2">{u.email}</td>
                <td className="px-3 py-2 text-muted-foreground">{u.role}</td>
                <td className="px-3 py-2"><StatusBadge status={u.status} /></td>
                <td className="px-3 py-2 text-muted-foreground">{u.emailVerified ? "yes" : "no"}</td>
                <td className="px-3 py-2 text-right">
                  {u.status === "active" && u.role !== "admin" && u.id !== currentUserId && (
                    <Button intent="outline" size="sm" onClick={() => setTarget(u)}>
                      Suspend
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <BottomSheet open={target !== null} onOpenChange={(o) => !o && setTarget(null)} title="Suspend user">
        <p className="text-sm text-muted-foreground">
          Suspend <strong>{target?.email}</strong>? They&apos;ll be blocked at next sign-in.
        </p>
        <label className="mt-3 block text-sm font-medium" htmlFor="suspend-reason">
          Reason
        </label>
        <Textarea
          id="suspend-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={500}
          placeholder="Why is this account being suspended?"
          className="mt-1"
        />
        <div className="mt-4 flex gap-2">
          <Button intent="destructive" className="flex-1" loading={saving} disabled={reason.trim().length === 0} onClick={() => void suspend()}>
            Suspend
          </Button>
          <Button intent="ghost" disabled={saving} onClick={() => setTarget(null)}>
            Cancel
          </Button>
        </div>
      </BottomSheet>
    </>
  );
}

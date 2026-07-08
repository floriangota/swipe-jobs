"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { toast } from "@/stores/toast-store";
import type { CallerSide, MatchStatus } from "../types";

type PendingAction = "hired" | "close" | null;

/**
 * Close / mark-as-hired actions (PATCH /matches/:id). Two-tap confirm inside the
 * sheet. Which actions show follows the transition rules: the worker may close for
 * themself; the employer may close or mark hired — the update_match_status DB
 * function is the enforcement, this is just the honest UI for it.
 */
export function MatchStatusActions({
  open,
  onOpenChange,
  matchId,
  callerSide,
  counterpartName,
  onChanged,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  matchId: string;
  callerSide: CallerSide;
  counterpartName: string;
  onChanged: (status: MatchStatus) => void;
}) {
  const t = useTranslations("Chat");
  const [confirming, setConfirming] = useState<PendingAction>(null);
  const [saving, setSaving] = useState(false);

  const closeStatus: MatchStatus =
    callerSide === "worker" ? "closed_by_worker" : "closed_by_employer";

  function reset(nextOpen: boolean) {
    if (!saving) {
      setConfirming(null);
      onOpenChange(nextOpen);
    }
  }

  async function apply(status: MatchStatus) {
    setSaving(true);
    try {
      const res = await fetch(`/api/v1/matches/${matchId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error(String(res.status));
      onChanged(status);
      setConfirming(null);
      onOpenChange(false);
    } catch {
      toast.error({ title: t("statusError") });
    } finally {
      setSaving(false);
    }
  }

  return (
    <BottomSheet open={open} onOpenChange={reset} title={t("actions")}>
      {confirming === null && (
        <div className="space-y-2">
          {callerSide === "employer" && (
            <Button className="w-full" intent="primary" onClick={() => setConfirming("hired")}>
              {t("markHired")}
            </Button>
          )}
          <Button className="w-full" intent="outline" onClick={() => setConfirming("close")}>
            {t("closeChat")}
          </Button>
        </div>
      )}

      {confirming === "hired" && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {t("markHiredBody", { name: counterpartName })}
          </p>
          <Button
            className="w-full"
            intent="primary"
            loading={saving}
            onClick={() => void apply("hired")}
          >
            {t("markHiredConfirm")}
          </Button>
          <Button className="w-full" intent="ghost" disabled={saving} onClick={() => setConfirming(null)}>
            {t("cancel")}
          </Button>
        </div>
      )}

      {confirming === "close" && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{t("closeChatBody")}</p>
          <Button
            className="w-full"
            intent="destructive"
            loading={saving}
            onClick={() => void apply(closeStatus)}
          >
            {t("closeChatConfirm")}
          </Button>
          <Button className="w-full" intent="ghost" disabled={saving} onClick={() => setConfirming(null)}>
            {t("cancel")}
          </Button>
        </div>
      )}
    </BottomSheet>
  );
}

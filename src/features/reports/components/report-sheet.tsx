"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/stores/toast-store";
import { cn } from "@/lib/utils/cn";
import type { ReportReason } from "../schemas";

export type ReportTarget =
  | { kind: "user"; id: string }
  | { kind: "listing"; id: string }
  | { kind: "message"; id: string };

const REASONS: ReportReason[] = ["harassment", "spam", "inappropriate_photo", "fake", "other"];

/** Reusable report sheet (bilingual — user-facing). Files a report against a message,
 *  listing, or user via POST /reports. */
export function ReportSheet({
  open,
  onOpenChange,
  target,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: ReportTarget | null;
}) {
  const t = useTranslations("Report");
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState("");
  const [saving, setSaving] = useState(false);

  function close(next: boolean) {
    if (saving) return;
    if (!next) {
      setReason(null);
      setDetails("");
    }
    onOpenChange(next);
  }

  async function submit() {
    if (!target || !reason) return;
    setSaving(true);
    try {
      const body: Record<string, string> = { reason };
      if (target.kind === "user") body.reported_user_id = target.id;
      if (target.kind === "listing") body.reported_listing_id = target.id;
      if (target.kind === "message") body.reported_message_id = target.id;
      if (details.trim()) body.details = details.trim();

      const res = await fetch("/api/v1/reports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(String(res.status));
      toast.success({ title: t("success") });
      setReason(null);
      setDetails("");
      onOpenChange(false);
    } catch {
      toast.error({ title: t("error") });
    } finally {
      setSaving(false);
    }
  }

  return (
    <BottomSheet open={open} onOpenChange={close} title={t("title")}>
      <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      <div className="mt-3 space-y-2">
        {REASONS.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setReason(r)}
            className={cn(
              "flex w-full items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              reason === r ? "border-primary bg-primary/5 font-medium" : "border-border hover:bg-secondary/50",
            )}
            aria-pressed={reason === r}
          >
            <span
              className={cn(
                "flex size-4 shrink-0 items-center justify-center rounded-full border",
                reason === r ? "border-primary" : "border-input",
              )}
            >
              {reason === r && <span className="size-2 rounded-full bg-primary" />}
            </span>
            {t(`reason.${r}`)}
          </button>
        ))}
      </div>
      <Textarea
        value={details}
        onChange={(e) => setDetails(e.target.value)}
        maxLength={1000}
        placeholder={t("detailsPlaceholder")}
        className="mt-3"
      />
      <div className="mt-4 flex gap-2">
        <Button intent="destructive" className="flex-1" loading={saving} disabled={!reason} onClick={() => void submit()}>
          {t("submit")}
        </Button>
        <Button intent="ghost" disabled={saving} onClick={() => close(false)}>
          {t("cancel")}
        </Button>
      </div>
    </BottomSheet>
  );
}

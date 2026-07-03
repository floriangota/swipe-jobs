"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toggleWorkerVisibility } from "../worker.actions";
import { cn } from "@/lib/utils/cn";

export function VisibilityToggle({ initial }: { initial: boolean }) {
  const t = useTranslations("Profile");
  const [on, setOn] = useState(initial);
  const [pending, start] = useTransition();

  function toggle() {
    const next = !on;
    setOn(next);
    start(async () => {
      const r = await toggleWorkerVisibility(next);
      if (!r.ok) setOn(!next); // revert on failure
    });
  }

  return (
    <div className="flex items-center justify-between rounded-lg border border-border p-3">
      <div>
        <p className="text-sm font-medium">{t("visibilityTitle")}</p>
        <p className="text-xs text-muted-foreground">{on ? t("visibleOn") : t("visibleOff")}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={t("visibilityTitle")}
        onClick={toggle}
        disabled={pending}
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full transition-colors duration-150 ease-standard disabled:opacity-60",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          on ? "bg-primary" : "bg-input",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform duration-150 ease-standard",
            on ? "translate-x-5" : "translate-x-0.5",
          )}
        />
      </button>
    </div>
  );
}

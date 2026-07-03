"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils/cn";
import type { ActionState } from "../actions";

/** Renders an action's error/success code as a localized inline message. */
export function FormStatus({ state }: { state: ActionState }) {
  const tErr = useTranslations("Auth.errors");
  const tOk = useTranslations("Auth.success");
  if (!state) return null;

  if (state.error) {
    return <Message tone="error">{tErr(state.error as Parameters<typeof tErr>[0])}</Message>;
  }
  if (state.success) {
    return <Message tone="success">{tOk(state.success as Parameters<typeof tOk>[0])}</Message>;
  }
  return null;
}

function Message({ tone, children }: { tone: "error" | "success"; children: React.ReactNode }) {
  return (
    <p
      role="status"
      className={cn(
        "rounded-md px-3 py-2 text-sm",
        tone === "error" ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success",
      )}
    >
      {children}
    </p>
  );
}

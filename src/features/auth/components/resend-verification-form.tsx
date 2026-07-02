"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { resendVerification, type ActionState } from "../actions";
import { Button } from "@/components/ui/button";
import { FormStatus } from "./form-status";

export function ResendVerificationForm({
  email,
  label,
  intent = "outline",
}: {
  email: string;
  label?: string;
  intent?: "outline" | "primary" | "ghost";
}) {
  const t = useTranslations("Auth.verify");
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    resendVerification,
    undefined,
  );

  return (
    <form action={formAction} className="space-y-3">
      <FormStatus state={state} />
      <input type="hidden" name="email" value={email} />
      <Button type="submit" intent={intent} loading={isPending}>
        {label ?? t("resend")}
      </Button>
    </form>
  );
}

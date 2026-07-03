"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { requestPasswordReset, type ActionState } from "../actions";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/input";
import { FormStatus } from "./form-status";

export function ForgotPasswordForm() {
  const t = useTranslations("Auth.forgot");
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    requestPasswordReset,
    undefined,
  );

  return (
    <form action={formAction} className="space-y-4">
      <FormStatus state={state} />
      <Field
        label={t("email")}
        name="email"
        type="email"
        autoComplete="email"
        required
        placeholder="you@example.com"
      />
      <Button type="submit" loading={isPending} className="w-full">
        {t("submit")}
      </Button>
    </form>
  );
}

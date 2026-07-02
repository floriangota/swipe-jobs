"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { updatePassword, type ActionState } from "../actions";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/input";
import { FormStatus } from "./form-status";

export function UpdatePasswordForm() {
  const t = useTranslations("Auth.update");
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    updatePassword,
    undefined,
  );

  return (
    <form action={formAction} className="space-y-4">
      <FormStatus state={state} />
      <Field
        label={t("password")}
        name="password"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
      />
      <Button type="submit" loading={isPending} className="w-full">
        {t("submit")}
      </Button>
    </form>
  );
}

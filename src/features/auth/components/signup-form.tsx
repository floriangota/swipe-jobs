"use client";

import { useActionState, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { signup, type ActionState } from "../actions";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";
import { FormStatus } from "./form-status";

const roles = ["worker", "employer"] as const;

export function SignupForm() {
  const t = useTranslations("Auth.signup");
  const locale = useLocale();
  const [role, setRole] = useState<(typeof roles)[number]>("worker");
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(signup, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <FormStatus state={state} />

      {/* Role selection (city defaults to Ferizaj server-side). */}
      <input type="hidden" name="role" value={role} />
      <input type="hidden" name="locale" value={locale} />
      <fieldset>
        <legend className="mb-1.5 text-sm font-medium">{t("role")}</legend>
        <div className="grid grid-cols-2 gap-2">
          {roles.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              aria-pressed={role === r}
              className={cn(
                "rounded-md border px-3 py-2.5 text-sm font-medium transition-colors duration-150 ease-standard",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                role === r
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-input text-muted-foreground hover:bg-secondary",
              )}
            >
              {r === "worker" ? t("roleWorker") : t("roleEmployer")}
            </button>
          ))}
        </div>
      </fieldset>

      <Field
        label={t("email")}
        name="email"
        type="email"
        autoComplete="email"
        required
        placeholder="you@example.com"
      />
      <Field
        label={t("password")}
        name="password"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        help={t("passwordHint")}
      />
      <Button type="submit" loading={isPending} className="w-full">
        {t("submit")}
      </Button>
    </form>
  );
}

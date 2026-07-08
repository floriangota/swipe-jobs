"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/input";
import { deleteAccount, type DeleteAccountState } from "../account.actions";

const CONFIRM_WORD = "DELETE"; // language-neutral confirmation token

export function DeleteAccountSection() {
  const t = useTranslations("Account");
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [state, action, pending] = useActionState<DeleteAccountState, FormData>(
    deleteAccount,
    undefined,
  );

  return (
    <section className="mt-10 rounded-xl border border-destructive/40 p-5">
      <h2 className="font-semibold text-destructive">{t("dangerTitle")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("dangerBody")}</p>
      <Button intent="destructive" className="mt-4" onClick={() => setOpen(true)}>
        {t("deleteCta")}
      </Button>

      <BottomSheet open={open} onOpenChange={(o) => !pending && setOpen(o)} title={t("confirmTitle")}>
        <p className="text-sm text-muted-foreground">{t("confirmBody")}</p>
        <form action={action} className="mt-4 space-y-3">
          <Field
            label={t("confirmLabel")}
            name="confirm"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="off"
            error={
              state?.error === "confirm_mismatch"
                ? t("errors.confirm_mismatch")
                : state?.error === "delete_failed"
                  ? t("errors.delete_failed")
                  : undefined
            }
          />
          <div className="flex gap-2">
            <Button
              type="submit"
              intent="destructive"
              className="flex-1"
              loading={pending}
              disabled={confirm.trim() !== CONFIRM_WORD}
            >
              {t("confirmButton")}
            </Button>
            <Button type="button" intent="ghost" disabled={pending} onClick={() => setOpen(false)}>
              {t("cancel")}
            </Button>
          </div>
        </form>
      </BottomSheet>
    </section>
  );
}

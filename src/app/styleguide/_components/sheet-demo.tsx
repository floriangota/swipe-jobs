"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { BottomSheet } from "@/components/ui/bottom-sheet";

export function SheetDemo() {
  const t = useTranslations("Styleguide");
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button intent="outline" onClick={() => setOpen(true)}>
        {t("openSheet")}
      </Button>
      <BottomSheet open={open} onOpenChange={setOpen} title={t("sheetTitle")}>
        <p className="text-sm text-muted-foreground">{t("sheetBody")}</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button intent="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={() => setOpen(false)}>OK</Button>
        </div>
      </BottomSheet>
    </>
  );
}

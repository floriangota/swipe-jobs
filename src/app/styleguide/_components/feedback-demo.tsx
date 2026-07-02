"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { toast } from "@/stores/toast-store";

export function FeedbackDemo() {
  const t = useTranslations("Styleguide");
  const tt = useTranslations("Toast");

  return (
    <div className="flex flex-wrap gap-3">
      <Button
        intent="secondary"
        onClick={() => toast.success({ title: tt("successTitle"), description: tt("successBody") })}
      >
        {t("showSuccess")}
      </Button>
      <Button
        intent="secondary"
        onClick={() => toast.error({ title: tt("errorTitle"), description: tt("errorBody") })}
      >
        {t("showError")}
      </Button>
      <Button
        intent="secondary"
        onClick={() => toast.show({ title: tt("infoTitle"), description: tt("infoBody") })}
      >
        {t("showInfo")}
      </Button>
    </div>
  );
}

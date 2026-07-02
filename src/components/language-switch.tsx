"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { setUserLocale } from "@/i18n/locale";
import { locales, localeLabels, type Locale } from "@/i18n/config";
import { cn } from "@/lib/utils/cn";

/** Segmented SQ / EN switch. Writes the locale cookie, then refreshes. */
export function LanguageSwitch({ className }: { className?: string }) {
  const t = useTranslations("Actions");
  const activeLocale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function change(next: Locale) {
    if (next === activeLocale || isPending) return;
    startTransition(async () => {
      await setUserLocale(next);
      router.refresh();
    });
  }

  return (
    <div
      role="group"
      aria-label={t("changeLanguage")}
      className={cn(
        "inline-flex items-center rounded-md border border-border bg-secondary/50 p-0.5 text-sm",
        isPending && "opacity-70",
        className,
      )}
    >
      {locales.map((loc) => {
        const active = loc === activeLocale;
        return (
          <button
            key={loc}
            type="button"
            onClick={() => change(loc)}
            aria-pressed={active}
            className={cn(
              "rounded-[5px] px-2.5 py-1 font-medium transition-colors duration-150 ease-standard",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {localeLabels[loc]}
          </button>
        );
      })}
    </div>
  );
}

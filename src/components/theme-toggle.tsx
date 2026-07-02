"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils/cn";

const THEME_COOKIE = /(?:^|;\s*)theme=/;

/**
 * Light/dark toggle. The initial theme is applied server-side from a cookie (in
 * the root layout) so there is no flash for returning users. On first visit with
 * no cookie, we fall back to the OS preference on mount.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const t = useTranslations("Actions");
  const [isDark, setIsDark] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    let dark = root.classList.contains("dark");

    if (!THEME_COOKIE.test(document.cookie)) {
      dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.classList.toggle("dark", dark);
    }

    setIsDark(dark);
    setReady(true);
  }, []);

  function toggle() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    document.cookie = `theme=${next ? "dark" : "light"}; path=/; max-age=31536000; samesite=lax`;
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={t("toggleTheme")}
      aria-pressed={isDark}
      className={cn(
        "inline-flex size-10 items-center justify-center rounded-md text-foreground",
        "transition-colors duration-150 ease-standard hover:bg-secondary",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className,
      )}
    >
      {/* Render nothing until mounted to avoid a mismatched icon flash. */}
      <span className={cn("transition-opacity", ready ? "opacity-100" : "opacity-0")}>
        {isDark ? <SunIcon /> : <MoonIcon />}
      </span>
    </button>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-5">
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-5">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

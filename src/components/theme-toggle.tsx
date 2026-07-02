"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils/cn";

/**
 * Light/dark toggle. The initial value comes from the server (read from the
 * `theme` cookie in the layout/header), so the icon matches SSR with no flash
 * and no setState-in-effect. Toggling writes the cookie + flips the `.dark`
 * class live.
 *
 * Note: first-time visitors (no cookie) default to light; OS-preference
 * auto-detection is a small M9 add (needs a nonce'd inline script for zero flash).
 */
export function ThemeToggle({
  initialDark,
  className,
}: {
  initialDark: boolean;
  className?: string;
}) {
  const t = useTranslations("Actions");
  const [isDark, setIsDark] = useState(initialDark);

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
      {isDark ? <SunIcon /> : <MoonIcon />}
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

// Single source of truth for supported locales. Reused by request config, the
// locale server actions, and the language switch component.

export const locales = ["sq", "en"] as const;

export type Locale = (typeof locales)[number];

// Albanian-first: we launch in Ferizaj, Kosovo.
export const defaultLocale: Locale = "sq";

// Next.js also natively honors this cookie name for locale.
export const localeCookieName = "NEXT_LOCALE";

export const localeLabels: Record<Locale, string> = {
  sq: "Shqip",
  en: "English",
};

export function isLocale(value: string | undefined | null): value is Locale {
  return value != null && (locales as readonly string[]).includes(value);
}

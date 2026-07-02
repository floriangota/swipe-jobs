// Value import is required so `typeof messages` works below (official next-intl
// pattern); it is elided at build time.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import messages from "../../messages/en.json";
import type { Locale } from "@/i18n/config";

// next-intl v4 type augmentation: gives us autocomplete + type-safety for
// translation keys and a strict Locale type. `en.json` is the canonical shape.
declare module "next-intl" {
  interface AppConfig {
    Locale: Locale;
    Messages: typeof messages;
  }
}

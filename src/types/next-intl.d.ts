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

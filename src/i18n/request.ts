import { getRequestConfig } from "next-intl/server";
import { getUserLocale } from "./locale";

// next-intl request config (v4). Must return `locale`. Messages are loaded from
// the JSON catalogs based on the cookie-resolved locale.
export default getRequestConfig(async () => {
  const locale = await getUserLocale();

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});

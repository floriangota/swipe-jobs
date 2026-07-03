import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { SiteHeader } from "@/components/site-header";
import { buttonVariants } from "@/components/ui/button";

export default async function NotFound() {
  const t = await getTranslations("NotFound");

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-5xl font-bold tracking-tight text-primary">404</p>
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">{t("title")}</h1>
          <p className="max-w-sm text-muted-foreground">{t("description")}</p>
        </div>
        <Link href="/" className={buttonVariants({ intent: "primary" })}>
          {t("home")}
        </Link>
      </main>
    </div>
  );
}

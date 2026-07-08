import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { SiteHeader } from "@/components/site-header";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";

export default async function HomePage() {
  const t = await getTranslations("Home");

  const steps = [
    { title: t("howStep1Title"), body: t("howStep1Body") },
    { title: t("howStep2Title"), body: t("howStep2Body") },
    { title: t("howStep3Title"), body: t("howStep3Body") },
  ];

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 -top-24 mx-auto h-64 max-w-3xl rounded-full bg-primary/20 blur-3xl"
          />
          <div className="mx-auto max-w-5xl px-4 pt-16 pb-12 text-center sm:px-6 sm:pt-24">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/60 px-3 py-1 text-xs font-medium text-muted-foreground">
              <span className="size-1.5 rounded-full bg-accent" />
              {t("badge")}
            </span>

            <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-bold tracking-tight text-balance sm:text-5xl">
              {t("title")}
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground text-pretty">
              {t("subtitle")}
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link href="/styleguide" className={cn(buttonVariants({ intent: "primary", size: "lg" }))}>
                {t("ctaDesignSystem")}
              </Link>
              <span className="inline-flex h-11 items-center rounded-lg border border-dashed border-border px-5 text-sm text-muted-foreground">
                {t("ctaComingSoon")}
              </span>
            </div>
          </div>
        </section>

        {/* Audience */}
        <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{t("audienceWorkersTitle")}</CardTitle>
                <CardDescription className="text-base">{t("audienceWorkersBody")}</CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>{t("audienceEmployersTitle")}</CardTitle>
                <CardDescription className="text-base">{t("audienceEmployersBody")}</CardDescription>
              </CardHeader>
            </Card>
          </div>
        </section>

        {/* How it works */}
        <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
          <h2 className="text-center text-2xl font-semibold tracking-tight">{t("howTitle")}</h2>
          <ol className="mt-8 grid gap-6 sm:grid-cols-3">
            {steps.map((step, i) => (
              <li key={step.title} className="flex flex-col items-center text-center">
                <span className="flex size-11 items-center justify-center rounded-full bg-primary text-lg font-semibold text-primary-foreground shadow-xs">
                  {i + 1}
                </span>
                <h3 className="mt-4 font-semibold">{step.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-2 px-4 py-8 text-center text-sm text-muted-foreground sm:px-6">
          <p>{t("footerMilestone")}</p>
          <nav className="flex gap-4 text-xs">
            <Link href="/privacy" className="hover:text-foreground hover:underline">
              {t("privacy")}
            </Link>
            <Link href="/terms" className="hover:text-foreground hover:underline">
              {t("terms")}
            </Link>
          </nav>
          <p className="text-xs">SwipeJobs · Ferizaj, Kosovo</p>
        </div>
      </footer>
    </div>
  );
}

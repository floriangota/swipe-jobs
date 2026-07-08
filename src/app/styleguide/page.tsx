import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { EmptyState, ErrorState, LoadingState, SkeletonCard } from "@/components/ui/states";
import { FeedbackDemo } from "./_components/feedback-demo";
import { SheetDemo } from "./_components/sheet-demo";
import { SwipeCardDemo } from "./_components/swipe-card-demo";
import { ListingCardDemo } from "./_components/listing-card-demo";
import { SwipeLiveDemo } from "./_components/swipe-live-demo";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Styleguide");
  return { title: `${t("title")} · SwipeJobs` };
}

const swatches = [
  { name: "primary", cls: "bg-primary text-primary-foreground" },
  { name: "secondary", cls: "bg-secondary text-secondary-foreground" },
  { name: "accent", cls: "bg-accent text-accent-foreground" },
  { name: "muted", cls: "bg-muted text-muted-foreground" },
  { name: "destructive", cls: "bg-destructive text-destructive-foreground" },
  { name: "success", cls: "bg-success text-success-foreground" },
  { name: "warning", cls: "bg-warning text-warning-foreground" },
  { name: "card", cls: "border border-border bg-card text-card-foreground" },
] as const;

const intents = ["primary", "secondary", "accent", "outline", "ghost", "destructive", "link"] as const;

const typeSpecimens = [
  { cls: "text-5xl font-bold tracking-tight", label: "Display · text-5xl" },
  { cls: "text-3xl font-semibold tracking-tight", label: "Heading · text-3xl" },
  { cls: "text-xl font-semibold", label: "Title · text-xl" },
  { cls: "text-base", label: "Body · text-base" },
  { cls: "text-sm text-muted-foreground", label: "Small · text-sm" },
  { cls: "text-xs font-medium uppercase tracking-wide text-muted-foreground", label: "Overline · text-xs" },
] as const;

export default async function StyleguidePage() {
  const t = await getTranslations("Styleguide");
  const tCommon = await getTranslations("Common");

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">
        <div className="mb-2">
          <Link href="/" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            ← {t("backHome")}
          </Link>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">{t("subtitle")}</p>

        <div className="mt-10 space-y-12">
          {/* Colors */}
          <Section title={t("colorsTitle")} description={t("colorsBody")}>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {swatches.map((s) => (
                <div
                  key={s.name}
                  className={`flex h-20 flex-col justify-end rounded-lg p-3 text-xs font-medium shadow-xs ${s.cls}`}
                >
                  {s.name}
                </div>
              ))}
            </div>
          </Section>

          {/* Typography */}
          <Section title={t("typographyTitle")} description={t("typographyBody")}>
            <div className="space-y-4">
              {typeSpecimens.map((spec) => (
                <div key={spec.label} className="flex flex-col gap-1 border-b border-border pb-4 last:border-0">
                  <span className="text-xs text-muted-foreground">{spec.label}</span>
                  <span className={spec.cls}>Aa Bb Cc — SwipeJobs</span>
                </div>
              ))}
            </div>
          </Section>

          {/* Buttons */}
          <Section title={t("buttonsTitle")} description={t("buttonsBody")}>
            <div className="space-y-6">
              <div className="flex flex-wrap gap-3">
                {intents.map((intent) => (
                  <Button key={intent} intent={intent}>
                    {intent}
                  </Button>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button size="sm">Small</Button>
                <Button size="md">Medium</Button>
                <Button size="lg">Large</Button>
                <Button loading>Loading</Button>
                <Button disabled>Disabled</Button>
                <Button intent="outline" size="icon" aria-label="Icon button">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-5">
                    <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                  </svg>
                </Button>
              </div>
            </div>
          </Section>

          {/* Inputs */}
          <Section title={t("inputsTitle")} description={t("inputsBody")}>
            <div className="grid max-w-md gap-5">
              <Field label={t("inputLabel")} type="email" placeholder={t("inputPlaceholder")} help={t("inputHelp")} />
              <Field label={t("inputErrorLabel")} type="password" defaultValue="123" error={t("inputErrorMsg")} />
              <Input placeholder={t("inputDisabled")} disabled />
            </div>
          </Section>

          {/* Cards */}
          <Section title={t("cardsTitle")} description={t("cardsBody")}>
            <Card className="max-w-md">
              <CardHeader>
                <CardTitle>{t("cardExampleTitle")}</CardTitle>
                <CardDescription>{t("cardExampleBody")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button size="sm">✓</Button>
                  <Button size="sm" intent="outline">
                    ✕
                  </Button>
                </div>
              </CardContent>
            </Card>
          </Section>

          {/* Swipe card (design showcase — physics is M5) */}
          <Section title={t("swipeTitle")} description={t("swipeBody")}>
            <div className="rounded-xl bg-secondary/40 py-10">
              <SwipeCardDemo />
            </div>
          </Section>

          {/* Listing card (the premium card workers swipe — built in M3) */}
          <Section title={t("listingCardTitle")} description={t("listingCardBody")}>
            <div className="rounded-xl bg-secondary/40 px-4 py-10">
              <ListingCardDemo />
            </div>
          </Section>

          {/* Live swipe — real drag physics + the match moment (M5) */}
          <Section title={t("liveSwipeTitle")} description={t("liveSwipeBody")}>
            <div className="rounded-xl bg-secondary/40 px-4 py-10">
              <SwipeLiveDemo />
            </div>
          </Section>

          {/* Feedback (client island) */}
          <Section title={t("feedbackTitle")} description={t("feedbackBody")}>
            <FeedbackDemo />
          </Section>

          {/* Bottom sheet (client island) */}
          <Section title={t("overlaysTitle")} description={t("overlaysBody")}>
            <SheetDemo />
          </Section>

          {/* Loading / empty / error states */}
          <Section title={t("skeletonsTitle")} description={t("skeletonsBody")}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-border p-2">
                <LoadingState label={t("stateLoading")} />
              </div>
              <SkeletonCard />
              <EmptyState title={t("stateEmpty")} description={tCommon("empty")} />
              <ErrorState title={t("stateError")} description={tCommon("error")} />
            </div>
          </Section>
        </div>
      </main>
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-4">
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  );
}

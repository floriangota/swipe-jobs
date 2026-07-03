import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/lib/auth/guards";
import { ResendVerificationForm } from "@/features/auth/components/resend-verification-form";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Auth.verify");
  return { title: `${t("title")} · SwipeJobs` };
}

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ verified?: string; sent?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const t = await getTranslations("Auth.verify");
  const tErr = await getTranslations("Auth.errors");
  const user = await getCurrentUser();

  const isVerified = sp.verified === "1" || Boolean(user?.emailVerified);

  if (isVerified) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{t("verifiedTitle")}</CardTitle>
          <CardDescription>{t("verifiedBody")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/" className={buttonVariants({ intent: "primary" })}>
            {t("goHome")}
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">{t("title")}</CardTitle>
        <CardDescription>{t("sent")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {sp.error && (
          <p role="status" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {tErr(sp.error as Parameters<typeof tErr>[0])}
          </p>
        )}
        {user ? (
          <>
            {/* Soft gate: signup already logged them in — let them proceed. */}
            <p className="text-sm text-muted-foreground">{t("softGate")}</p>
            <Link href="/" className={cn(buttonVariants({ intent: "primary" }), "w-full")}>
              {t("continue")}
            </Link>
            <p className="pt-2 text-sm text-muted-foreground">{t("checkInbox")}</p>
            <ResendVerificationForm email={user.email} />
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">{t("checkInbox")}</p>
            <Link href="/login" className={buttonVariants({ intent: "outline" })}>
              {t("goLogin")}
            </Link>
          </>
        )}
      </CardContent>
    </Card>
  );
}

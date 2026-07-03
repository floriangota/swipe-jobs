import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/lib/auth/guards";
import { SignupForm } from "@/features/auth/components/signup-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Auth.signup");
  return { title: `${t("title")} · SwipeJobs` };
}

export default async function SignupPage() {
  if (await getCurrentUser()) redirect("/");
  const t = await getTranslations("Auth.signup");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">{t("title")}</CardTitle>
        <CardDescription>{t("subtitle")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <SignupForm />
        <p className="text-sm text-muted-foreground">
          {t("haveAccount")}{" "}
          <Link href="/login" className="text-primary hover:underline">
            {t("loginLink")}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

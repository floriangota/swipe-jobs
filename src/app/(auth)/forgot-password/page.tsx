import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Auth.forgot");
  return { title: `${t("title")} · SwipeJobs` };
}

export default async function ForgotPasswordPage() {
  const t = await getTranslations("Auth.forgot");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">{t("title")}</CardTitle>
        <CardDescription>{t("subtitle")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <ForgotPasswordForm />
        <Link href="/login" className="text-sm text-primary hover:underline">
          {t("back")}
        </Link>
      </CardContent>
    </Card>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/lib/auth/guards";
import { LoginForm } from "@/features/auth/components/login-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Auth.login");
  return { title: `${t("title")} · SwipeJobs` };
}

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/");
  const t = await getTranslations("Auth.login");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">{t("title")}</CardTitle>
        <CardDescription>{t("subtitle")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <LoginForm />
        <div className="flex flex-col gap-2 text-sm">
          <Link href="/forgot-password" className="text-primary hover:underline">
            {t("forgot")}
          </Link>
          <span className="text-muted-foreground">
            {t("noAccount")}{" "}
            <Link href="/signup" className="text-primary hover:underline">
              {t("signupLink")}
            </Link>
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

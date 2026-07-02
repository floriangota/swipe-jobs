import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { UpdatePasswordForm } from "@/features/auth/components/update-password-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Auth.update");
  return { title: `${t("title")} · SwipeJobs` };
}

// Reached after the recovery link exchange (/auth/confirm establishes the session).
export default async function UpdatePasswordPage() {
  const t = await getTranslations("Auth.update");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">{t("title")}</CardTitle>
        <CardDescription>{t("subtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        <UpdatePasswordForm />
      </CardContent>
    </Card>
  );
}

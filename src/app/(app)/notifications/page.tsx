import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth/guards";
import { listNotifications } from "@/features/notifications/service/notification.service";
import { NotificationList } from "@/features/notifications/components/notification-list";
import { EmptyState, ErrorState } from "@/components/ui/states";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Notifications");
  return { title: `${t("metaTitle")} · SwipeJobs` };
}

// The notification center (all roles). Newest first; mark-read + load-more are client.
export default async function NotificationsPage() {
  await requireUser();
  const t = await getTranslations("Notifications");
  const tCommon = await getTranslations("Common");

  let page: Awaited<ReturnType<typeof listNotifications>>;
  try {
    page = await listNotifications();
  } catch {
    return <ErrorState title={t("loadError")} description={tCommon("error")} />;
  }

  if (page.notifications.length === 0) {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-bold tracking-tight">{t("title")}</h1>
        <EmptyState title={t("empty")} description={t("emptyBody")} />
      </div>
    );
  }

  return (
    <NotificationList
      initialItems={page.notifications}
      initialCursor={page.nextCursor}
      initialUnread={page.unreadCount}
    />
  );
}

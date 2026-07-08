import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { getMatchDetail } from "@/features/chat/service/match.service";
import { listMessages } from "@/features/chat/service/message.service";
import { ChatProvider } from "@/features/chat/store";
import { ChatThread } from "@/features/chat/components/chat-thread";
import { ErrorState } from "@/components/ui/states";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Chat");
  return { title: `${t("metaTitle")} · SwipeJobs` };
}

// The chat screen. getMatchDetail is the golden-rule reveal point: the DB yields the
// row (incl. contact) only to the two match parties — anyone else 404s right here.
export default async function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole("worker", "employer");
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const t = await getTranslations("Chat");
  const tCommon = await getTranslations("Common");

  let detail: Awaited<ReturnType<typeof getMatchDetail>>;
  let history: Awaited<ReturnType<typeof listMessages>>;
  try {
    detail = await getMatchDetail(id);
    history = await listMessages(id);
  } catch {
    return <ErrorState title={t("loadError")} description={tCommon("error")} />;
  }
  if (!detail || history.status === "not_found") notFound();

  // The service returns newest-first; the thread renders oldest → newest.
  const initialMessages = [...history.page.messages].reverse();

  return (
    <ChatProvider
      currentUserId={user.id}
      initialMessages={initialMessages}
      initialCursor={history.page.nextCursor}
      initialStatus={detail.status}
    >
      <ChatThread detail={detail} />
    </ChatProvider>
  );
}

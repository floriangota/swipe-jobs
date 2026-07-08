"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "@/stores/toast-store";
import { gradientFor } from "@/lib/gradients";
import { cn } from "@/lib/utils/cn";
import { useChat, type ChatMessage } from "../store";
import { useMatchChannel } from "../hooks/use-match-channel";
import { toMessageView, type MatchDetailView, type MatchStatus, type MessageView } from "../types";
import { ReportSheet, type ReportTarget } from "@/features/reports/components/report-sheet";
import { MessageBubble } from "./message-bubble";
import { ChatComposer } from "./chat-composer";
import { ContactReveal } from "./contact-reveal";
import { MatchStatusActions } from "./match-status-actions";

function DaySeparator({ date }: { date: Date }) {
  const t = useTranslations("Chat");
  const locale = useLocale();
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  let label: string;
  if (date.toDateString() === now.toDateString()) label = t("today");
  else if (date.toDateString() === yesterday.toDateString()) label = t("yesterday");
  else
    label = new Intl.DateTimeFormat(locale, {
      day: "numeric",
      month: "long",
      year: date.getFullYear() === now.getFullYear() ? undefined : "numeric",
    }).format(date);

  return (
    <div className="flex justify-center py-2">
      <span className="rounded-full bg-secondary px-3 py-1 text-xs text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

function StatusChip({ status }: { status: MatchStatus }) {
  const t = useTranslations("Matches");
  if (status === "active") return null;
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
        status === "hired" ? "bg-success/15 text-success" : "bg-muted text-muted-foreground",
      )}
    >
      {t(`status.${status}`)}
    </span>
  );
}

/**
 * The chat screen: header (counterpart + contact + actions), live message list,
 * composer. Realtime arrives over the private per-match channel; REST is the source
 * of truth (initial page from the server, resync on reconnect). Sends are optimistic
 * with a visible failed + retry state.
 */
export function ChatThread({ detail }: { detail: MatchDetailView }) {
  const t = useTranslations("Chat");
  const currentUserId = useChat((s) => s.currentUserId);
  const messages = useChat((s) => s.messages);
  const olderCursor = useChat((s) => s.olderCursor);
  const loadingOlder = useChat((s) => s.loadingOlder);
  const matchStatus = useChat((s) => s.matchStatus);
  const appendMessage = useChat((s) => s.appendMessage);
  const reconcileOutgoing = useChat((s) => s.reconcileOutgoing);
  const replaceMessage = useChat((s) => s.replaceMessage);
  const markMessageFailed = useChat((s) => s.markMessageFailed);
  const removeMessage = useChat((s) => s.removeMessage);
  const prependOlder = useChat((s) => s.prependOlder);
  const resetLatest = useChat((s) => s.resetLatest);
  const markMineRead = useChat((s) => s.markMineRead);
  const setMatchStatus = useChat((s) => s.setMatchStatus);
  const setLoadingOlder = useChat((s) => s.setLoadingOlder);

  const [contactOpen, setContactOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState<ReportTarget | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  const tempIdRef = useRef(0);

  const closed = matchStatus === "closed_by_worker" || matchStatus === "closed_by_employer";

  // Tell the server we've seen the counterpart's messages (read receipt). Cheap and
  // idempotent; only fires while the tab is actually visible.
  const markRead = useCallback(() => {
    if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
    void fetch(`/api/v1/matches/${detail.id}/read`, { method: "POST" }).catch(() => {
      // best-effort; unread state self-heals on the next visit
    });
  }, [detail.id]);

  useEffect(() => {
    markRead();
    const onVisible = () => markRead();
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [markRead]);

  useMatchChannel(detail.id, {
    onMessageInsert: (row) => {
      const view = toMessageView(row);
      if (row.sender_user_id === currentUserId) {
        reconcileOutgoing(view); // promote my pending temp; never a duplicate bubble
      } else {
        appendMessage(view);
        markRead();
      }
    },
    onRead: (readerUserId) => {
      if (readerUserId !== currentUserId) markMineRead(new Date().toISOString());
    },
    onStatus: (status) => setMatchStatus(status),
    onResync: () => {
      // A status change (hired/closed) can be exactly what was missed while the
      // channel was down, so refetch BOTH the newest messages and the match status.
      void (async () => {
        try {
          const [msgRes, matchRes] = await Promise.all([
            fetch(`/api/v1/matches/${detail.id}/messages`),
            fetch(`/api/v1/matches/${detail.id}`),
          ]);
          if (msgRes.ok) {
            const json = (await msgRes.json()) as {
              data?: MessageView[];
              meta?: { next_cursor: string | null };
            };
            resetLatest([...(json.data ?? [])].reverse(), json.meta?.next_cursor ?? null);
          }
          if (matchRes.ok) {
            const mj = (await matchRes.json()) as { data?: { status?: MatchStatus } };
            if (mj.data?.status) setMatchStatus(mj.data.status);
          }
        } catch {
          // keep what we have; REST retries on the next interaction
        }
      })();
    },
  });

  // Keep the view pinned to the newest message unless the user scrolled up.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el && stickToBottomRef.current) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  function onScroll() {
    const el = scrollRef.current;
    if (!el) return;
    stickToBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }

  async function loadOlder() {
    if (!olderCursor || loadingOlder) return;
    setLoadingOlder(true);
    const el = scrollRef.current;
    const prevHeight = el?.scrollHeight ?? 0;
    const prevTop = el?.scrollTop ?? 0;
    try {
      const res = await fetch(
        `/api/v1/matches/${detail.id}/messages?cursor=${encodeURIComponent(olderCursor)}`,
      );
      if (!res.ok) throw new Error(String(res.status));
      const json = (await res.json()) as {
        data?: MessageView[];
        meta?: { next_cursor: string | null };
      };
      prependOlder([...(json.data ?? [])].reverse(), json.meta?.next_cursor ?? null);
      requestAnimationFrame(() => {
        const node = scrollRef.current;
        if (node) node.scrollTop = prevTop + (node.scrollHeight - prevHeight);
      });
    } catch {
      setLoadingOlder(false);
      toast.error({ title: t("loadError") });
    }
  }

  async function send(body: string) {
    tempIdRef.current += 1;
    const tempId = `temp-${tempIdRef.current}`;
    stickToBottomRef.current = true;
    appendMessage({
      id: tempId,
      matchId: detail.id,
      senderUserId: currentUserId,
      body,
      readAt: null,
      createdAt: new Date().toISOString(),
      pending: true,
    });

    try {
      const res = await fetch(`/api/v1/matches/${detail.id}/messages`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body }),
      });
      if (res.ok) {
        const json = (await res.json()) as { data?: MessageView };
        if (json.data) replaceMessage(tempId, json.data);
        else removeMessage(tempId);
      } else {
        markMessageFailed(tempId);
        if (res.status === 422) toast.error({ title: t("closedBanner") });
      }
    } catch {
      markMessageFailed(tempId);
    }
  }

  function retry(message: ChatMessage) {
    removeMessage(message.id);
    void send(message.body);
  }

  // Bubbles with day separators; a small extra gap marks sender changes.
  const rows: React.ReactNode[] = [];
  let lastDay = "";
  let lastSender = "";
  for (const m of messages) {
    const day = new Date(m.createdAt).toDateString();
    if (day !== lastDay) {
      rows.push(<DaySeparator key={`day-${day}`} date={new Date(m.createdAt)} />);
      lastDay = day;
      lastSender = "";
    }
    rows.push(
      <div key={m.id} className={cn(lastSender && lastSender !== m.senderUserId && "mt-2")}>
        <MessageBubble
          message={m}
          mine={m.senderUserId === currentUserId}
          onRetry={m.failed ? () => retry(m) : undefined}
          onReport={
            m.senderUserId !== currentUserId
              ? () => setReportTarget({ kind: "message", id: m.id })
              : undefined
          }
        />
      </div>,
    );
    lastSender = m.senderUserId;
  }

  return (
    <div className="flex h-[calc(100dvh-11.5rem)] min-h-[24rem] flex-col">
      <header className="flex items-center gap-3 border-b border-border pb-3">
        <Link
          href="/matches"
          aria-label={t("back")}
          className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className="size-5" aria-hidden>
            <path d="m15 18-6-6 6-6" />
          </svg>
        </Link>
        <div
          aria-hidden
          className="flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
          style={{ background: gradientFor(detail.counterpartName) }}
        >
          {detail.counterpartName.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-semibold">{detail.counterpartName}</p>
            <StatusChip status={matchStatus} />
          </div>
          <p className="truncate text-xs text-muted-foreground">{detail.listingTitle}</p>
        </div>
        <button
          type="button"
          onClick={() => setContactOpen(true)}
          aria-label={t("contact")}
          className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-5" aria-hidden>
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" />
          </svg>
        </button>
        {matchStatus === "active" && (
          <button
            type="button"
            onClick={() => setActionsOpen(true)}
            aria-label={t("actions")}
            className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="size-5" aria-hidden>
              <circle cx="12" cy="5" r="1.8" />
              <circle cx="12" cy="12" r="1.8" />
              <circle cx="12" cy="19" r="1.8" />
            </svg>
          </button>
        )}
      </header>

      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="flex flex-1 flex-col gap-1.5 overflow-y-auto py-4"
      >
        {olderCursor && (
          <div className="flex justify-center pb-2">
            <button
              type="button"
              onClick={() => void loadOlder()}
              disabled={loadingOlder}
              className="rounded-full bg-secondary px-4 py-1.5 text-xs font-medium text-secondary-foreground transition-colors hover:bg-secondary/80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-50"
            >
              {loadingOlder ? t("loadingOlder") : t("loadOlder")}
            </button>
          </div>
        )}

        {messages.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-1 text-center">
            <p className="text-lg font-semibold">{t("emptyThread")}</p>
            <p className="max-w-xs text-sm text-muted-foreground">
              {t("emptyThreadBody", { name: detail.counterpartName })}
            </p>
          </div>
        ) : (
          rows
        )}
      </div>

      {matchStatus === "hired" && (
        <div className="mb-2 rounded-xl border border-success/30 bg-success/10 px-4 py-2.5 text-center text-sm font-medium text-success">
          {t("hiredBanner")}
        </div>
      )}
      {closed ? (
        <div className="rounded-xl border border-border bg-muted px-4 py-3 text-center text-sm text-muted-foreground">
          {t("closedBanner")}
        </div>
      ) : (
        <ChatComposer onSend={(body) => void send(body)} />
      )}

      <ContactReveal
        open={contactOpen}
        onOpenChange={setContactOpen}
        detail={detail}
        onReportListing={() => {
          setContactOpen(false);
          setReportTarget({ kind: "listing", id: detail.listingId });
        }}
      />
      <MatchStatusActions
        open={actionsOpen}
        onOpenChange={setActionsOpen}
        matchId={detail.id}
        callerSide={detail.callerSide}
        counterpartName={detail.counterpartName}
        onChanged={setMatchStatus}
      />
      <ReportSheet open={reportTarget !== null} onOpenChange={(o) => !o && setReportTarget(null)} target={reportTarget} />
    </div>
  );
}

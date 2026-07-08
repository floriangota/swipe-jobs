"use client";

import { useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { toast } from "@/stores/toast-store";
import { gradientFor } from "@/lib/gradients";
import { cn } from "@/lib/utils/cn";
import type { MatchListItemView, MatchStatus } from "../types";

function timeLabel(iso: string, locale: string): string {
  const date = new Date(iso);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(date);
  }
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: date.getFullYear() === now.getFullYear() ? undefined : "numeric",
  }).format(date);
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

function MatchRow({ item }: { item: MatchListItemView }) {
  const t = useTranslations("Matches");
  const locale = useLocale();
  const unread = item.unreadCount > 0;
  const snippet = item.lastMessageBody
    ? item.lastMessageIsMine
      ? `${t("you")} ${item.lastMessageBody}`
      : item.lastMessageBody
    : t("noMessages");

  return (
    <li>
      <Link
        href={`/matches/${item.id}`}
        className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-xs transition-colors hover:bg-secondary/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <div
          aria-hidden
          className="flex size-12 shrink-0 items-center justify-center rounded-full text-base font-semibold text-white"
          style={{ background: gradientFor(item.counterpartName) }}
        >
          {item.counterpartName.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className={cn("truncate", unread ? "font-bold" : "font-semibold")}>
              {item.counterpartName}
            </p>
            <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
              {timeLabel(item.activityAt, locale)}
            </span>
          </div>
          <p className="truncate text-xs text-muted-foreground">{item.listingTitle}</p>
          <div className="mt-0.5 flex items-center justify-between gap-2">
            <p
              className={cn(
                "min-w-0 truncate text-sm",
                unread ? "font-medium text-foreground" : "text-muted-foreground",
              )}
            >
              {snippet}
            </p>
            <span className="flex shrink-0 items-center gap-1.5">
              <StatusChip status={item.status} />
              {unread && (
                <span
                  aria-label={t("unreadLabel", { count: item.unreadCount })}
                  className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground tabular-nums"
                >
                  {item.unreadCount > 99 ? "99+" : item.unreadCount}
                </span>
              )}
            </span>
          </div>
        </div>
      </Link>
    </li>
  );
}

/** The matches inbox: server-seeded first page + cursor-paginated "load more". */
export function MatchList({
  initialItems,
  initialCursor,
}: {
  initialItems: MatchListItemView[];
  initialCursor: string | null;
}) {
  const t = useTranslations("Matches");
  const [items, setItems] = useState(initialItems);
  const [cursor, setCursor] = useState(initialCursor);
  const [loading, setLoading] = useState(false);

  async function loadMore() {
    if (!cursor || loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/matches?cursor=${encodeURIComponent(cursor)}`);
      if (!res.ok) throw new Error(String(res.status));
      const json = (await res.json()) as {
        data?: MatchListItemView[];
        meta?: { next_cursor: string | null };
      };
      const known = new Set(items.map((m) => m.id));
      setItems([...items, ...(json.data ?? []).filter((m) => !known.has(m.id))]);
      setCursor(json.meta?.next_cursor ?? null);
    } catch {
      toast.error({ title: t("loadError") });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <ul className="space-y-2">
        {items.map((item) => (
          <MatchRow key={item.id} item={item} />
        ))}
      </ul>
      {cursor && (
        <div className="mt-5 flex justify-center">
          <Button intent="outline" size="sm" loading={loading} onClick={() => void loadMore()}>
            {t("loadMore")}
          </Button>
        </div>
      )}
    </>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { toast } from "@/stores/toast-store";
import { cn } from "@/lib/utils/cn";
import type {
  NewCandidatePayload,
  NewMatchPayload,
  NewMessagePayload,
  NotificationView,
  SystemPayload,
} from "../types";

interface Localized {
  title: string;
  body?: string;
  href?: string;
}

function useLocalize() {
  const t = useTranslations("Notifications");
  return (n: NotificationView): Localized => {
    switch (n.type) {
      case "new_match": {
        const p = n.payload as NewMatchPayload;
        return {
          title: t("newMatch", { name: p.counterpart_name }),
          body: p.listing_title,
          href: `/matches/${p.match_id}`,
        };
      }
      case "new_message": {
        const p = n.payload as NewMessagePayload;
        return {
          title: t("newMessage", { name: p.sender_name }),
          body: p.preview,
          href: `/matches/${p.match_id}`,
        };
      }
      case "new_candidate": {
        const p = n.payload as NewCandidatePayload;
        return {
          title: t("newCandidate", { name: p.worker_name }),
          body: p.listing_title,
          href: `/listings/${p.listing_id}/candidates`,
        };
      }
      default: {
        const p = n.payload as SystemPayload;
        return { title: p.title ?? t("system"), body: p.body };
      }
    }
  };
}

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

const TYPE_ICON: Record<NotificationView["type"], React.ReactNode> = {
  new_match: (
    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
  ),
  new_message: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
  new_candidate: <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.87" />,
  system: <path d="M12 8v4m0 4h.01M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z" />,
};

function Row({ n, onOpen }: { n: NotificationView; onOpen: (id: string) => void }) {
  const localize = useLocalize();
  const locale = useLocale();
  const { title, body, href } = localize(n);
  const unread = n.readAt == null;
  const filled = n.type === "new_match";

  const inner = (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl border p-4 transition-colors",
        unread ? "border-border bg-card shadow-xs" : "border-border/60 bg-transparent",
        href && "hover:bg-secondary/60",
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full",
          unread ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground",
        )}
      >
        <svg viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke={filled ? "none" : "currentColor"} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-4" aria-hidden>
          {TYPE_ICON[n.type]}
        </svg>
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className={cn("truncate text-sm", unread ? "font-semibold" : "font-medium text-muted-foreground")}>
            {title}
          </p>
          <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
            {timeLabel(n.createdAt, locale)}
          </span>
        </div>
        {body && <p className="mt-0.5 truncate text-sm text-muted-foreground">{body}</p>}
      </div>
      {unread && <span aria-hidden className="mt-2 size-2 shrink-0 rounded-full bg-primary" />}
    </div>
  );

  if (!href) return <li>{inner}</li>;
  return (
    <li>
      <Link
        href={href}
        onClick={() => onOpen(n.id)}
        className="block rounded-xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        {inner}
      </Link>
    </li>
  );
}

/** The notification center list: mark-all-read, per-item read on open, load-more. */
export function NotificationList({
  initialItems,
  initialCursor,
  initialUnread,
}: {
  initialItems: NotificationView[];
  initialCursor: string | null;
  initialUnread: number;
}) {
  const t = useTranslations("Notifications");
  const [items, setItems] = useState(initialItems);
  const [cursor, setCursor] = useState(initialCursor);
  const [unread, setUnread] = useState(initialUnread);
  const [loading, setLoading] = useState(false);

  function markLocal(ids: string[] | null) {
    const now = new Date().toISOString();
    setItems((prev) =>
      prev.map((n) => (n.readAt == null && (ids == null || ids.includes(n.id)) ? { ...n, readAt: now } : n)),
    );
  }

  async function openOne(id: string) {
    const target = items.find((n) => n.id === id);
    if (!target || target.readAt != null) return;
    markLocal([id]);
    setUnread((u) => Math.max(0, u - 1));
    try {
      await fetch("/api/v1/notifications/read", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ids: [id] }),
      });
    } catch {
      // best-effort; the server badge reconciles on the next load
    }
  }

  async function markAll() {
    markLocal(null);
    setUnread(0);
    try {
      const res = await fetch("/api/v1/notifications/read", { method: "POST" });
      if (!res.ok) throw new Error(String(res.status));
    } catch {
      toast.error({ title: t("markAllError") });
    }
  }

  async function loadMore() {
    if (!cursor || loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/notifications?cursor=${encodeURIComponent(cursor)}`);
      if (!res.ok) throw new Error(String(res.status));
      const json = (await res.json()) as {
        data?: NotificationView[];
        meta?: { next_cursor: string | null };
      };
      const known = new Set(items.map((n) => n.id));
      setItems([...items, ...(json.data ?? []).filter((n) => !known.has(n.id))]);
      setCursor(json.meta?.next_cursor ?? null);
    } catch {
      toast.error({ title: t("loadError") });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        {unread > 0 && (
          <Button intent="ghost" size="sm" onClick={() => void markAll()}>
            {t("markAllRead")}
          </Button>
        )}
      </div>
      <ul className="space-y-2">
        {items.map((n) => (
          <Row key={n.id} n={n} onOpen={openOne} />
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

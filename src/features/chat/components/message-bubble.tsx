"use client";

import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils/cn";
import type { ChatMessage } from "../store";

/** Sending / sent / read indicator on my own bubbles (WhatsApp-familiar ticks). */
function Ticks({ message }: { message: ChatMessage }) {
  const t = useTranslations("Chat");

  if (message.pending) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        className="size-3 opacity-70"
        role="img"
        aria-label={t("sending")}
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
    );
  }

  const read = message.readAt != null;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("size-3.5", read ? "text-success-foreground" : "opacity-70")}
      role="img"
      aria-label={read ? t("read") : t("delivered")}
    >
      <path d="m2 13 4 4L14 9" />
      <path d="m10 16.5 1.5 1.5L20 9.5" />
    </svg>
  );
}

/**
 * One chat bubble. The body renders as a React TEXT NODE (whitespace preserved via
 * CSS) — escaped by React, never HTML (docs/security.md: no dangerouslySetInnerHTML).
 */
export function MessageBubble({
  message,
  mine,
  onRetry,
  onReport,
}: {
  message: ChatMessage;
  mine: boolean;
  onRetry?: () => void;
  onReport?: () => void;
}) {
  const t = useTranslations("Chat");
  const tReport = useTranslations("Report");
  const locale = useLocale();
  const time = new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(message.createdAt));

  return (
    <div className={cn("group flex w-full items-end gap-1", mine ? "justify-end" : "justify-start")}>
      {!mine && onReport && !message.pending && (
        <button
          type="button"
          onClick={onReport}
          aria-label={tReport("action")}
          className="order-2 mb-1 flex size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground opacity-0 transition-opacity hover:bg-secondary hover:text-foreground focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none group-hover:opacity-100"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-3.5" aria-hidden>
            <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
            <line x1="4" y1="22" x2="4" y2="15" />
          </svg>
        </button>
      )}
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-3.5 py-2 shadow-xs",
          mine
            ? "rounded-br-md bg-primary text-primary-foreground"
            : "rounded-bl-md border border-border bg-card text-card-foreground",
          message.failed && "opacity-80 ring-1 ring-destructive",
        )}
      >
        <p className="whitespace-pre-wrap text-sm leading-relaxed break-words">{message.body}</p>
        <span
          className={cn(
            "mt-0.5 flex items-center justify-end gap-1 text-[10px] tabular-nums",
            mine ? "text-primary-foreground/70" : "text-muted-foreground",
          )}
        >
          {time}
          {mine && !message.failed && <Ticks message={message} />}
        </span>
        {message.failed && onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className={cn(
              "mt-1 block w-full rounded-md px-2 py-1 text-left text-xs font-medium underline-offset-2",
              mine ? "text-primary-foreground hover:underline" : "text-destructive hover:underline",
            )}
          >
            {t("sendFailed")} {t("retry")}
          </button>
        )}
      </div>
    </div>
  );
}

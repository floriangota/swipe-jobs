"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils/cn";
import { MESSAGE_MAX_LENGTH } from "../schemas";

/**
 * The message composer: auto-growing textarea + send. Enter sends, Shift+Enter adds
 * a newline (the send button always works — mobile keyboards included). The parent
 * owns the actual send (optimistic append + POST).
 */
export function ChatComposer({
  disabled,
  onSend,
}: {
  disabled?: boolean;
  onSend: (body: string) => void;
}) {
  const t = useTranslations("Chat");
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const remaining = MESSAGE_MAX_LENGTH - value.length;
  const canSend = !disabled && value.trim().length > 0;

  function autoGrow() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 144)}px`;
  }

  function send() {
    const body = value.trim();
    if (!body || disabled) return;
    onSend(body);
    setValue("");
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.focus();
    }
  }

  return (
    <div className="border-t border-border bg-background pt-3">
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          disabled={disabled}
          maxLength={MESSAGE_MAX_LENGTH}
          placeholder={t("composerPlaceholder")}
          aria-label={t("composerPlaceholder")}
          onChange={(e) => {
            setValue(e.target.value);
            autoGrow();
          }}
          onKeyDown={(e) => {
            // Ignore Enter while an IME composition is active (CJK candidate commit),
            // otherwise a half-composed message would be sent prematurely.
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              send();
            }
          }}
          className={cn(
            "max-h-36 min-h-10 w-full flex-1 resize-none rounded-2xl border border-input bg-background px-4 py-2.5 text-sm",
            "placeholder:text-muted-foreground",
            "transition-[color,box-shadow,border-color] duration-150 ease-standard",
            "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
            "disabled:cursor-not-allowed disabled:opacity-50",
          )}
        />
        <button
          type="button"
          onClick={send}
          disabled={!canSend}
          aria-label={t("send")}
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xs",
            "transition-[background-color,transform] duration-150 ease-standard hover:bg-primary/90 active:scale-[0.94]",
            "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none",
            "disabled:pointer-events-none disabled:opacity-50",
          )}
        >
          <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            className="size-5 translate-x-px"
            aria-hidden
          >
            <path d="M3.4 20.4 20.85 12 3.4 3.6a.6.6 0 0 0-.83.68L4.5 10.5l8.5 1.5-8.5 1.5-1.93 6.22a.6.6 0 0 0 .83.68Z" />
          </svg>
        </button>
      </div>
      {remaining <= 200 && (
        <p
          className={cn(
            "mt-1 text-right text-xs tabular-nums",
            remaining <= 20 ? "text-destructive" : "text-muted-foreground",
          )}
          aria-live="polite"
        >
          {t("charactersLeft", { count: remaining })}
        </p>
      )}
    </div>
  );
}

"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { gradientFor } from "@/lib/gradients";
import { ALLOWED_MIME, MAX_UPLOAD_BYTES } from "../constants";
import type { PhotoType } from "../types";

interface Props {
  type: PhotoType;
  /** Signed URL of the current APPROVED photo, or null (placeholder shown). */
  currentUrl: string | null;
  seed: string; // for the deterministic gradient placeholder
  initial: string; // letter shown on the placeholder
}

type Status = "idle" | "uploading" | "pending" | "error";

const ACCEPT: string[] = [...ALLOWED_MIME];

type PhotoErrorKey =
  | "too_large"
  | "unsupported_format"
  | "invalid_image"
  | "dimensions_too_large"
  | "rate_limited"
  | "forbidden"
  | "invalid_input"
  | "upload_failed";

const KNOWN_ERRORS: PhotoErrorKey[] = [
  "too_large",
  "unsupported_format",
  "invalid_image",
  "dimensions_too_large",
  "rate_limited",
  "forbidden",
  "invalid_input",
  "upload_failed",
];

export function PhotoUpload({ type, currentUrl, seed, initial }: Props) {
  const t = useTranslations("Photos");
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | undefined>();
  const [errorNonce, setErrorNonce] = useState(0);

  function fail(code: string) {
    const key: PhotoErrorKey = (KNOWN_ERRORS as string[]).includes(code)
      ? (code as PhotoErrorKey)
      : "upload_failed";
    setStatus("error");
    setError(t(`errors.${key}`));
    setErrorNonce((n) => n + 1); // re-key so a repeated identical error re-announces
  }

  async function onSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!file) return;

    setError(undefined);
    if (!ACCEPT.includes(file.type)) return fail("unsupported_format");
    if (file.size > MAX_UPLOAD_BYTES) return fail("too_large");

    setStatus("uploading");
    const body = new FormData();
    body.set("file", file);
    body.set("type", type);
    try {
      const res = await fetch("/api/v1/photos", { method: "POST", body });
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as { error?: { code?: string } } | null;
        return fail(json?.error?.code ?? "upload_failed");
      }
      setStatus("pending");
      router.refresh();
    } catch {
      fail("upload_failed");
    }
  }

  return (
    <div className="flex items-center gap-4">
      {currentUrl ? (
        // Real photo (approved). next/image is a follow-up; a signed URL is a plain <img> here.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={currentUrl} alt="" className="size-16 rounded-full object-cover shadow-sm" />
      ) : (
        <span
          className="flex size-16 shrink-0 items-center justify-center rounded-full text-2xl font-bold text-white shadow-sm"
          style={{ background: gradientFor(seed) }}
          aria-hidden
        >
          {initial}
        </span>
      )}

      <div className="space-y-1">
        <Button
          intent="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          loading={status === "uploading"}
          disabled={status === "uploading"}
        >
          {status === "uploading" ? t("uploading") : currentUrl ? t("change") : t("upload")}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT.join(",")}
          className="hidden"
          onChange={onSelect}
        />
        {status === "pending" && <p className="text-xs text-muted-foreground">{t("awaitingReview")}</p>}
        {status === "error" && error && (
          <p key={errorNonce} role="alert" className="text-xs text-destructive">
            {error}
          </p>
        )}
        {status === "idle" && <p className="text-xs text-muted-foreground">{t("hint")}</p>}
      </div>
    </div>
  );
}

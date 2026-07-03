"use client";

import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

interface WizardFrameProps {
  step: number;
  total: number;
  title: string;
  subtitle?: string;
  canContinue: boolean;
  isLast: boolean;
  submitting: boolean;
  error?: string;
  onBack: () => void;
  onNext: () => void;
  children: React.ReactNode;
}

export function WizardFrame({
  step,
  total,
  title,
  subtitle,
  canContinue,
  isLast,
  submitting,
  error,
  onBack,
  onNext,
  children,
}: WizardFrameProps) {
  const t = useTranslations("Onboarding");
  const pct = Math.round(((step + 1) / total) * 100);

  return (
    <div>
      <div className="mb-6">
        <div className="mb-2 flex justify-between text-xs text-muted-foreground">
          <span>{t("stepOf", { current: step + 1, total })}</span>
          <span>{pct}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-300 ease-standard"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <h1 className="text-2xl font-bold tracking-tight text-balance">{title}</h1>
      {subtitle && <p className="mt-1 text-muted-foreground">{subtitle}</p>}

      {error && (
        <p role="status" className="mt-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="mt-6 min-h-40">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-8 flex items-center justify-between gap-3">
        <Button intent="ghost" onClick={onBack} disabled={step === 0 || submitting}>
          {t("back")}
        </Button>
        <Button onClick={onNext} disabled={!canContinue || submitting} loading={submitting}>
          {isLast ? t("finish") : t("continue")}
        </Button>
      </div>
    </div>
  );
}

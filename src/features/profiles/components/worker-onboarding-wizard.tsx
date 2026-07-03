"use client";

import { useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Field } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ChipGroup, type ChipOption } from "@/components/ui/chip-group";
import { WizardFrame } from "./wizard-frame";
import { saveWorkerProfile } from "../worker.actions";
import { availabilities as AVAIL, experienceLevels as EXP } from "../types";
import type { Availability, ExperienceLevel, WorkerProfileView } from "../types";

interface Props {
  categories: ChipOption[];
  languages: ChipOption[];
  initial?: WorkerProfileView | null;
}

const TOTAL = 4;

export function WorkerOnboardingWizard({ categories, languages, initial }: Props) {
  const t = useTranslations("Onboarding");

  const [step, setStep] = useState(0);
  const [firstName, setFirstName] = useState(initial?.firstName ?? "");
  const [lastName, setLastName] = useState(initial?.lastName ?? "");
  const [categoryIds, setCategoryIds] = useState<string[]>(initial?.categoryIds ?? []);
  const [languageIds, setLanguageIds] = useState<string[]>(initial?.languageIds ?? []);
  const [avail, setAvail] = useState<string[]>(initial?.availabilities ?? []);
  const [experience, setExperience] = useState<string[]>(
    initial ? [initial.experienceLevel] : [],
  );
  const [bio, setBio] = useState(initial?.bio ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [error, setError] = useState<string | undefined>();
  const [submitting, startTransition] = useTransition();

  const availOptions = useMemo<ChipOption[]>(
    () => AVAIL.map((a) => ({ value: a, label: t(`availability.${a}`) })),
    [t],
  );
  const expOptions = useMemo<ChipOption[]>(
    () => EXP.map((e) => ({ value: e, label: t(`experience.${e}`) })),
    [t],
  );

  const canContinue = [
    firstName.trim().length > 0 && lastName.trim().length > 0,
    categoryIds.length > 0,
    languageIds.length > 0 && avail.length > 0,
    experience.length === 1,
  ][step];

  function submit() {
    const exp = experience[0];
    if (!exp) return;
    setError(undefined);
    startTransition(async () => {
      const res = await saveWorkerProfile({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        bio: bio.trim() || undefined,
        experience_level: exp as ExperienceLevel,
        phone: phone.trim() || undefined,
        availabilities: avail as Availability[],
        category_ids: categoryIds,
        language_ids: languageIds,
      });
      if (res?.error) setError(t(`errors.${res.error}`));
    });
  }

  function onNext() {
    if (step === TOTAL - 1) submit();
    else setStep((s) => s + 1);
  }

  const titles = ["about", "work", "reach", "experience"] as const;
  const key = titles[step]!;

  return (
    <WizardFrame
      step={step}
      total={TOTAL}
      title={t(`worker.${key}Title`)}
      subtitle={t(`worker.${key}Subtitle`)}
      canContinue={Boolean(canContinue)}
      isLast={step === TOTAL - 1}
      submitting={submitting}
      error={error}
      onBack={() => setStep((s) => Math.max(0, s - 1))}
      onNext={onNext}
    >
      {step === 0 && (
        <div className="space-y-4">
          <Field label={t("worker.firstName")} value={firstName} onChange={(e) => setFirstName(e.target.value)} autoComplete="given-name" required />
          <Field label={t("worker.lastName")} value={lastName} onChange={(e) => setLastName(e.target.value)} help={t("worker.lastNameHelp")} autoComplete="family-name" required />
        </div>
      )}

      {step === 1 && <ChipGroup options={categories} value={categoryIds} onChange={setCategoryIds} max={10} />}

      {step === 2 && (
        <div className="space-y-6">
          <div>
            <p className="mb-2 text-sm font-medium">{t("worker.languagesLabel")}</p>
            <ChipGroup options={languages} value={languageIds} onChange={setLanguageIds} />
          </div>
          <div>
            <p className="mb-2 text-sm font-medium">{t("worker.availabilityLabel")}</p>
            <ChipGroup options={availOptions} value={avail} onChange={setAvail} />
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-6">
          <div>
            <p className="mb-2 text-sm font-medium">{t("worker.experienceLabel")}</p>
            <ChipGroup options={expOptions} value={experience} onChange={setExperience} multiple={false} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="bio">{t("worker.bioLabel")}</label>
            <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} maxLength={500} placeholder={t("worker.bioPlaceholder")} />
          </div>
          <Field label={t("worker.phoneLabel")} value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" autoComplete="tel" help={t("worker.phoneHelp")} />
        </div>
      )}
    </WizardFrame>
  );
}

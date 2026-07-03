"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { ChipGroup, type ChipOption } from "@/components/ui/chip-group";
import { cn } from "@/lib/utils/cn";
import { centsToEuros, eurosToCents } from "@/lib/utils/money";
import { experienceLevels } from "@/features/profiles/types";
import { saveListing } from "../listing.actions";
import { jobTypes, payPeriods } from "../types";
import type { ExperienceLevel, JobType, ListingView, PayPeriod } from "../types";

interface Props {
  categories: ChipOption[];
  initial?: ListingView | null;
}

export function ListingForm({ categories, initial }: Props) {
  const t = useTranslations("Listings");
  const listingId = initial?.id ?? null;

  const [title, setTitle] = useState(initial?.title ?? "");
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? "");
  const [jobType, setJobType] = useState<string[]>(initial ? [initial.jobType] : []);
  const [experience, setExperience] = useState<string[]>(
    initial ? [initial.requiredExperience] : [],
  );
  const [payPeriod, setPayPeriod] = useState<string[]>(initial ? [initial.payPeriod] : ["hourly"]);
  const [payMin, setPayMin] = useState(
    initial?.payMin != null ? String(centsToEuros(initial.payMin)) : "",
  );
  const [payMax, setPayMax] = useState(
    initial?.payMax != null ? String(centsToEuros(initial.payMax)) : "",
  );
  const [description, setDescription] = useState(initial?.description ?? "");
  const [error, setError] = useState<string | undefined>();
  const [submitting, start] = useTransition();

  // Parse pay to cents once; null = unparseable, undefined = omitted (exact rate).
  const minCents = eurosToCents(payMin);
  const maxCents = payMax.trim() === "" ? undefined : eurosToCents(payMax);
  const payValid =
    minCents != null &&
    minCents > 0 &&
    maxCents !== null &&
    (maxCents === undefined || maxCents >= minCents);

  const canSubmit =
    title.trim().length > 0 &&
    categoryId !== "" &&
    jobType.length === 1 &&
    experience.length === 1 &&
    payPeriod.length === 1 &&
    payValid;

  function submit() {
    setError(undefined);

    // Client-side guard mirrors the server rules for immediate feedback (server re-validates).
    // The explicit shape also narrows minCents → number, maxCents → number | undefined below.
    if (minCents == null || minCents <= 0 || maxCents === null || (maxCents !== undefined && maxCents < minCents)) {
      setError(t("errors.invalid_input"));
      return;
    }

    start(async () => {
      const res = await saveListing(listingId, {
        category_id: categoryId,
        title: title.trim(),
        description: description.trim() || undefined,
        job_type: jobType[0] as JobType,
        required_experience: experience[0] as ExperienceLevel,
        pay_min: minCents,
        pay_max: maxCents,
        pay_period: payPeriod[0] as PayPeriod,
      });
      if (res?.error) setError(t(`errors.${res.error}`));
    });
  }

  return (
    <div>
      <div className="mb-6">
        <Link href="/listings" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
          ← {t("dashboardTitle")}
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">
          {listingId ? t("editMetaTitle") : t("newMetaTitle")}
        </h1>
      </div>

      {error && (
        <p role="status" className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="space-y-5">
        <Field
          label={t("form.titleLabel")}
          placeholder={t("form.titlePlaceholder")}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={80}
          required
        />

        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="category">
            {t("form.categoryLabel")}
          </label>
          <Select id="category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">{t("form.categoryPlaceholder")}</option>
            {categories.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-2">
          <span className="text-sm font-medium">{t("form.jobTypeLabel")}</span>
          <ChipGroup
            multiple={false}
            ariaLabel={t("form.jobTypeLabel")}
            options={jobTypes.map((v) => ({ value: v, label: t(`jobType.${v}`) }))}
            value={jobType}
            onChange={setJobType}
          />
        </div>

        <div className="space-y-2">
          <span className="text-sm font-medium">{t("form.experienceLabel")}</span>
          <ChipGroup
            multiple={false}
            ariaLabel={t("form.experienceLabel")}
            options={experienceLevels.map((v) => ({ value: v, label: t(`experience.${v}`) }))}
            value={experience}
            onChange={setExperience}
          />
        </div>

        <div className="space-y-2">
          <span className="text-sm font-medium">{t("form.payPeriodLabel")}</span>
          <ChipGroup
            multiple={false}
            ariaLabel={t("form.payPeriodLabel")}
            options={payPeriods.map((v) => ({ value: v, label: t(`payPeriod.${v}`) }))}
            value={payPeriod}
            onChange={setPayPeriod}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* type=text (not number) so comma decimals survive for Kosovo/Albanian users;
              eurosToCents normalizes the comma and the value is re-validated server-side. */}
          <Field
            label={t("form.payMinLabel")}
            type="text"
            inputMode="decimal"
            value={payMin}
            onChange={(e) => setPayMin(e.target.value)}
            required
          />
          <Field
            label={t("form.payMaxLabel")}
            type="text"
            inputMode="decimal"
            value={payMax}
            onChange={(e) => setPayMax(e.target.value)}
            help={t("form.payHelp")}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="description">
            {t("form.descriptionLabel")}
          </label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={1000}
            placeholder={t("form.descriptionPlaceholder")}
          />
        </div>
      </div>

      <div className="mt-8 flex items-center justify-between gap-3">
        <Link href="/listings" className={cn(buttonVariants({ intent: "ghost" }))}>
          {t("form.cancel")}
        </Link>
        <Button onClick={submit} disabled={!canSubmit || submitting} loading={submitting}>
          {listingId ? t("form.submitEdit") : t("form.submitCreate")}
        </Button>
      </div>
    </div>
  );
}

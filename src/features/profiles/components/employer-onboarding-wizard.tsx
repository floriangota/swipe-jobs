"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Field } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { WizardFrame } from "./wizard-frame";
import { saveEmployerProfile } from "../employer.actions";
import type { ChipOption } from "@/components/ui/chip-group";
import type { EmployerProfileView } from "../types";

interface Props {
  businessTypes: ChipOption[];
  initial?: EmployerProfileView | null;
}

const TOTAL = 2;

export function EmployerOnboardingWizard({ businessTypes, initial }: Props) {
  const t = useTranslations("Onboarding");

  const [step, setStep] = useState(0);
  const [businessName, setBusinessName] = useState(initial?.businessName ?? "");
  const [businessTypeId, setBusinessTypeId] = useState(initial?.businessTypeId ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [contactPhone, setContactPhone] = useState(initial?.contactPhone ?? "");
  const [contactEmail, setContactEmail] = useState(initial?.contactEmail ?? "");
  const [error, setError] = useState<string | undefined>();
  const [submitting, startTransition] = useTransition();

  const canContinue = step === 0 ? businessName.trim().length > 0 : true;

  function submit() {
    setError(undefined);
    startTransition(async () => {
      const res = await saveEmployerProfile({
        business_name: businessName.trim(),
        business_type_id: businessTypeId || undefined,
        description: description.trim() || undefined,
        contact_phone: contactPhone.trim() || undefined,
        contact_email: contactEmail.trim() || undefined,
      });
      if (res?.error) setError(t(`errors.${res.error}`));
    });
  }

  return (
    <WizardFrame
      step={step}
      total={TOTAL}
      title={step === 0 ? t("employer.businessTitle") : t("employer.detailsTitle")}
      subtitle={step === 0 ? t("employer.businessSubtitle") : t("employer.detailsSubtitle")}
      canContinue={canContinue}
      isLast={step === TOTAL - 1}
      submitting={submitting}
      error={error}
      onBack={() => setStep((s) => Math.max(0, s - 1))}
      onNext={() => (step === TOTAL - 1 ? submit() : setStep((s) => s + 1))}
    >
      {step === 0 && (
        <div className="space-y-4">
          <Field
            label={t("employer.businessName")}
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            required
          />
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="business-type">
              {t("employer.businessType")}
            </label>
            <Select id="business-type" value={businessTypeId} onChange={(e) => setBusinessTypeId(e.target.value)}>
              <option value="">{t("employer.businessTypePlaceholder")}</option>
              {businessTypes.map((b) => (
                <option key={b.value} value={b.value}>
                  {b.label}
                </option>
              ))}
            </Select>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="description">
              {t("employer.description")}
            </label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={1000}
              placeholder={t("employer.descriptionPlaceholder")}
            />
          </div>
          <Field
            label={t("employer.contactPhone")}
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            type="tel"
            help={t("employer.contactHelp")}
          />
          <Field
            label={t("employer.contactEmail")}
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            type="email"
          />
        </div>
      )}
    </WizardFrame>
  );
}

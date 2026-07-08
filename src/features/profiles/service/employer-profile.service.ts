import "server-only";
import { createClient } from "@/lib/supabase/server";
import { sanitizeText } from "@/lib/sanitize";
import type { EmployerProfileInput } from "../schemas";
import type { EmployerProfileView } from "../types";

/** Sanitize free text on write (docs/security.md); empty after cleaning → null. */
function cleanText(value: string | null | undefined): string | null {
  if (!value) return null;
  const cleaned = sanitizeText(value);
  return cleaned.length > 0 ? cleaned : null;
}

interface EmployerProfileRow {
  id: string;
  business_name: string;
  business_type_id: string | null;
  description: string | null;
  logo_id: string | null;
  contact_phone: string | null;
  contact_email: string | null;
}

function toView(row: EmployerProfileRow): EmployerProfileView {
  return {
    id: row.id,
    businessName: row.business_name,
    businessTypeId: row.business_type_id,
    description: row.description,
    logoId: row.logo_id,
    contactPhone: row.contact_phone,
    contactEmail: row.contact_email,
  };
}

/** GOLDEN RULE: strip contact fields for non-owner / pre-match viewers (M5). */
export function stripEmployerContact(view: EmployerProfileView): EmployerProfileView {
  return { ...view, contactPhone: null, contactEmail: null };
}

export async function getOwnEmployerProfile(userId: string): Promise<EmployerProfileView | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("employer_profiles")
    .select("id, business_name, business_type_id, description, logo_id, contact_phone, contact_email")
    .eq("user_id", userId)
    .maybeSingle();
  const row = data as EmployerProfileRow | null;
  return row ? toView(row) : null;
}

export async function createEmployerProfile(
  userId: string,
  input: EmployerProfileInput,
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("employer_profiles").insert({
    user_id: userId,
    business_name: input.business_name,
    business_type_id: input.business_type_id ?? null,
    description: cleanText(input.description),
    contact_phone: input.contact_phone ?? null,
    contact_email: input.contact_email ?? null,
  });
  if (error) throw new Error(error.message);
}

export async function updateEmployerProfile(
  userId: string,
  input: EmployerProfileInput,
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("employer_profiles")
    .update({
      business_name: input.business_name,
      business_type_id: input.business_type_id ?? null,
      description: cleanText(input.description),
      contact_phone: input.contact_phone ?? null,
      contact_email: input.contact_email ?? null,
    })
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
}

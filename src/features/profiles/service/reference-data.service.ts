import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { BusinessType, Category, City, Language } from "../types";

// Reference data is public (RLS allows anon read of active rows). Used by both
// the /api/v1 route handlers and the onboarding pages (SSR).

async function fetchLookup<T>(table: string, columns: string): Promise<T[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from(table)
    .select(columns)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) throw new Error(`Failed to load ${table}: ${error.message}`);
  return (data ?? []) as T[];
}

export function getCategories(): Promise<Category[]> {
  return fetchLookup<Category>("categories", "id, slug, name_sq, name_en, sort_order");
}

export function getLanguages(): Promise<Language[]> {
  return fetchLookup<Language>("languages", "id, code, name_sq, name_en, sort_order");
}

export function getBusinessTypes(): Promise<BusinessType[]> {
  return fetchLookup<BusinessType>("business_types", "id, slug, name_sq, name_en, sort_order");
}

export async function getCities(): Promise<City[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cities")
    .select("id, name, country")
    .eq("is_active", true)
    .order("name", { ascending: true });
  if (error) throw new Error(`Failed to load cities: ${error.message}`);
  return (data ?? []) as City[];
}

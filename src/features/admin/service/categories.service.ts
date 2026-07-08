import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { CategoryUpsertInput } from "../schemas";
import type { AdminCategoryView } from "../types";

interface CategoryRow {
  id: string;
  slug: string;
  name_sq: string;
  name_en: string;
  is_active: boolean;
  sort_order: number;
}

/** All categories incl. inactive (admins manage the full lookup list). Reference-data
 *  RLS already allows reading active rows; inactive rows are granted by the admin
 *  read policy — so a non-admin only sees active ones here. */
export async function listCategoriesAdmin(): Promise<AdminCategoryView[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, slug, name_sq, name_en, is_active, sort_order")
    .order("sort_order", { ascending: true })
    .order("name_en", { ascending: true });
  if (error) throw new Error(error.message);
  return ((data ?? []) as CategoryRow[]).map((r) => ({
    id: r.id,
    slug: r.slug,
    nameSq: r.name_sq,
    nameEn: r.name_en,
    isActive: r.is_active,
    sortOrder: r.sort_order,
  }));
}

export type UpsertCategoryResult =
  | { status: "ok"; id: string }
  | { status: "forbidden" }
  | { status: "conflict" };

/** Create/update a category via the admin_upsert_category SECURITY DEFINER function
 *  (re-checks admin + audit-logs). A duplicate slug surfaces as a clean conflict. */
export async function upsertCategory(input: CategoryUpsertInput): Promise<UpsertCategoryResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_upsert_category", {
    p_id: input.id ?? null,
    p_slug: input.slug,
    p_name_sq: input.name_sq,
    p_name_en: input.name_en,
    p_is_active: input.is_active ?? true,
    p_sort_order: input.sort_order ?? 0,
  });
  if (error) {
    if (error.code === "23505") return { status: "conflict" }; // duplicate slug
    throw new Error(error.message);
  }
  const row = (Array.isArray(data) ? data[0] : data) as { ok: boolean; id: string | null } | undefined;
  if (!row || !row.ok || !row.id) return { status: "forbidden" };
  return { status: "ok", id: row.id };
}

-- M8 fix: admin_upsert_category returned a null id. Its OUT column `id` shadowed the
-- `categories.id` column, so `returning id into v_id` (and `where id = p_id`) resolved
-- to the null OUT variable instead of the column. The `#variable_conflict use_column`
-- pragma makes ambiguous names resolve to columns. Body-only change (same signature).
create or replace function public.admin_upsert_category(
  p_id uuid,
  p_slug text,
  p_name_sq text,
  p_name_en text,
  p_is_active boolean,
  p_sort_order int
)
returns table (ok boolean, id uuid)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_uid uuid := (select auth.uid());
  v_id uuid;
begin
  if not public.user_has_role('admin') then
    return query select false, null::uuid; return;
  end if;

  if p_id is null then
    insert into public.categories (slug, name_sq, name_en, is_active, sort_order)
    values (p_slug, p_name_sq, p_name_en, coalesce(p_is_active, true), coalesce(p_sort_order, 0))
    returning categories.id into v_id;
  else
    update public.categories
    set slug = p_slug, name_sq = p_name_sq, name_en = p_name_en,
        is_active = coalesce(p_is_active, true), sort_order = coalesce(p_sort_order, 0)
    where categories.id = p_id
    returning categories.id into v_id;
  end if;

  if v_id is null then
    return query select false, null::uuid; return;
  end if;
  insert into public.audit_logs (actor_user_id, action, target_type, target_id, metadata)
  values (v_uid, case when p_id is null then 'category_created' else 'category_updated' end, 'category', v_id, jsonb_build_object('slug', p_slug));
  return query select true, v_id;
end;
$$;

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Field } from "@/components/ui/input";
import { toast } from "@/stores/toast-store";
import { cn } from "@/lib/utils/cn";
import type { AdminCategoryView } from "../types";

interface Draft {
  id?: string;
  slug: string;
  name_sq: string;
  name_en: string;
  is_active: boolean;
  sort_order: number;
}

const empty: Draft = { slug: "", name_sq: "", name_en: "", is_active: true, sort_order: 0 };

export function CategoryEditor({ initial }: { initial: AdminCategoryView[] }) {
  const [items, setItems] = useState(initial);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);

  function openNew() {
    setDraft({ ...empty, sort_order: items.length });
  }
  function openEdit(c: AdminCategoryView) {
    setDraft({ id: c.id, slug: c.slug, name_sq: c.nameSq, name_en: c.nameEn, is_active: c.isActive, sort_order: c.sortOrder });
  }

  async function save() {
    if (!draft) return;
    setSaving(true);
    try {
      const isEdit = Boolean(draft.id);
      const url = isEdit ? `/api/v1/admin/categories/${draft.id}` : "/api/v1/admin/categories";
      const { id: _omit, ...body } = draft;
      void _omit;
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.status === 409) {
        toast.error({ title: "That slug is already in use" });
        return;
      }
      if (!res.ok) throw new Error(String(res.status));
      const json = (await res.json()) as { data?: { id?: string } };
      const savedId = json.data?.id ?? draft.id ?? "";
      const view: AdminCategoryView = {
        id: savedId,
        slug: draft.slug,
        nameSq: draft.name_sq,
        nameEn: draft.name_en,
        isActive: draft.is_active,
        sortOrder: draft.sort_order,
      };
      setItems((prev) => {
        const next = isEdit ? prev.map((c) => (c.id === savedId ? view : c)) : [...prev, view];
        return next.sort((a, b) => a.sortOrder - b.sortOrder || a.nameEn.localeCompare(b.nameEn));
      });
      toast.success({ title: isEdit ? "Category updated" : "Category created" });
      setDraft(null);
    } catch {
      toast.error({ title: "Couldn't save the category" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button intent="primary" size="sm" onClick={openNew}>
          New category
        </Button>
      </div>
      <ul className="space-y-2">
        {items.map((c) => (
          <li key={c.id}>
            <button
              type="button"
              onClick={() => openEdit(c)}
              className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 text-left transition-colors hover:bg-secondary/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {c.nameEn} · {c.nameSq}
                </p>
                <p className="truncate text-xs text-muted-foreground">{c.slug}</p>
              </div>
              <span
                className={cn(
                  "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
                  c.isActive ? "bg-success/15 text-success" : "bg-muted text-muted-foreground",
                )}
              >
                {c.isActive ? "active" : "hidden"}
              </span>
            </button>
          </li>
        ))}
      </ul>

      <BottomSheet open={draft !== null} onOpenChange={(o) => !o && setDraft(null)} title={draft?.id ? "Edit category" : "New category"}>
        {draft && (
          <div className="space-y-3">
            <Field label="Slug" value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: e.target.value })} placeholder="barista" />
            <Field label="Name (English)" value={draft.name_en} onChange={(e) => setDraft({ ...draft, name_en: e.target.value })} placeholder="Barista" />
            <Field label="Name (Albanian)" value={draft.name_sq} onChange={(e) => setDraft({ ...draft, name_sq: e.target.value })} placeholder="Barist" />
            <Field
              label="Sort order"
              type="number"
              value={String(draft.sort_order)}
              onChange={(e) => setDraft({ ...draft, sort_order: Number(e.target.value) || 0 })}
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={draft.is_active}
                onChange={(e) => setDraft({ ...draft, is_active: e.target.checked })}
                className="size-4 rounded border-input"
              />
              Active (shown to users)
            </label>
            <div className="flex gap-2 pt-1">
              <Button intent="primary" className="flex-1" loading={saving} onClick={() => void save()}>
                Save
              </Button>
              <Button intent="ghost" disabled={saving} onClick={() => setDraft(null)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </BottomSheet>
    </>
  );
}

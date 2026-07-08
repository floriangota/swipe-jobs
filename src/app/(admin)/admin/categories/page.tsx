import type { Metadata } from "next";
import { listCategoriesAdmin } from "@/features/admin/service/categories.service";
import { CategoryEditor } from "@/features/admin/components/category-editor";
import { ErrorState } from "@/components/ui/states";

export const metadata: Metadata = { title: "Categories · Admin · SwipeJobs" };

export default async function AdminCategoriesPage() {
  let categories: Awaited<ReturnType<typeof listCategoriesAdmin>>;
  try {
    categories = await listCategoriesAdmin();
  } catch {
    return <ErrorState title="Couldn't load categories" description="Please try again." />;
  }
  return <CategoryEditor initial={categories} />;
}

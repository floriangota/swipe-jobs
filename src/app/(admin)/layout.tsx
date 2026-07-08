import { SiteHeader } from "@/components/site-header";
import { requireRole } from "@/lib/auth/guards";
import { AdminNav } from "@/features/admin/components/admin-nav";

// Admin section. Gated by requireRole('admin') here AND at the DB (admin RLS policies +
// admin_* functions) — defense in depth. English-only per CLAUDE.md.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireRole("admin");
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6">
        <h1 className="mb-1 text-2xl font-bold tracking-tight">Admin</h1>
        <p className="mb-4 text-sm text-muted-foreground">Moderation &amp; marketplace health.</p>
        <AdminNav />
        {children}
      </main>
    </div>
  );
}

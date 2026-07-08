import { SiteHeader } from "@/components/site-header";

// Public legal pages (privacy, terms) — reachable pre-auth (linked from signup).
export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6">
        <article className="space-y-4 text-sm leading-relaxed text-foreground [&_h2]:mt-6 [&_h2]:text-base [&_h2]:font-semibold [&_p]:text-muted-foreground [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5 [&_ul]:text-muted-foreground">
          {children}
        </article>
      </main>
    </div>
  );
}

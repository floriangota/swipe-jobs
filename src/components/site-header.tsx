import Link from "next/link";
import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";
import { Wordmark } from "@/components/brand/logo";
import { LanguageSwitch } from "@/components/language-switch";
import { ThemeToggle } from "@/components/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/guards";
import { logout } from "@/features/auth/actions";
import { cn } from "@/lib/utils/cn";

/** Shared top bar: brand, language switch, theme toggle, auth controls. */
export async function SiteHeader() {
  const tNav = await getTranslations("Nav");
  const tAuth = await getTranslations("Auth");
  const cookieStore = await cookies();
  const initialDark = cookieStore.get("theme")?.value === "dark";
  const user = await getCurrentUser();

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link
            href="/"
            className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={tNav("home")}
          >
            <Wordmark className="text-lg" />
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/styleguide"
              className="hidden rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:inline-block"
            >
              {tNav("designSystem")}
            </Link>
            <LanguageSwitch />
            <ThemeToggle initialDark={initialDark} />
            {user ? (
              <form action={logout}>
                <button type="submit" className={cn(buttonVariants({ intent: "ghost", size: "sm" }))}>
                  {tAuth("logout")}
                </button>
              </form>
            ) : (
              <Link href="/login" className={cn(buttonVariants({ intent: "primary", size: "sm" }))}>
                {tAuth("login.submit")}
              </Link>
            )}
          </div>
        </div>
      </header>

      {user && !user.emailVerified && (
        <div className="border-b border-warning/30 bg-warning/10">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm sm:px-6">
            <span>{tAuth("banner.text")}</span>
            <Link href="/verify-email" className="font-medium text-primary hover:underline">
              {tAuth("banner.resend")}
            </Link>
          </div>
        </div>
      )}
    </>
  );
}

import Link from "next/link";
import { cookies } from "next/headers";
import { Wordmark } from "@/components/brand/logo";
import { LanguageSwitch } from "@/components/language-switch";
import { ThemeToggle } from "@/components/theme-toggle";

// Centered layout for the auth screens (route group — does not affect URLs).
export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const initialDark = cookieStore.get("theme")?.value === "dark";

  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex items-center justify-between p-4 sm:p-6">
        <Link
          href="/"
          className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Wordmark className="text-lg" />
        </Link>
        <div className="flex items-center gap-2">
          <LanguageSwitch />
          <ThemeToggle initialDark={initialDark} />
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}

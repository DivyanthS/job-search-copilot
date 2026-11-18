import type { Metadata } from "next"
import Link from "next/link"
import { LogIn } from "lucide-react"
import { Logo } from "@/components/logo"
import { MainNav } from "@/components/main-nav"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = {
  description: "Try Job Copilot with sample data. Nothing is saved.",
}

// The public demo: the real interface with made-up sample data, open to
// anyone without signing in. Nothing is saved and no AI is used: job reading
// and application kits are simulated, so visitors can't spend AI credit.
export default function DemoLayout({ children }: LayoutProps<"/demo">) {
  return (
    <div className="flex min-h-svh flex-col bg-muted/40 dark:bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-4 px-4 sm:px-6">
          <Link href="/demo" className="rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
            <Logo />
          </Link>
          <MainNav isAdmin base="/demo" />
          <div className="ml-auto flex items-center gap-1.5">
            <ThemeToggle />
            <Button size="sm" nativeButton={false} render={<Link href="/login" />}>
              <LogIn /> Sign in
            </Button>
          </div>
        </div>
      </header>
      <div className="border-b bg-amber-500/10 px-4 py-2 text-center text-xs text-amber-800 dark:text-amber-300">
        Demo with sample data. Nothing is saved, and the AI is simulated. To use it for real, you&apos;ll need an
        invite.
      </div>
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  )
}

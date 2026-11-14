import Link from "next/link"
import { Logo } from "@/components/logo"
import { MainNav } from "@/components/main-nav"
import { ThemeToggle } from "@/components/theme-toggle"
import { UserMenu } from "@/components/user-menu"
import { displayName, initials, requireProfile } from "@/lib/profile"

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const profile = await requireProfile()

  return (
    <div className="flex min-h-svh flex-col bg-muted/40 dark:bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-4 px-4 sm:px-6">
          <Link href="/" className="rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
            <Logo />
          </Link>
          <MainNav />
          <div className="ml-auto flex items-center gap-1.5">
            <ThemeToggle />
            <UserMenu
              name={displayName(profile)}
              email={profile.email}
              initials={initials(profile)}
              isAdmin={profile.role === "admin"}
            />
          </div>
        </div>
      </header>
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  )
}

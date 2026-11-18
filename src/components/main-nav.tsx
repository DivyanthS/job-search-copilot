"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { KanbanSquare, Settings, ShieldCheck } from "lucide-react"
import { cn } from "@/lib/utils"

const LINKS = [
  { path: "", label: "Board", icon: KanbanSquare },
  { path: "/settings", label: "Settings", icon: Settings },
]
const ADMIN_LINK = { path: "/admin", label: "Admin", icon: ShieldCheck }

// `base` puts the links under another section, e.g. "/demo" for the public demo.
export function MainNav({ isAdmin = false, base = "" }: { isAdmin?: boolean; base?: string }) {
  const pathname = usePathname()
  const home = base || "/"
  return (
    <nav aria-label="Main" className="flex items-center gap-1">
      {(isAdmin ? [...LINKS, ADMIN_LINK] : LINKS).map(({ path, label, icon: Icon }) => {
        const href = path ? `${base}${path}` : home
        const active = href === home ? pathname === home : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              active ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            )}
          >
            <Icon className="size-4" />
            <span className="hidden sm:inline">{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

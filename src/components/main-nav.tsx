"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { KanbanSquare, Settings } from "lucide-react"
import { cn } from "@/lib/utils"

const LINKS = [
  { href: "/", label: "Board", icon: KanbanSquare },
  { href: "/settings", label: "Settings", icon: Settings },
]

export function MainNav() {
  const pathname = usePathname()
  return (
    <nav aria-label="Main" className="flex items-center gap-1">
      {LINKS.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href)
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

"use client"

import { Star } from "lucide-react"
import { daysBetween, type WorkMode } from "@/lib/jobs"
import { cn } from "@/lib/utils"

// Small pieces shared by the job cards and the job panel.

export const WORK_MODE_STYLES: Record<WorkMode, string> = {
  remote: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  hybrid: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  onsite: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
}

const BADGE_COLORS = [
  "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300",
  "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  "bg-teal-500/15 text-teal-700 dark:text-teal-300",
]

export function CompanyBadge({ company, className }: { company: string; className?: string }) {
  let hash = 0
  for (const ch of company.toLowerCase()) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-md text-sm font-semibold",
        BADGE_COLORS[hash % BADGE_COLORS.length],
        className
      )}
    >
      {company.trim()[0]?.toUpperCase() ?? "?"}
    </span>
  )
}

function toDate(value: string) {
  // Plain dates (YYYY-MM-DD) are read as local dates, without timezone shifts.
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date(value)
}

// "Nov 3", or "Nov 3, 2025" for other years. With weekday: "Mon, Nov 3".
export function formatDate(value: string, { weekday = false }: { weekday?: boolean } = {}) {
  const date = toDate(value)
  const sameYear = date.getFullYear() === new Date().getFullYear()
  return date.toLocaleDateString(undefined, {
    ...(weekday ? { weekday: "short" } : {}),
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  })
}

// "14:30" → "2:30 PM" (in the person's own clock style).
export function formatTime(time: string) {
  if (!time) return ""
  const [h, m] = time.split(":").map(Number)
  const d = new Date()
  d.setHours(h, m, 0, 0)
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
}

// "today", "tomorrow", "in 3 days", "yesterday", "3 days ago".
export function relativeDay(today: string, date: string) {
  const days = daysBetween(today, date)
  if (days === 0) return "today"
  if (days === 1) return "tomorrow"
  if (days === -1) return "yesterday"
  return days > 0 ? `in ${days} days` : `${-days} days ago`
}

export function PriorityStars({
  value,
  onChange,
  size = "sm",
}: {
  value: number
  onChange?: (value: number) => void
  size?: "xs" | "sm"
}) {
  const icon = size === "xs" ? "size-3" : "size-4"
  if (!onChange) {
    if (!value) return null
    return (
      <span className="inline-flex items-center gap-0.5 text-amber-500" aria-label={`Priority: ${value} of 3`}>
        {Array.from({ length: value }, (_, i) => (
          <Star key={i} className={cn(icon, "fill-current")} />
        ))}
      </span>
    )
  }
  return (
    <span role="radiogroup" aria-label="Priority" className="inline-flex items-center">
      {[1, 2, 3].map((n) => {
        const on = n <= value
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} star${n > 1 ? "s" : ""}${value === n ? " (click again to clear)" : ""}`}
            onClick={() => onChange(value === n ? 0 : n)}
            className={cn(
              "rounded p-0.5 transition-colors outline-none hover:text-amber-500 focus-visible:ring-3 focus-visible:ring-ring/50",
              on ? "text-amber-500" : "text-muted-foreground/40"
            )}
          >
            <Star className={cn(icon, on && "fill-current")} />
          </button>
        )
      })}
    </span>
  )
}

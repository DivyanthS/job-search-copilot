"use client"

import { BellRing, CalendarClock, Check, ChevronDown, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { addDays, daysBetween, type Interview, type Job } from "@/lib/jobs"
import { cn } from "@/lib/utils"
import { CompanyBadge, formatTime, relativeDay } from "./job-meta"

type Item =
  | { kind: "follow-up"; job: Job; days: number }
  | { kind: "interview"; job: Job; interview: Interview }

const SNOOZE = [
  { label: "Tomorrow", days: 1 },
  { label: "In 3 days", days: 3 },
  { label: "In 1 week", days: 7 },
]

// "Due today": follow-ups that are due or overdue, and interviews today or
// tomorrow. Hidden when there's nothing to show.
export function DueStrip({
  jobs,
  today,
  onOpen,
  onFollowUpChange,
}: {
  jobs: Job[]
  today: string
  onOpen: (job: Job) => void
  onFollowUpChange: (job: Job, date: string | null) => void
}) {
  const items: Item[] = []
  for (const job of jobs) {
    for (const interview of job.interviews ?? []) {
      const days = daysBetween(today, interview.date)
      if (days === 0 || days === 1) items.push({ kind: "interview", job, interview })
    }
  }
  for (const job of jobs) {
    if (!job.follow_up_on || job.status === "offer" || job.status === "rejected") continue
    const days = daysBetween(today, job.follow_up_on)
    if (days <= 0) items.push({ kind: "follow-up", job, days })
  }
  if (items.length === 0) return null

  items.sort(compareItems)

  return (
    <section aria-label="Due today" className="mb-5 rounded-xl border bg-card shadow-xs">
      <header className="flex items-center gap-2 border-b px-4 py-2.5">
        <BellRing className="size-4 text-amber-500" />
        <h2 className="text-sm font-medium">Due today</h2>
        <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground tabular-nums">{items.length}</span>
      </header>
      <ul className="divide-y">
        {items.map((item) => (
          <li
            key={item.kind === "interview" ? `iv-${item.interview.id}` : `fu-${item.job.id}`}
            className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5"
          >
            <CompanyBadge company={item.job.company} className="size-7 text-xs" />
            <button type="button" onClick={() => onOpen(item.job)} className="min-w-0 flex-1 text-left">
              <p className="truncate text-sm font-medium hover:underline">
                {item.kind === "interview" ? `${item.interview.label} with ${item.job.company}` : `Follow up with ${item.job.company}`}
              </p>
              <p
                className={cn(
                  "flex items-center gap-1 truncate text-xs text-muted-foreground",
                  item.kind === "follow-up" && item.days < 0 && "text-rose-600 dark:text-rose-400"
                )}
              >
                {item.kind === "interview" ? <CalendarClock className="size-3 shrink-0" /> : <Clock className="size-3 shrink-0" />}
                <span className="truncate">
                  {item.job.title} ·{" "}
                  {item.kind === "interview"
                    ? `${relativeDay(today, item.interview.date)}${item.interview.time ? ` at ${formatTime(item.interview.time)}` : ""}`
                    : item.days === 0
                      ? "due today"
                      : `overdue (${relativeDay(today, item.job.follow_up_on!)})`}
                </span>
              </p>
            </button>
            {item.kind === "follow-up" ? (
              <div className="flex items-center gap-1.5">
                <Button size="sm" variant="outline" onClick={() => onFollowUpChange(item.job, null)}>
                  <Check /> Done
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger render={<Button size="sm" variant="ghost" />}>
                    Snooze <ChevronDown />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-36">
                    {SNOOZE.map((s) => (
                      <DropdownMenuItem key={s.days} onClick={() => onFollowUpChange(item.job, addDays(today, s.days))}>
                        {s.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <Button size="sm" variant="ghost" onClick={() => onOpen(item.job)}>
                Open
              </Button>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}

// Interviews first (soonest first), then follow-ups (most overdue first).
function compareItems(a: Item, b: Item) {
  if (a.kind !== b.kind) return a.kind === "interview" ? -1 : 1
  if (a.kind === "interview" && b.kind === "interview") {
    return (a.interview.date + (a.interview.time || "99:99")).localeCompare(b.interview.date + (b.interview.time || "99:99"))
  }
  return (a as Extract<Item, { kind: "follow-up" }>).days - (b as Extract<Item, { kind: "follow-up" }>).days
}

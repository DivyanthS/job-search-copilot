"use client"

import { BellRing, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { formatDate, relativeDay } from "@/components/board/job-meta"
import { addDays, daysBetween, type JobDetails } from "@/lib/jobs"
import { cn } from "@/lib/utils"
import { Section, type SaveFn } from "./section"

const QUICK_PICKS = [
  { label: "Tomorrow", days: 1 },
  { label: "In 3 days", days: 3 },
  { label: "In 1 week", days: 7 },
  { label: "In 2 weeks", days: 14 },
]

export function ReminderSection({ job, today, save }: { job: JobDetails; today: string; save: SaveFn }) {
  const followUp = job.follow_up_on
  const days = followUp ? daysBetween(today, followUp) : null

  return (
    <Section icon={BellRing} title="Follow-up reminder">
      {followUp ? (
        <div
          className={cn(
            "flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border px-3 py-2.5",
            days! < 0 && "border-rose-500/30 bg-rose-500/5",
            days === 0 && "border-amber-500/30 bg-amber-500/5"
          )}
        >
          <div className="min-w-0 flex-1">
            <p className="font-medium">Follow up {formatDate(followUp, { weekday: true })}</p>
            <p
              className={cn(
                "text-xs text-muted-foreground",
                days! < 0 && "text-rose-600 dark:text-rose-400",
                days === 0 && "text-amber-700 dark:text-amber-400"
              )}
            >
              {days! < 0 ? `Overdue (${relativeDay(today, followUp)})` : relativeDay(today, followUp)}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <Input
              type="date"
              aria-label="Change follow-up date"
              value={followUp}
              min={today}
              onChange={(e) => e.target.value && save({ follow_up_on: e.target.value })}
              className="h-8 w-auto"
            />
            <Button size="sm" variant="outline" onClick={() => save({ follow_up_on: null })}>
              {days! <= 0 ? <Check /> : <X />}
              {days! <= 0 ? "Done" : "Clear"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Remind me to follow up:</p>
          <div className="flex flex-wrap items-center gap-1.5">
            {QUICK_PICKS.map((pick) => (
              <Button key={pick.days} size="sm" variant="outline" onClick={() => save({ follow_up_on: addDays(today, pick.days) })}>
                {pick.label}
              </Button>
            ))}
            <Input
              type="date"
              aria-label="Pick a follow-up date"
              min={today}
              value=""
              onChange={(e) => e.target.value && save({ follow_up_on: e.target.value })}
              className="h-7 w-auto text-xs"
            />
          </div>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between gap-3">
        <Label htmlFor="applied-on" className="font-normal text-muted-foreground">
          Applied on
        </Label>
        <div className="flex items-center gap-1">
          <Input
            id="applied-on"
            type="date"
            value={job.applied_on ?? ""}
            max={today}
            onChange={(e) => save({ applied_on: e.target.value || null })}
            className="h-8 w-auto"
          />
          {job.applied_on && (
            <Button size="icon-sm" variant="ghost" aria-label="Clear applied date" onClick={() => save({ applied_on: null })}>
              <X />
            </Button>
          )}
        </div>
      </div>
    </Section>
  )
}

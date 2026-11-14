"use client"

import { useState } from "react"
import { CalendarClock, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatDate, formatTime, relativeDay } from "@/components/board/job-meta"
import { INTERVIEW_LABELS, MAX_INTERVIEWS, cleanInterview } from "@/lib/job-details"
import type { JobDetails } from "@/lib/jobs"
import { cn } from "@/lib/utils"
import { EmptyHint, Section, type SaveFn } from "./section"

const LABEL_ITEMS = INTERVIEW_LABELS.map((l) => ({ value: l, label: l }))

export function InterviewsSection({ job, today, save }: { job: JobDetails; today: string; save: SaveFn }) {
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState({ date: today, time: "", label: INTERVIEW_LABELS[0] })
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function add(e: React.FormEvent) {
    e.preventDefault()
    const checked = cleanInterview(draft)
    if ("error" in checked) return setError(checked.error)
    setBusy(true)
    const ok = await save({ interviews: [...job.interviews, checked.value] })
    setBusy(false)
    if (ok) {
      setAdding(false)
      setError(null)
      setDraft({ date: today, time: "", label: INTERVIEW_LABELS[0] })
    }
  }

  return (
    <Section
      icon={CalendarClock}
      title="Interviews"
      action={
        !adding &&
        job.interviews.length < MAX_INTERVIEWS && (
          <Button size="sm" variant="ghost" onClick={() => setAdding(true)}>
            <Plus /> Add
          </Button>
        )
      }
    >
      {job.interviews.length === 0 && !adding && <EmptyHint>No interviews scheduled yet.</EmptyHint>}

      {job.interviews.length > 0 && (
        <ul className="space-y-1.5">
          {job.interviews.map((interview) => {
            const past = interview.date < today
            return (
              <li
                key={interview.id}
                className={cn("group/row flex items-center gap-3 rounded-lg border px-3 py-2", past && "opacity-60")}
              >
                <span className="flex size-9 shrink-0 flex-col items-center justify-center rounded-md bg-violet-500/10 text-violet-700 dark:text-violet-300">
                  <span className="text-[10px] leading-none uppercase">
                    {new Date(`${interview.date}T00:00:00`).toLocaleDateString(undefined, { month: "short" })}
                  </span>
                  <span className="text-sm leading-tight font-semibold">{Number(interview.date.slice(8))}</span>
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{interview.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(interview.date, { weekday: true })}
                    {interview.time && ` · ${formatTime(interview.time)}`}
                    {!past && ` · ${relativeDay(today, interview.date)}`}
                  </p>
                </div>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label={`Remove ${interview.label} on ${formatDate(interview.date)}`}
                  className="text-muted-foreground sm:opacity-0 sm:group-hover/row:opacity-100 sm:focus-visible:opacity-100"
                  onClick={() => save({ interviews: job.interviews.filter((i) => i.id !== interview.id) })}
                >
                  <Trash2 />
                </Button>
              </li>
            )
          })}
        </ul>
      )}

      {adding && (
        <form onSubmit={add} className="mt-2 space-y-3 rounded-lg border bg-muted/40 p-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="grid gap-1.5">
              <Label htmlFor="iv-date">Date</Label>
              <Input id="iv-date" type="date" value={draft.date} onChange={(e) => setDraft((d) => ({ ...d, date: e.target.value }))} required />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="iv-time">
                Time <span className="font-normal text-muted-foreground">(optional)</span>
              </Label>
              <Input id="iv-time" type="time" value={draft.time} onChange={(e) => setDraft((d) => ({ ...d, time: e.target.value }))} />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="iv-label">Type</Label>
            <Select items={LABEL_ITEMS} value={draft.label} onValueChange={(v) => v && setDraft((d) => ({ ...d, label: String(v) }))}>
              <SelectTrigger id="iv-label" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LABEL_ITEMS.map((l) => (
                  <SelectItem key={l.value} value={l.value}>
                    {l.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" size="sm" variant="ghost" onClick={() => { setAdding(false); setError(null) }} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={busy}>
              Add interview
            </Button>
          </div>
        </form>
      )}
    </Section>
  )
}

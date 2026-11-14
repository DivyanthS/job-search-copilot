"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  Banknote,
  BellRing,
  CalendarClock,
  ExternalLink,
  MapPin,
  MoreHorizontal,
  PanelRightOpen,
  Pencil,
  Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { COLUMNS, type ColumnId } from "@/lib/columns"
import { WORK_MODES, daysBetween, nextInterview, type Job } from "@/lib/jobs"
import { cn } from "@/lib/utils"
import { CompanyBadge, PriorityStars, WORK_MODE_STYLES, formatDate, formatTime, relativeDay } from "./job-meta"

export type CardHandlers = {
  onOpen: (job: Job) => void
  onEdit: (job: Job) => void
  onMove: (job: Job, status: ColumnId) => void
  onDelete: (job: Job) => void
}

// The card as it sits in a column, wired up for drag and drop.
export function SortableJobCard({ job, today, ...handlers }: { job: Job; today: string | null } & CardHandlers) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: job.id,
    data: { type: "job", status: job.status },
  })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn("touch-manipulation", isDragging && "opacity-40")}
      {...attributes}
      {...listeners}
      aria-roledescription="Draggable job card"
      aria-label={`${job.title} at ${job.company}`}
    >
      <JobCard job={job} today={today} {...handlers} />
    </div>
  )
}

// What a card looks like. Also used for the floating copy while dragging.
export function JobCard({
  job,
  today,
  onOpen,
  onEdit,
  onMove,
  onDelete,
  overlay = false,
}: { job: Job; today: string | null; overlay?: boolean } & Partial<CardHandlers>) {
  const workMode = WORK_MODES.find((m) => m.id === job.work_mode)
  // Reminders only show once the browser knows today's date (avoids a
  // mismatch between the server's timezone and the person's).
  const followUpDays = today && job.follow_up_on ? daysBetween(today, job.follow_up_on) : null
  const upcoming = today ? nextInterview(job.interviews ?? [], today) : undefined
  const closed = job.status === "offer" || job.status === "rejected"

  return (
    <article
      onClick={() => onOpen?.(job)}
      className={cn(
        "group/card relative cursor-grab rounded-lg border bg-card p-3 text-card-foreground shadow-xs transition-[box-shadow,border-color] select-none hover:border-foreground/15 hover:shadow-sm active:cursor-grabbing",
        overlay && "rotate-2 cursor-grabbing border-foreground/15 shadow-lg ring-1 ring-foreground/5"
      )}
    >
      <div className="flex items-start gap-2.5">
        <CompanyBadge company={job.company} />
        <div className="min-w-0 flex-1 pr-6">
          <h3 className="line-clamp-2 text-sm leading-snug font-medium">{job.title}</h3>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="truncate">{job.company}</span>
            <PriorityStars value={job.priority} size="xs" />
          </p>
        </div>
      </div>

      {(job.location || job.url) && (
        <div className="mt-2.5 flex items-center gap-3 text-xs text-muted-foreground">
          {job.location && (
            <span className="inline-flex min-w-0 items-center gap-1">
              <MapPin className="size-3 shrink-0" />
              <span className="truncate">{job.location}</span>
            </span>
          )}
          {job.url && (
            <a
              href={job.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              className="ml-auto inline-flex shrink-0 items-center gap-1 rounded hover:text-foreground"
            >
              <ExternalLink className="size-3" />
              Posting
            </a>
          )}
        </div>
      )}

      {(workMode || job.salary) && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
          {workMode && (
            <span className={cn("rounded-md px-1.5 py-0.5 font-medium", WORK_MODE_STYLES[workMode.id])}>{workMode.label}</span>
          )}
          {job.salary && (
            <span className="inline-flex min-w-0 items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-muted-foreground">
              <Banknote className="size-3 shrink-0" />
              <span className="truncate">{job.salary}</span>
            </span>
          )}
        </div>
      )}

      {(upcoming || (followUpDays !== null && !closed)) && (
        <div className="mt-2 flex flex-col gap-1 text-[11px]">
          {upcoming && today && (
            <span className="inline-flex items-center gap-1 font-medium text-violet-700 dark:text-violet-300">
              <CalendarClock className="size-3 shrink-0" />
              {upcoming.label} · {daysBetween(today, upcoming.date) <= 1 ? relativeDay(today, upcoming.date) : formatDate(upcoming.date)}
              {upcoming.time && ` ${formatTime(upcoming.time)}`}
            </span>
          )}
          {followUpDays !== null && !closed && job.follow_up_on && (
            <span
              className={cn(
                "inline-flex items-center gap-1",
                followUpDays < 0 && "font-medium text-rose-600 dark:text-rose-400",
                followUpDays === 0 && "font-medium text-amber-700 dark:text-amber-400",
                followUpDays > 0 && "text-muted-foreground"
              )}
            >
              <BellRing className="size-3 shrink-0" />
              {followUpDays < 0
                ? `Follow-up overdue (${relativeDay(today!, job.follow_up_on)})`
                : followUpDays === 0
                  ? "Follow up today"
                  : `Follow up ${formatDate(job.follow_up_on)}`}
            </span>
          )}
        </div>
      )}

      <p className="mt-2.5 text-[11px] text-muted-foreground/80" suppressHydrationWarning>
        {job.applied_on ? `Applied ${formatDate(job.applied_on)}` : `Added ${formatDate(job.created_at)}`}
      </p>

      {!overlay && onOpen && onEdit && onMove && onDelete && (
        <CardMenu job={job} onOpen={onOpen} onEdit={onEdit} onMove={onMove} onDelete={onDelete} />
      )}
    </article>
  )
}

function CardMenu({ job, onOpen, onEdit, onMove, onDelete }: { job: Job } & CardHandlers) {
  // Stop clicks and key presses here from also opening or dragging the card.
  const stop = (e: React.SyntheticEvent) => e.stopPropagation()

  return (
    <div className="absolute top-2 right-2" onClick={stop} onPointerDown={stop} onKeyDown={stop}>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Actions for ${job.title}`}
              className="text-muted-foreground opacity-100 data-popup-open:opacity-100 sm:opacity-0 sm:group-hover/card:opacity-100 sm:focus-visible:opacity-100"
            />
          }
        >
          <MoreHorizontal />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => onOpen(job)}>
            <PanelRightOpen /> Open
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onEdit(job)}>
            <Pencil /> Edit info
          </DropdownMenuItem>
          {job.url && (
            <DropdownMenuItem render={<a href={job.url} target="_blank" rel="noopener noreferrer" />}>
              <ExternalLink /> Open job posting
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuLabel>Move to</DropdownMenuLabel>
            {COLUMNS.filter((c) => c.id !== job.status).map((c) => (
              <DropdownMenuItem key={c.id} onClick={() => onMove(job, c.id)}>
                <span className="inline-flex size-4 items-center justify-center">
                  <span className={cn("size-2 rounded-full", c.dot)} />
                </span>
                {c.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={() => onDelete(job)}>
            <Trash2 /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

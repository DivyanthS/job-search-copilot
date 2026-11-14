"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { ExternalLink, MapPin, MoreHorizontal, Pencil, Trash2 } from "lucide-react"
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
import type { Job } from "@/lib/jobs"
import { cn } from "@/lib/utils"

export type CardHandlers = {
  onOpen: (job: Job) => void
  onMove: (job: Job, status: ColumnId) => void
  onDelete: (job: Job) => void
}

// The card as it sits in a column, wired up for drag and drop.
export function SortableJobCard({ job, ...handlers }: { job: Job } & CardHandlers) {
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
      <JobCard job={job} {...handlers} />
    </div>
  )
}

// What a card looks like. Also used for the floating copy while dragging.
export function JobCard({
  job,
  onOpen,
  onMove,
  onDelete,
  overlay = false,
}: { job: Job; overlay?: boolean } & Partial<CardHandlers>) {
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
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{job.company}</p>
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

      <p className="mt-2.5 text-[11px] text-muted-foreground/80" suppressHydrationWarning>
        {job.applied_on ? `Applied ${formatDate(job.applied_on)}` : `Added ${formatDate(job.created_at)}`}
      </p>

      {!overlay && onMove && onDelete && onOpen && (
        <CardMenu job={job} onOpen={onOpen} onMove={onMove} onDelete={onDelete} />
      )}
    </article>
  )
}

function CardMenu({ job, onOpen, onMove, onDelete }: { job: Job } & CardHandlers) {
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
            <Pencil /> Edit
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

const BADGE_COLORS = [
  "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300",
  "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  "bg-teal-500/15 text-teal-700 dark:text-teal-300",
]

function CompanyBadge({ company }: { company: string }) {
  let hash = 0
  for (const ch of company.toLowerCase()) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-md text-sm font-semibold",
        BADGE_COLORS[hash % BADGE_COLORS.length]
      )}
    >
      {company.trim()[0]?.toUpperCase() ?? "?"}
    </span>
  )
}

function formatDate(value: string) {
  // Plain dates (YYYY-MM-DD) are shown as-is, without timezone shifting.
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date(value)
  const sameYear = date.getFullYear() === new Date().getFullYear()
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  })
}

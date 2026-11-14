"use client"

import { useDroppable } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { Inbox, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { COLUMNS } from "@/lib/columns"
import type { Job } from "@/lib/jobs"
import { cn } from "@/lib/utils"
import { SortableJobCard, type CardHandlers } from "./job-card"

export function BoardColumn({
  column,
  jobs,
  onAdd,
  isFirstRun,
  ...handlers
}: {
  column: (typeof COLUMNS)[number]
  jobs: Job[]
  onAdd: () => void
  isFirstRun: boolean
} & CardHandlers) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id, data: { type: "column" } })

  return (
    <section
      aria-label={column.label}
      className="flex max-h-full w-[80vw] max-w-80 min-w-64 shrink-0 snap-start flex-col rounded-xl border bg-muted/50 dark:bg-card/40 sm:w-72"
    >
      <header className="flex items-center gap-2 py-2 pr-1.5 pl-3">
        <span className={cn("size-2 rounded-full", column.dot)} />
        <h2 className="text-sm font-medium">{column.label}</h2>
        <span className="rounded-md bg-background px-1.5 py-0.5 text-xs text-muted-foreground tabular-nums dark:bg-muted">
          {jobs.length}
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          className="ml-auto text-muted-foreground"
          onClick={onAdd}
          aria-label={`Add a job to ${column.label}`}
        >
          <Plus />
        </Button>
      </header>

      <div
        ref={setNodeRef}
        className={cn(
          "mx-2 mb-2 flex min-h-32 flex-1 flex-col gap-2 overflow-y-auto rounded-lg p-0.5 transition-colors",
          isOver && "bg-foreground/[0.03] ring-1 ring-foreground/10 ring-inset"
        )}
      >
        <SortableContext items={jobs.map((j) => j.id)} strategy={verticalListSortingStrategy}>
          {jobs.map((job) => (
            <SortableJobCard key={job.id} job={job} {...handlers} />
          ))}
        </SortableContext>

        {jobs.length === 0 && (
          <button
            type="button"
            onClick={onAdd}
            className="flex flex-1 flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed px-4 py-6 text-center text-xs text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground"
          >
            {isFirstRun && column.id === "wishlist" ? (
              <>
                <Inbox className="size-5 opacity-60" />
                <span>
                  Save your first job here.
                  <br />
                  Click to add one.
                </span>
              </>
            ) : (
              "Drop a card here"
            )}
          </button>
        )}
      </div>
    </section>
  )
}

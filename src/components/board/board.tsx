"use client"

import { useCallback, useMemo, useRef, useState, useSyncExternalStore } from "react"
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core"
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable"
import { Plus } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { COLUMNS, type ColumnId } from "@/lib/columns"
import { JobPanel } from "@/components/job-panel/job-panel"
import {
  isColumnId,
  localToday,
  positionBetween,
  toBoardJob,
  topPosition,
  type BoardActions,
  type Job,
  type JobDetails,
} from "@/lib/jobs"
import { BoardColumn } from "./board-column"
import { DeleteJobDialog } from "./delete-job-dialog"
import { DueStrip } from "./due-strip"
import { JobCard } from "./job-card"
import { JobDialog, type JobDialogState } from "./job-dialog"

type Grouped = Record<ColumnId, Job[]>

// Today's date in the person's timezone. It's null during server rendering
// (the server can't know the timezone) and is re-checked every minute so the
// board rolls over at midnight.
function subscribeToClock(onChange: () => void) {
  const timer = setInterval(onChange, 60_000)
  return () => clearInterval(timer)
}
function useToday() {
  return useSyncExternalStore(subscribeToClock, localToday, () => null)
}


function groupJobs(jobs: Job[]): Grouped {
  const grouped = Object.fromEntries(COLUMNS.map((c) => [c.id, [] as Job[]])) as Grouped
  for (const job of jobs) grouped[job.status]?.push(job)
  for (const col of COLUMNS) grouped[col.id].sort((a, b) => a.position - b.position)
  return grouped
}

export function Board({ initialJobs, actions }: { initialJobs: Job[]; actions: BoardActions }) {
  const [jobs, setJobs] = useState(initialJobs)
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null)
  const [dialog, setDialog] = useState<JobDialogState>(null)
  const [deleting, setDeleting] = useState<Job | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const today = useToday()
  // The board as it was when a drag started, to undo if saving fails.
  const beforeDrag = useRef<Job[] | null>(null)

  const columns = useMemo(() => groupJobs(jobs), [jobs])
  const activeJob = activeId ? jobs.find((j) => j.id === activeId) ?? null : null
  const openJob = openId ? jobs.find((j) => j.id === openId) ?? null : null

  const sensors = useSensors(
    // Mouse: start dragging after moving 5px, so a plain click still opens the card.
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    // Touch: press and hold briefly, so swiping still scrolls the board.
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function columnOf(id: UniqueIdentifier): ColumnId | null {
    if (isColumnId(id)) return id
    return jobs.find((j) => j.id === id)?.status ?? null
  }

  function replaceJob(updated: Job) {
    setJobs((prev) => prev.map((j) => (j.id === updated.id ? updated : j)))
  }

  // ------------------------------------------------------------------ drag
  function handleDragStart({ active }: DragStartEvent) {
    beforeDrag.current = jobs
    setActiveId(active.id)
  }

  // While dragging over a different column, move the card there right away
  // so the other cards make room for it.
  function handleDragOver({ active, over }: DragOverEvent) {
    if (!over) return
    const from = columnOf(active.id)
    const to = columnOf(over.id)
    if (!from || !to || from === to) return

    const target = columns[to].filter((j) => j.id !== active.id)
    let index = target.length
    if (!isColumnId(over.id)) {
      const overIndex = target.findIndex((j) => j.id === over.id)
      // Compare the middles of the dragged card and the card it's over.
      const dragged = active.rect.current.translated
      const draggedMiddle = dragged ? dragged.top + dragged.height / 2 : 0
      const below = draggedMiddle > over.rect.top + over.rect.height / 2
      index = overIndex === -1 ? target.length : overIndex + (below ? 1 : 0)
    }
    const position = positionBetween(target[index - 1]?.position, target[index]?.position)
    setJobs((prev) => prev.map((j) => (j.id === active.id ? { ...j, status: to, position } : j)))
  }

  async function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null)
    const snapshot = beforeDrag.current
    beforeDrag.current = null
    if (!snapshot) return
    if (!over) {
      setJobs(snapshot)
      return
    }

    const to = columnOf(over.id)
    const moving = jobs.find((j) => j.id === active.id)
    if (!to || !moving) return

    // Work out the card's final place within its column.
    const ids = columns[to].map((j) => j.id)
    const oldIndex = ids.indexOf(moving.id)
    const newIndex = isColumnId(over.id) ? ids.length - 1 : ids.indexOf(String(over.id))
    let position = moving.position
    if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
      const ordered = arrayMove(columns[to], oldIndex, newIndex)
      position = positionBetween(ordered[newIndex - 1]?.position, ordered[newIndex + 1]?.position)
    }

    const original = snapshot.find((j) => j.id === moving.id)
    if (original && original.status === to && original.position === position) {
      setJobs(snapshot) // dropped back where it started
      return
    }

    setJobs((prev) => prev.map((j) => (j.id === moving.id ? { ...j, status: to, position } : j)))
    const result = await actions.moveJob(moving.id, to, position, localToday())
    if (result.ok) {
      replaceJob(result.data)
    } else {
      setJobs(snapshot)
      toast.error(result.error)
    }
  }

  function handleDragCancel() {
    if (beforeDrag.current) setJobs(beforeDrag.current)
    beforeDrag.current = null
    setActiveId(null)
  }

  // ------------------------------------------------------- card actions
  async function moveFromMenu(job: Job, to: ColumnId) {
    const before = jobs
    const position = topPosition(columns[to])
    setJobs((prev) => prev.map((j) => (j.id === job.id ? { ...j, status: to, position } : j)))
    const result = await actions.moveJob(job.id, to, position, localToday())
    if (result.ok) {
      replaceJob(result.data)
      toast.success(`Moved to ${COLUMNS.find((c) => c.id === to)?.label}`)
    } else {
      setJobs(before)
      toast.error(result.error)
    }
  }

  async function confirmDelete(job: Job) {
    const result = await actions.deleteJob(job.id)
    if (!result.ok) return result.error
    setJobs((prev) => prev.filter((j) => j.id !== job.id))
    setDeleting(null)
    toast.success("Job deleted")
    return null
  }

  function handleSaved(saved: Job, mode: "add" | "edit") {
    setJobs((prev) => (mode === "add" ? [...prev, saved] : prev.map((j) => (j.id === saved.id ? saved : j))))
    setDialog(null)
    toast.success(mode === "add" ? "Job added" : "Changes saved")
  }

  // The panel saved a change: update the card, keeping the board's own
  // column and position (a drag may have happened since).
  const handleDetailsChange = useCallback((details: JobDetails) => {
    setJobs((prev) =>
      prev.map((j) => (j.id === details.id ? { ...toBoardJob(details), status: j.status, position: j.position } : j))
    )
  }, [])

  async function changeFollowUp(job: Job, date: string | null) {
    const before = job.follow_up_on
    setJobs((prev) => prev.map((j) => (j.id === job.id ? { ...j, follow_up_on: date } : j)))
    const result = await actions.updateJobDetails(job.id, { follow_up_on: date })
    if (!result.ok) {
      setJobs((prev) => prev.map((j) => (j.id === job.id ? { ...j, follow_up_on: before } : j)))
      toast.error(result.error)
    } else if (date === null) {
      toast.success(`Follow-up with ${job.company} done`)
    }
  }

  const handlers = {
    onOpen: (job: Job) => setOpenId(job.id),
    onEdit: (job: Job) => setDialog({ mode: "edit", job }),
    onMove: moveFromMenu,
    onDelete: (job: Job) => setDeleting(job),
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Pipeline</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {jobs.length === 0
              ? "Add the jobs you're interested in, then drag them along as you progress."
              : `${jobs.length} ${jobs.length === 1 ? "job" : "jobs"} · drag a card to move it`}
          </p>
        </div>
        <Button size="lg" onClick={() => setDialog({ mode: "add", status: "wishlist" })}>
          <Plus /> Add job
        </Button>
      </div>

      {today && (
        <DueStrip jobs={jobs} today={today} onOpen={handlers.onOpen} onFollowUpChange={changeFollowUp} />
      )}

      <DndContext
        id="pipeline-board"
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
        accessibility={{
          screenReaderInstructions: {
            draggable:
              "To pick up a job card, press space or enter. Use the arrow keys to move it, space or enter to drop it, or escape to cancel.",
          },
        }}
      >
        <div className="-mx-4 flex min-h-0 flex-1 snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:snap-none sm:px-6">
          {COLUMNS.map((col) => (
            <BoardColumn
              key={col.id}
              column={col}
              jobs={columns[col.id]}
              isFirstRun={jobs.length === 0}
              today={today}
              onAdd={() => setDialog({ mode: "add", status: col.id })}
              {...handlers}
            />
          ))}
        </div>

        <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.2, 0, 0, 1)" }}>
          {activeJob ? <JobCard job={activeJob} today={today} overlay /> : null}
        </DragOverlay>
      </DndContext>

      <JobDialog state={dialog} onClose={() => setDialog(null)} onSaved={handleSaved} actions={actions} />
      <DeleteJobDialog job={deleting} onCancel={() => setDeleting(null)} onConfirm={confirmDelete} />
      <JobPanel
        job={openJob}
        today={today ?? localToday()}
        actions={actions}
        onClose={() => setOpenId(null)}
        onDetailsChange={handleDetailsChange}
        onEdit={handlers.onEdit}
        onMove={moveFromMenu}
        onDelete={handlers.onDelete}
      />
    </div>
  )
}

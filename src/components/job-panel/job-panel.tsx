"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Banknote, ClipboardList, ExternalLink, Loader2, MapPin, Pencil, RotateCw, Sparkles, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { KitTab } from "@/components/kit/kit-tab"
import { CompanyBadge, PriorityStars, WORK_MODE_STYLES, formatDate } from "@/components/board/job-meta"
import { COLUMNS, type ColumnId } from "@/lib/columns"
import { WORK_MODES, type BoardActions, type DetailsPatch, type Job, type JobDetails } from "@/lib/jobs"
import { cn } from "@/lib/utils"
import { ContactsSection } from "./contacts-section"
import { DescriptionSection } from "./description-section"
import { InterviewsSection } from "./interviews-section"
import { NotesSection } from "./notes-section"
import { ReminderSection } from "./reminder-section"

const COLUMN_ITEMS = COLUMNS.map((c) => ({ value: c.id, label: c.label }))

type PanelProps = {
  job: Job | null
  today: string
  actions: BoardActions
  onClose: () => void
  // Called with the latest saved (or optimistic) version of the job.
  onDetailsChange: (details: JobDetails) => void
  onEdit: (job: Job) => void
  onMove: (job: Job, status: ColumnId) => void
  onDelete: (job: Job) => void
}

export function JobPanel({ job, onClose, ...rest }: PanelProps) {
  // Keep showing the last job while the panel slides closed.
  const [shown, setShown] = useState(job)
  if (job && job !== shown) setShown(job)

  return (
    <Sheet open={job !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="gap-0 overflow-y-auto p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-xl"
      >
        {shown && <PanelBody key={shown.id} job={shown} onClose={onClose} {...rest} />}
      </SheetContent>
    </Sheet>
  )
}

function PanelBody({ job, today, actions, onDetailsChange, onEdit, onMove, onDelete }: PanelProps & { job: Job }) {
  const [details, setDetails] = useState<JobDetails | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [tab, setTab] = useState<"details" | "kit">("details")
  const latestSave = useRef(0)

  useEffect(() => {
    let cancelled = false
    actions
      .getJobDetails(job.id)
      .then((result) => {
        if (cancelled) return
        if (result.ok) setDetails(result.data)
        else setLoadError(result.error)
      })
      .catch(() => !cancelled && setLoadError("Couldn't load this job. Check your connection."))
    return () => {
      cancelled = true
    }
  }, [actions, job.id, attempt])

  // Board fields (title, column, dates…) come from the board's copy, which is
  // always current; the rest comes from the loaded details.
  const view = useMemo<JobDetails | null>(() => (details ? { ...details, ...job } : null), [details, job])

  const save = useCallback(
    async (patch: DetailsPatch) => {
      if (!view) return false
      const before = view
      const optimistic = { ...view, ...patch } as JobDetails
      const seq = ++latestSave.current
      setDetails(optimistic)
      onDetailsChange(optimistic)

      try {
        const result = await actions.updateJobDetails(job.id, patch)
        if (result.ok) {
          // Ignore replies to older saves; a newer one is on its way.
          if (seq === latestSave.current) {
            setDetails(result.data)
            onDetailsChange(result.data)
          }
          return true
        }
        toast.error(result.error)
      } catch {
        toast.error("Couldn't save your change. Check your connection and try again.")
      }
      if (seq === latestSave.current) {
        setDetails(before)
        onDetailsChange(before)
      }
      return false
    },
    [actions, job.id, onDetailsChange, view]
  )

  const workMode = WORK_MODES.find((m) => m.id === job.work_mode)

  return (
    <div className="flex min-h-full flex-col">
      {/* Header */}
      <div className="space-y-3 px-5 pt-5 pb-4">
        <div className="flex items-start gap-3 pr-8">
          <CompanyBadge company={job.company} className="size-10 text-base" />
          <div className="min-w-0 flex-1">
            <SheetTitle className="text-lg leading-snug font-semibold">{job.title}</SheetTitle>
            <SheetDescription>{job.company}</SheetDescription>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select items={COLUMN_ITEMS} value={job.status} onValueChange={(v) => v && v !== job.status && onMove(job, v as ColumnId)}>
            <SelectTrigger size="sm" aria-label="Column">
              <span className={cn("size-2 rounded-full", COLUMNS.find((c) => c.id === job.status)?.dot)} />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COLUMNS.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  <span className={cn("size-2 shrink-0 self-center rounded-full", c.dot)} />
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <PriorityStars value={job.priority} onChange={view ? (priority) => save({ priority }) : undefined} />
          <Button size="sm" variant="outline" className="ml-auto" onClick={() => onEdit(job)}>
            <Pencil /> Edit info
          </Button>
        </div>

        {(job.location || workMode || job.salary || job.url) && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
            {job.location && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3.5" /> {job.location}
              </span>
            )}
            {workMode && (
              <span className={cn("rounded-md px-1.5 py-0.5 font-medium", WORK_MODE_STYLES[workMode.id])}>{workMode.label}</span>
            )}
            {job.salary && (
              <span className="inline-flex items-center gap-1">
                <Banknote className="size-3.5" /> {job.salary}
              </span>
            )}
            {job.url && (
              <a href={job.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-foreground hover:underline">
                <ExternalLink className="size-3.5" /> Job posting
              </a>
            )}
          </div>
        )}
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as "details" | "kit")} className="gap-0">
        <TabsList variant="line" className="w-full justify-start gap-4 rounded-none border-b px-5">
          <TabsTrigger value="details" className="flex-none px-0">
            <ClipboardList /> Details
          </TabsTrigger>
          <TabsTrigger value="kit" className="flex-none px-0">
            <Sparkles /> Application kit
          </TabsTrigger>
        </TabsList>

        <TabsContent value="kit">
          <KitTab job={job} actions={actions} />
        </TabsContent>

        <TabsContent value="details" className="[&>section:first-child]:border-t-0">
          {view ? (
            <>
              <ReminderSection job={view} today={today} save={save} />
              <InterviewsSection job={view} today={today} save={save} />
              <ContactsSection job={view} save={save} />
              <NotesSection initial={view.notes} save={save} />
              <DescriptionSection description={view.description} save={save} />
            </>
          ) : loadError ? (
            <div className="px-5 py-10 text-center">
              <p className="text-sm text-muted-foreground">{loadError}</p>
              <Button
                size="sm"
                variant="outline"
                className="mt-3"
                onClick={() => {
                  setLoadError(null)
                  setAttempt((n) => n + 1)
                }}
              >
                <RotateCw /> Try again
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 px-5 py-10 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Loading details…
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Footer */}
      <div className="mt-auto flex items-center justify-between gap-3 border-t px-5 py-3 text-xs text-muted-foreground">
        <span suppressHydrationWarning>Added {formatDate(job.created_at)}</span>
        <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => onDelete(job)}>
          <Trash2 /> Delete job
        </Button>
      </div>
    </div>
  )
}

"use client"

import { useState, useTransition } from "react"
import { ArrowLeft, CheckCircle2, FileText, Link2, Loader2, PenLine, Sparkles, TriangleAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { COLUMNS, type ColumnId } from "@/lib/columns"
import {
  WORK_MODES,
  localToday,
  normalizeUrl,
  validateJobInput,
  type BoardActions,
  type ExtractOutcome,
  type Job,
  type JobInput,
  type WorkMode,
} from "@/lib/jobs"
import { cn } from "@/lib/utils"

export type JobDialogState = { mode: "add"; status: ColumnId } | { mode: "edit"; job: Job } | null

const COLUMN_ITEMS = COLUMNS.map((c) => ({ value: c.id, label: c.label }))
const WORK_MODE_ITEMS = [{ value: "none", label: "Not specified" }, ...WORK_MODES.map((m) => ({ value: m.id, label: m.label }))]

export function JobDialog({
  state,
  onClose,
  onSaved,
  actions,
}: {
  state: JobDialogState
  onClose: () => void
  onSaved: (job: Job, mode: "add" | "edit") => void
  actions: BoardActions
}) {
  // Keep showing the last content while the dialog animates closed.
  const [shown, setShown] = useState(state)
  if (state && state !== shown) setShown(state)

  return (
    <Dialog open={state !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        {shown && (
          <JobForm
            key={shown.mode === "edit" ? shown.job.id : `add-${shown.status}`}
            state={shown}
            onSaved={onSaved}
            onCancel={onClose}
            actions={actions}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

type Note = { tone: "success" | "warning"; text: string } | null
type SourceTab = "link" | "text" | "manual"

function JobForm({
  state,
  onSaved,
  onCancel,
  actions,
}: {
  state: NonNullable<JobDialogState>
  onSaved: (job: Job, mode: "add" | "edit") => void
  onCancel: () => void
  actions: BoardActions
}) {
  const job = state.mode === "edit" ? state.job : null
  const [step, setStep] = useState<"source" | "review">(job ? "review" : "source")
  const [tab, setTab] = useState<SourceTab>("link")
  const [link, setLink] = useState("")
  const [pasted, setPasted] = useState("")
  const [textNotice, setTextNotice] = useState<string | null>(null)
  const [note, setNote] = useState<Note>(null)
  const [values, setValues] = useState<JobInput>({
    title: job?.title ?? "",
    company: job?.company ?? "",
    url: job?.url ?? "",
    location: job?.location ?? "",
    salary: job?.salary ?? "",
    work_mode: job?.work_mode ?? "",
    status: job?.status ?? (state.mode === "add" ? state.status : "wishlist"),
  })
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const set = (field: keyof JobInput) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setValues((v) => ({ ...v, [field]: e.target.value }))
    setError(null)
  }

  // ------------------------------------------------------------ reading
  function applyOutcome(outcome: ExtractOutcome, url: string, sourceText?: string) {
    if (outcome.ok) {
      setValues((v) => ({ ...v, ...outcome.data, url: url || v.url }))
      setNote(
        outcome.partial
          ? { tone: "warning", text: "We filled in what we could find. Please add the missing details." }
          : { tone: "success", text: "Filled in from the posting. Check everything looks right." }
      )
      setStep("review")
      return
    }
    switch (outcome.reason) {
      case "blocked":
      case "not_job":
        if (sourceText === undefined) {
          // Couldn't read the link: keep it, and ask for the text instead.
          setValues((v) => ({ ...v, url }))
          setTextNotice(outcome.error)
          setTab("text")
        } else {
          setError(outcome.error)
        }
        return
      case "ai_unavailable":
        setValues((v) => ({ ...v, ...outcome.data, url: url || v.url, description: outcome.data?.description ?? sourceText }))
        setNote({ tone: "warning", text: outcome.error })
        setStep("review")
        return
      default:
        setError(outcome.error)
    }
  }

  function readLink() {
    const checked = normalizeUrl(link)
    if (!link.trim() || "error" in checked) {
      setError("error" in checked && link.trim() ? checked.error : "Paste the link to the job posting.")
      return
    }
    setError(null)
    startTransition(async () => {
      try {
        applyOutcome(await actions.extractFromUrl(checked.url), checked.url)
      } catch {
        setError("Something went wrong. Check your connection and try again.")
      }
    })
  }

  function readText() {
    if (pasted.trim().length < 80) {
      setError("Paste the full job description (at least a few sentences).")
      return
    }
    setError(null)
    startTransition(async () => {
      try {
        applyOutcome(await actions.extractFromText(pasted), values.url, pasted)
      } catch {
        setError("Something went wrong. Check your connection and try again.")
      }
    })
  }

  // ------------------------------------------------------------- saving
  function save() {
    const checked = validateJobInput(values)
    if ("error" in checked) {
      setError(checked.error)
      return
    }
    setError(null)
    startTransition(async () => {
      try {
        const result = job
          ? await actions.updateJob(job.id, values, localToday())
          : await actions.createJob(values, localToday())
        if (result.ok) onSaved(result.data, job ? "edit" : "add")
        else setError(result.error)
      } catch {
        setError("Couldn't save. Check your connection and try again.")
      }
    })
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (step === "review") return save()
    if (tab === "link") return readLink()
    if (tab === "text") return readText()
    setStep("review")
  }

  const errorBox = error && (
    <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
      {error}
    </p>
  )

  // ----------------------------------------------------- step 1: source
  if (step === "source") {
    return (
      <form onSubmit={submit} className="grid gap-4" noValidate>
        <DialogHeader>
          <DialogTitle>Add a job</DialogTitle>
          <DialogDescription>Paste a link or the job description, and we&apos;ll fill in the details for you.</DialogDescription>
        </DialogHeader>

        <Tabs
          value={tab}
          onValueChange={(v) => {
            setTab(v as SourceTab)
            setError(null)
          }}
          className="gap-3"
        >
          <TabsList className="w-full">
            <TabsTrigger value="link" disabled={pending}>
              <Link2 /> Link
            </TabsTrigger>
            <TabsTrigger value="text" disabled={pending}>
              <FileText /> Paste text
            </TabsTrigger>
            <TabsTrigger value="manual" disabled={pending}>
              <PenLine /> Type it in
            </TabsTrigger>
          </TabsList>

          {errorBox}

          <TabsContent value="link" className="grid gap-1.5">
            <Label htmlFor="job-link">Link to the job posting</Label>
            <Input
              id="job-link"
              type="url"
              inputMode="url"
              placeholder="https://…"
              value={link}
              onChange={(e) => {
                setLink(e.target.value)
                setError(null)
              }}
              disabled={pending}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              Works with most company career pages and job sites like Greenhouse, Lever and Ashby.
            </p>
          </TabsContent>

          <TabsContent value="text" className="grid gap-1.5">
            {textNotice && (
              <p className="flex gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-300">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                <span>{textNotice}</span>
              </p>
            )}
            <Label htmlFor="job-text">Job description</Label>
            <Textarea
              id="job-text"
              rows={8}
              placeholder="Copy everything from the job posting and paste it here…"
              value={pasted}
              onChange={(e) => {
                setPasted(e.target.value)
                setError(null)
              }}
              disabled={pending}
              className="max-h-72 min-h-40 resize-y"
              autoFocus={tab === "text"}
            />
            {values.url && (
              <p className="truncate text-xs text-muted-foreground">
                The link will be saved too: <span className="text-foreground">{values.url}</span>
              </p>
            )}
          </TabsContent>

          <TabsContent value="manual">
            <p className="rounded-lg border border-dashed px-3 py-4 text-center text-sm text-muted-foreground">
              Fill in the job details yourself on the next step.
            </p>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? <Loader2 className="animate-spin" /> : tab === "manual" ? null : <Sparkles />}
            {pending
              ? "Reading the posting…"
              : tab === "link"
                ? "Read job posting"
                : tab === "text"
                  ? "Read job description"
                  : "Continue"}
          </Button>
        </DialogFooter>
      </form>
    )
  }

  // ----------------------------------------------------- step 2: review
  const descriptionWords = values.description ? values.description.split(/\s+/).filter(Boolean).length : 0

  return (
    <form onSubmit={submit} className="grid gap-4" noValidate>
      <DialogHeader>
        <DialogTitle>{job ? "Edit job" : "Check the details"}</DialogTitle>
        <DialogDescription>
          {job ? "Update the details for this job." : "Make any changes, then add the job to your board."}
        </DialogDescription>
      </DialogHeader>

      {note && (
        <p
          className={cn(
            "flex gap-2 rounded-lg border px-3 py-2 text-sm",
            note.tone === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
              : "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300"
          )}
        >
          {note.tone === "success" ? <CheckCircle2 className="mt-0.5 size-4 shrink-0" /> : <TriangleAlert className="mt-0.5 size-4 shrink-0" />}
          <span>{note.text}</span>
        </p>
      )}
      {errorBox}

      <div className="grid gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field id="job-title" label="Job title" required>
            <Input id="job-title" value={values.title} onChange={set("title")} placeholder="e.g. Marketing Coordinator" autoFocus={!job && !values.title} maxLength={200} />
          </Field>
          <Field id="job-company" label="Company" required>
            <Input id="job-company" value={values.company} onChange={set("company")} placeholder="e.g. Acme Inc." maxLength={200} />
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field id="job-location" label="Location" optional>
            <Input id="job-location" value={values.location} onChange={set("location")} placeholder="e.g. London, UK" maxLength={200} />
          </Field>
          <Field id="job-mode" label="Work style" optional>
            <Select
              items={WORK_MODE_ITEMS}
              value={values.work_mode || "none"}
              onValueChange={(v) => setValues((s) => ({ ...s, work_mode: v === "none" || !v ? "" : (v as WorkMode) }))}
            >
              <SelectTrigger id="job-mode" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WORK_MODE_ITEMS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field id="job-salary" label="Salary" optional>
            <Input id="job-salary" value={values.salary} onChange={set("salary")} placeholder="e.g. $60K–$70K / year" maxLength={200} />
          </Field>
          <Field id="job-status" label="Column">
            <Select
              items={COLUMN_ITEMS}
              value={values.status}
              onValueChange={(v) => v && setValues((s) => ({ ...s, status: v as ColumnId }))}
            >
              <SelectTrigger id="job-status" className="w-full">
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
          </Field>
        </div>
        <Field id="job-url" label="Link to job posting" optional>
          <Input id="job-url" type="url" inputMode="url" value={values.url} onChange={set("url")} placeholder="https://…" />
        </Field>

        {descriptionWords > 0 && (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <FileText className="size-3.5 shrink-0" />
            Job description saved ({descriptionWords.toLocaleString()} words). It&apos;s used later to tailor your application kit.
          </p>
        )}
      </div>

      <DialogFooter className="sm:justify-between">
        {!job ? (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setStep("source")
              setNote(null)
              setError(null)
            }}
            disabled={pending}
          >
            <ArrowLeft /> Back
          </Button>
        ) : (
          <span className="hidden sm:block" />
        )}
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <Button type="button" variant="outline" onClick={onCancel} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="animate-spin" />}
            {job ? "Save changes" : "Add job"}
          </Button>
        </div>
      </DialogFooter>
    </form>
  )
}

function Field({
  id,
  label,
  required,
  optional,
  children,
}: {
  id: string
  label: string
  required?: boolean
  optional?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>
        {label}
        {required && <span className="text-destructive">*</span>}
        {optional && <span className="font-normal text-muted-foreground">(optional)</span>}
      </Label>
      {children}
    </div>
  )
}

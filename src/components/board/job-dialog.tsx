"use client"

import { useState, useTransition } from "react"
import { Loader2 } from "lucide-react"
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
import { COLUMNS, type ColumnId } from "@/lib/columns"
import { localToday, validateJobInput, type BoardActions, type Job, type JobInput } from "@/lib/jobs"
import { cn } from "@/lib/utils"

export type JobDialogState = { mode: "add"; status: ColumnId } | { mode: "edit"; job: Job } | null

const COLUMN_ITEMS = COLUMNS.map((c) => ({ value: c.id, label: c.label }))

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
      <DialogContent className="sm:max-w-md">
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
  const [values, setValues] = useState<JobInput>({
    title: job?.title ?? "",
    company: job?.company ?? "",
    url: job?.url ?? "",
    location: job?.location ?? "",
    status: job?.status ?? (state.mode === "add" ? state.status : "wishlist"),
  })
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const set = (field: keyof JobInput) => (e: React.ChangeEvent<HTMLInputElement>) =>
  {
    setValues((v) => ({ ...v, [field]: e.target.value }))
    setError(null)
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const checked = validateJobInput(values)
    if ("error" in checked) {
      setError(checked.error)
      return
    }
    setError(null)
    startTransition(async () => {
      const result = job
        ? await actions.updateJob(job.id, values, localToday())
        : await actions.createJob(values, localToday())
      if (result.ok) onSaved(result.data, job ? "edit" : "add")
      else setError(result.error)
    })
  }

  return (
    <form onSubmit={submit} className="grid gap-4" noValidate>
      <DialogHeader>
        <DialogTitle>{job ? "Edit job" : "Add a job"}</DialogTitle>
        <DialogDescription>
          {job
            ? "Update the details for this job."
            : "Add the basics now. You can fill in more details later."}
        </DialogDescription>
      </DialogHeader>

      {error && (
        <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="grid gap-3">
        <Field id="job-title" label="Job title" required>
          <Input id="job-title" value={values.title} onChange={set("title")} placeholder="e.g. Marketing Coordinator" autoFocus={!job} maxLength={200} />
        </Field>
        <Field id="job-company" label="Company" required>
          <Input id="job-company" value={values.company} onChange={set("company")} placeholder="e.g. Acme Inc." maxLength={200} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field id="job-location" label="Location" optional>
            <Input id="job-location" value={values.location} onChange={set("location")} placeholder="e.g. Remote, London" maxLength={200} />
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
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />}
          {job ? "Save changes" : "Add job"}
        </Button>
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

"use client"

import { useRef, useState, useTransition } from "react"
import { ClipboardPaste, Download, FileText, FileUp, Loader2, RefreshCw, Trash2, Upload } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Textarea } from "@/components/ui/textarea"
import { formatDate } from "@/components/board/job-meta"
import {
  MAX_RESUME_CHARS,
  MIN_RESUME_CHARS,
  RESUME_ACCEPT,
  checkResumeFile,
  formatBytes,
  type Resume,
  type SettingsActions,
} from "@/lib/resume"
import { cn } from "@/lib/utils"
import { SettingsCard } from "./settings-card"

export function ResumeCard({ initial, actions }: { initial: Resume | null; actions: SettingsActions }) {
  const [resume, setResume] = useState(initial)
  const [draft, setDraft] = useState(initial?.content ?? "")
  const [mode, setMode] = useState<"upload" | "paste">("upload")
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<null | "upload" | "save" | "download">(null)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [, startTransition] = useTransition()
  const fileInput = useRef<HTMLInputElement>(null)

  const dirty = resume !== null && draft.trim() !== resume.content
  const words = draft.trim() ? draft.trim().split(/\s+/).length : 0

  function upload(file: File) {
    const problem = checkResumeFile(file)
    if (problem) return setError(problem)
    setError(null)
    setBusy("upload")
    const form = new FormData()
    form.append("file", file)
    startTransition(async () => {
      try {
        const result = await actions.uploadResume(form)
        if (result.ok) {
          setResume(result.data)
          setDraft(result.data.content)
          toast.success("Resume uploaded. Check the text below looks right.")
        } else {
          setError(result.error)
        }
      } catch {
        setError("The upload didn't finish. Check your connection and try again.")
      } finally {
        setBusy(null)
        if (fileInput.current) fileInput.current.value = ""
      }
    })
  }

  function saveText() {
    if (draft.trim().length < MIN_RESUME_CHARS) {
      return setError("That's quite short for a resume. Paste the whole thing, including your experience.")
    }
    setError(null)
    setBusy("save")
    startTransition(async () => {
      try {
        const result = await actions.saveResumeText(draft)
        if (result.ok) {
          setResume(result.data)
          setDraft(result.data.content)
          toast.success("Resume text saved")
        } else {
          setError(result.error)
        }
      } catch {
        setError("Couldn't save. Check your connection and try again.")
      } finally {
        setBusy(null)
      }
    })
  }

  async function download() {
    setBusy("download")
    try {
      const result = await actions.getResumeDownloadUrl()
      if (result.ok) window.location.assign(result.data)
      else toast.error(result.error)
    } finally {
      setBusy(null)
    }
  }

  async function remove() {
    const result = await actions.deleteResume()
    if (!result.ok) return toast.error(result.error)
    setResume(null)
    setDraft("")
    setMode("upload")
    setConfirmRemove(false)
    toast.success("Resume removed")
  }

  const hiddenInput = (
    <input
      ref={fileInput}
      type="file"
      accept={RESUME_ACCEPT}
      className="hidden"
      onChange={(e) => {
        const file = e.target.files?.[0]
        if (file) upload(file)
      }}
    />
  )

  const errorBox = error && (
    <p role="alert" className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
      {error}
    </p>
  )

  // ------------------------------------------------------ no resume yet
  if (!resume) {
    return (
      <SettingsCard
        icon={FileText}
        title="Your resume"
        description="Upload it once. The AI uses it to tailor every application kit."
      >
        {hiddenInput}
        {errorBox}
        {mode === "upload" ? (
          <>
            <div
              onDragOver={(e) => {
                e.preventDefault()
                setDragging(true)
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDragging(false)
                const file = e.dataTransfer.files?.[0]
                if (file) upload(file)
              }}
              className={cn(
                "flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors",
                dragging ? "border-primary/50 bg-primary/5" : "border-border"
              )}
            >
              {busy === "upload" ? (
                <>
                  <Loader2 className="size-8 animate-spin text-muted-foreground" />
                  <p className="font-medium">Reading your resume…</p>
                </>
              ) : (
                <>
                  <span className="inline-flex size-12 items-center justify-center rounded-full bg-muted">
                    <FileUp className="size-5 text-muted-foreground" />
                  </span>
                  <div>
                    <p className="font-medium">Drop your resume here</p>
                    <p className="text-sm text-muted-foreground">PDF or Word (.docx), up to 4 MB</p>
                  </div>
                  <Button onClick={() => fileInput.current?.click()}>
                    <Upload /> Choose file
                  </Button>
                </>
              )}
            </div>
            <Button
              variant="link"
              className="mt-2 h-auto px-0"
              onClick={() => {
                setMode("paste")
                setError(null)
              }}
              disabled={busy !== null}
            >
              <ClipboardPaste /> Or paste your resume as text
            </Button>
          </>
        ) : (
          <div className="space-y-3">
            <Textarea
              aria-label="Resume text"
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value)
                setError(null)
              }}
              maxLength={MAX_RESUME_CHARS}
              placeholder="Paste your whole resume here: contact details, experience, education and skills…"
              className="min-h-72 resize-y"
              autoFocus
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={saveText} disabled={busy !== null}>
                {busy === "save" && <Loader2 className="animate-spin" />}
                Save resume
              </Button>
              <Button variant="ghost" onClick={() => setMode("upload")} disabled={busy !== null}>
                Upload a file instead
              </Button>
            </div>
          </div>
        )}
      </SettingsCard>
    )
  }

  // ------------------------------------------------------ resume saved
  return (
    <SettingsCard
      icon={FileText}
      title="Your resume"
      description="The AI uses this text to tailor every application kit."
    >
      {hiddenInput}
      {errorBox}

      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border bg-muted/40 px-3 py-2.5">
        <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-md bg-background text-[10px] font-semibold uppercase text-muted-foreground ring-1 ring-border">
          {resume.file_type ?? "txt"}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{resume.file_name ?? "Pasted text"}</p>
          <p className="text-xs text-muted-foreground" suppressHydrationWarning>
            {resume.file_size ? `${formatBytes(resume.file_size)} · ` : ""}Updated {formatDate(resume.updated_at)}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {resume.file_name && (
            <Button size="sm" variant="outline" onClick={download} disabled={busy !== null}>
              {busy === "download" ? <Loader2 className="animate-spin" /> : <Download />}
              Download
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => fileInput.current?.click()} disabled={busy !== null}>
            {busy === "upload" ? <Loader2 className="animate-spin" /> : resume.file_name ? <RefreshCw /> : <Upload />}
            {busy === "upload" ? "Reading…" : resume.file_name ? "Replace" : "Upload file"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={() => setConfirmRemove(true)}
            disabled={busy !== null}
          >
            <Trash2 /> Remove
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Resume text</p>
            <p className="text-xs text-muted-foreground">
              Check it reads correctly and fix anything that came out jumbled. Your original file isn&apos;t changed.
            </p>
          </div>
          <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{words.toLocaleString()} words</span>
        </div>
        <Textarea
          aria-label="Resume text"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value)
            setError(null)
          }}
          maxLength={MAX_RESUME_CHARS}
          className="max-h-[70vh] min-h-80 resize-y font-mono text-[13px] leading-relaxed"
          disabled={busy === "upload"}
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={saveText} disabled={!dirty || busy !== null}>
            {busy === "save" && <Loader2 className="animate-spin" />}
            Save changes
          </Button>
          {dirty && (
            <Button variant="ghost" onClick={() => setDraft(resume.content)} disabled={busy !== null}>
              Undo changes
            </Button>
          )}
        </div>
      </div>

      <AlertDialog open={confirmRemove} onOpenChange={setConfirmRemove}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove your resume?</AlertDialogTitle>
            <AlertDialogDescription>
              Your uploaded file and its text will be deleted. You&apos;ll need to upload a resume again before
              generating application kits.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={remove}>
              Remove resume
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SettingsCard>
  )
}

"use client"

import Link from "next/link"
import { useContext, useEffect, useRef, useState } from "react"
import {
  AlertTriangle,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  Copy,
  Download,
  FileText,
  ListChecks,
  Loader2,
  MessageSquareQuote,
  Pencil,
  RefreshCw,
  RotateCw,
  Sparkles,
  XCircle,
} from "lucide-react"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Textarea } from "@/components/ui/textarea"
import { formatDate } from "@/components/board/job-meta"
import type { BoardActions, Job } from "@/lib/jobs"
import {
  KIT_SECTIONS,
  KIT_SECTION_LIMITS,
  missingSections,
  type Kit,
  type KitEvent,
  type KitInfo,
  type KitSectionId,
} from "@/lib/kit"
import { cn } from "@/lib/utils"
import { KitGeneratorContext } from "./kit-client"
import { downloadDocx, downloadPdf, safeFileName, type ExportDoc } from "./kit-export"
import { KitText, toPlainText } from "./kit-text"

const SECTION_ICONS: Record<KitSectionId, React.ComponentType<{ className?: string }>> = {
  cover_letter: FileText,
  resume_bullets: ListChecks,
  interview_questions: MessageSquareQuote,
  company_brief: Building2,
}

const SECTION_BLURBS: Record<KitSectionId, string> = {
  cover_letter: "A tailored cover letter, signed with your name",
  resume_bullets: "Your experience rewritten for this job",
  interview_questions: "Five likely questions, with tips for answering",
  company_brief: "A one-page brief from a live web search",
}

type LiveSection = { text: string; status: "writing" | "done" | "error"; error?: string }

export function KitTab({ job, actions }: { job: Job; actions: BoardActions }) {
  const generate = useContext(KitGeneratorContext)
  const [info, setInfo] = useState<KitInfo | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [live, setLive] = useState<Partial<Record<KitSectionId, LiveSection>> | null>(null)
  const [fatal, setFatal] = useState<string | null>(null)
  const [active, setActive] = useState<KitSectionId>("cover_letter")
  const [confirmRegenerate, setConfirmRegenerate] = useState(false)

  useEffect(() => {
    let cancelled = false
    actions
      .getKitInfo(job.id)
      .then((result) => {
        if (cancelled) return
        if (result.ok) setInfo(result.data)
        else setLoadError(result.error)
      })
      .catch(() => !cancelled && setLoadError("Couldn't load the kit. Check your connection."))
    return () => {
      cancelled = true
    }
  }, [actions, job.id, attempt])

  async function run(retry: boolean) {
    setFatal(null)
    setConfirmRegenerate(false)
    setLive({})
    let finished = false
    await generate(job.id, { retry }, (event: KitEvent) => {
      switch (event.type) {
        case "start":
          setLive(Object.fromEntries(event.sections.map((s) => [s, { text: "", status: "writing" }])))
          break
        case "delta":
          setLive((prev) => ({
            ...prev,
            [event.section]: { text: (prev?.[event.section]?.text ?? "") + event.text, status: "writing" },
          }))
          break
        case "section_done":
          setLive((prev) => ({ ...prev, [event.section]: { text: prev?.[event.section]?.text ?? "", status: "done" } }))
          break
        case "section_error":
          setLive((prev) => ({ ...prev, [event.section]: { text: "", status: "error", error: event.error } }))
          break
        case "done":
          finished = true
          setInfo((prev) => (prev ? { ...prev, kit: event.kit, usage: event.usage } : prev))
          setLive(null)
          {
            const missing = missingSections(event.kit)
            if (missing.length === 0) toast.success("Your application kit is ready")
            else toast.warning("Your kit is ready, but some parts couldn't be written")
            const first = KIT_SECTIONS.find((s) => !missing.includes(s.id))
            if (first) setActive(first.id)
          }
          break
        case "error":
          finished = true
          setLive(null)
          setFatal(event.error)
          break
      }
    })
    if (!finished) setLive(null)
  }

  // --------------------------------------------------------------- states
  if (loadError) {
    return (
      <div className="px-5 py-10 text-center">
        <p className="text-sm text-muted-foreground">{loadError}</p>
        <Button size="sm" variant="outline" className="mt-3" onClick={() => { setLoadError(null); setAttempt((n) => n + 1) }}>
          <RotateCw /> Try again
        </Button>
      </div>
    )
  }

  if (!info) {
    return (
      <div className="flex items-center justify-center gap-2 px-5 py-10 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Loading kit…
      </div>
    )
  }

  if (live) return <Generating live={live} />

  const { kit, usage } = info
  const left = Math.max(0, usage.limit - usage.used)
  const blocker = !info.aiReady
    ? "The AI isn't set up yet. The app owner needs to add an OpenRouter key."
    : !info.hasResume
      ? null // shown as a checklist item with a link
      : left === 0
        ? usage.limit === 0
          ? "Kit generation isn't switched on for your account yet. Ask the app owner."
          : `You've used all ${usage.limit} kits for this month. Your allowance resets on the 1st.`
        : null
  const canGenerate = info.aiReady && info.hasResume && left > 0

  if (!kit) {
    return (
      <div className="space-y-4 px-5 py-5">
        {fatal && <ErrorBox text={fatal} />}
        <div className="rounded-xl border bg-gradient-to-br from-indigo-500/5 to-violet-500/10 p-4">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-violet-500" />
            <h3 className="font-medium">Your application kit</h3>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Written for this job, from your resume and the job description.</p>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {KIT_SECTIONS.map((s) => {
              const Icon = SECTION_ICONS[s.id]
              return (
                <li key={s.id} className="flex items-start gap-2 rounded-lg bg-background/70 p-2.5">
                  <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <span>
                    <span className="block text-sm font-medium">{s.label}</span>
                    <span className="block text-xs text-muted-foreground">{SECTION_BLURBS[s.id]}</span>
                  </span>
                </li>
              )
            })}
          </ul>
        </div>

        <ul className="space-y-2 text-sm">
          <ChecklistItem ok={info.hasResume}>
            {info.hasResume ? (
              "Resume uploaded"
            ) : (
              <>
                Upload your resume first, in{" "}
                <Link href="/settings" className="font-medium underline underline-offset-2">
                  Settings
                </Link>
              </>
            )}
          </ChecklistItem>
          <ChecklistItem ok={info.hasDescription} warnOnly>
            {info.hasDescription
              ? "Job description saved"
              : "No job description saved. The kit will be more generic. Add one in the Details tab for better results."}
          </ChecklistItem>
        </ul>

        {blocker && <ErrorBox text={blocker} tone="warning" />}

        <div className="flex flex-wrap items-center gap-3">
          <Button size="lg" onClick={() => run(false)} disabled={!canGenerate}>
            <Sparkles /> Generate kit
          </Button>
          <p className="text-xs text-muted-foreground">
            Takes about a minute · {left} of {usage.limit} kits left this month
          </p>
        </div>
      </div>
    )
  }

  const missing = missingSections(kit)

  return (
    <div className="space-y-4 px-5 py-5">
      {fatal && <ErrorBox text={fatal} />}

      <div className="flex flex-wrap items-center gap-2">
        <p className="mr-auto text-xs text-muted-foreground" suppressHydrationWarning>
          Generated {formatDate(kit.generated_at)} · {left} of {usage.limit} kits left this month
        </p>
        <ExportMenu
          label="Download kit"
          build={() => ({
            fileName: safeFileName("Application kit", job.company, job.title),
            title: `Application kit: ${job.title}`,
            subtitle: job.company,
            parts: KIT_SECTIONS.filter((s) => kit[s.id]?.trim()).map((s) => ({
              heading: s.label,
              text: kit[s.id] ?? "",
              sources: s.id === "company_brief" ? kit.sources : undefined,
            })),
          })}
        />
        <Button size="sm" variant="ghost" onClick={() => setConfirmRegenerate(true)} disabled={!canGenerate}>
          <RefreshCw /> Regenerate
        </Button>
      </div>

      {missing.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-800 dark:text-amber-300">
          <AlertTriangle className="size-4 shrink-0" />
          <span className="flex-1">
            {missing.map((id) => KIT_SECTIONS.find((s) => s.id === id)?.label).join(", ")} couldn&apos;t be written.
            Trying again doesn&apos;t use another kit.
          </span>
          <Button size="sm" variant="outline" onClick={() => run(true)} disabled={!info.aiReady}>
            <RotateCw /> Try again
          </Button>
        </div>
      )}

      <div role="tablist" aria-label="Kit sections" className="flex flex-wrap gap-1.5">
        {KIT_SECTIONS.map((s) => {
          const Icon = SECTION_ICONS[s.id]
          const empty = !kit[s.id]?.trim()
          return (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={active === s.id}
              onClick={() => setActive(s.id)}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                active === s.id ? "border-foreground/15 bg-foreground text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                empty && active !== s.id && "opacity-60"
              )}
            >
              <Icon className="size-3.5" />
              {s.label}
            </button>
          )
        })}
      </div>

      <SectionView
        key={active}
        section={active}
        kit={kit}
        job={job}
        onSave={async (text) => {
          const result = await actions.saveKitSection(job.id, active, text)
          if (!result.ok) {
            toast.error(result.error)
            return false
          }
          setInfo((prev) => (prev ? { ...prev, kit: result.data } : prev))
          toast.success("Saved")
          return true
        }}
      />

      <AlertDialog open={confirmRegenerate} onOpenChange={setConfirmRegenerate}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Write a new kit?</AlertDialogTitle>
            <AlertDialogDescription>
              This replaces all four parts, including any edits you&apos;ve made, and uses 1 of your {left} remaining
              kits this month.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep this kit</AlertDialogCancel>
            <AlertDialogAction onClick={() => run(false)}>
              <Sparkles /> Write a new kit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ---------------------------------------------------------------------------
function Generating({ live }: { live: Partial<Record<KitSectionId, LiveSection>> }) {
  const sections = KIT_SECTIONS.filter((s) => live[s.id])
  const doneCount = sections.filter((s) => live[s.id]?.status !== "writing").length

  return (
    <div className="space-y-3 px-5 py-5">
      <div className="flex items-center gap-2 text-sm">
        <Loader2 className="size-4 animate-spin text-violet-500" />
        <span className="font-medium">Writing your kit…</span>
        <span className="text-muted-foreground">
          {sections.length ? `${doneCount} of ${sections.length} done` : "starting"}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        This takes about a minute. You can close this panel; the kit will still be saved.
      </p>
      {sections.map((s) => (
        <LiveCard key={s.id} label={s.label} section={live[s.id]!} />
      ))}
    </div>
  )
}

function LiveCard({ label, section }: { label: string; section: LiveSection }) {
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (box.current) box.current.scrollTop = box.current.scrollHeight
  }, [section.text])

  return (
    <div className="rounded-lg border">
      <div className="flex items-center gap-2 border-b px-3 py-2 text-sm">
        {section.status === "writing" && <Loader2 className="size-3.5 animate-spin text-muted-foreground" />}
        {section.status === "done" && <CheckCircle2 className="size-3.5 text-emerald-500" />}
        {section.status === "error" && <XCircle className="size-3.5 text-destructive" />}
        <span className="font-medium">{label}</span>
        <span className="ml-auto text-xs text-muted-foreground">
          {section.status === "writing" ? (section.text ? "Writing…" : "Researching…") : section.status === "done" ? "Done" : section.error}
        </span>
      </div>
      {section.text && (
        <div ref={box} className="max-h-40 overflow-y-auto px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap text-muted-foreground">
          {section.text}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
function SectionView({
  section,
  kit,
  job,
  onSave,
}: {
  section: KitSectionId
  kit: Kit
  job: Job
  onSave: (text: string) => Promise<boolean>
}) {
  const meta = KIT_SECTIONS.find((s) => s.id === section)!
  const text = kit[section] ?? ""
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(text)
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const sources = section === "company_brief" ? kit.sources : []

  if (!text.trim() && !editing) {
    return (
      <div className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
        This part couldn&apos;t be written. Use <span className="font-medium">Try again</span> above.
      </div>
    )
  }

  return (
    <div className="rounded-xl border">
      <div className="flex flex-wrap items-center gap-1.5 border-b px-3 py-2">
        <h3 className="mr-auto text-sm font-medium">{meta.label}</h3>
        {!editing && (
          <>
            <Button
              size="sm"
              variant="ghost"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(toPlainText(text))
                  setCopied(true)
                  setTimeout(() => setCopied(false), 1500)
                } catch {
                  toast.error("Couldn't copy. Select the text and copy it instead.")
                }
              }}
            >
              {copied ? <Check /> : <Copy />}
              {copied ? "Copied" : "Copy"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setDraft(text); setEditing(true) }}>
              <Pencil /> Edit
            </Button>
            <ExportMenu
              label="Download"
              size="sm"
              build={() => ({
                fileName: safeFileName(meta.fileLabel, job.company, job.title),
                // A cover letter is downloaded as just the letter.
                title: section === "cover_letter" ? undefined : `${meta.label}: ${job.title}`,
                subtitle: section === "cover_letter" ? undefined : job.company,
                parts: [{ text, sources }],
              })}
            />
          </>
        )}
      </div>

      {editing ? (
        <form
          className="space-y-2 p-3"
          onSubmit={async (e) => {
            e.preventDefault()
            setSaving(true)
            const ok = await onSave(draft)
            setSaving(false)
            if (ok) setEditing(false)
          }}
        >
          <Textarea
            aria-label={`Edit ${meta.label}`}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={KIT_SECTION_LIMITS[section]}
            className="max-h-[65vh] min-h-80 resize-y text-sm leading-relaxed"
            autoFocus
          />
          <p className="text-xs text-muted-foreground">
            Tip: start a line with &quot;# &quot; for a heading or &quot;- &quot; for a bullet point.
          </p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={saving || draft.trim() === text.trim()}>
              {saving && <Loader2 className="animate-spin" />}
              Save changes
            </Button>
          </div>
        </form>
      ) : (
        <div className="px-4 py-4">
          <KitText text={text} />
          {sources.length > 0 && (
            <div className="mt-5 border-t pt-3">
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">Sources</p>
              <ul className="space-y-1 text-xs">
                {sources.map((s) => (
                  <li key={s.url} className="truncate">
                    <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground hover:underline">
                      {s.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
function ExportMenu({ label, build, size = "sm" }: { label: string; build: () => ExportDoc; size?: "sm" | "default" }) {
  const [busy, setBusy] = useState(false)
  async function go(kind: "docx" | "pdf") {
    setBusy(true)
    try {
      const doc = build()
      if (kind === "docx") await downloadDocx(doc)
      else await downloadPdf(doc)
    } catch (err) {
      console.error("export:", err)
      toast.error("Couldn't create the file. Please try again.")
    } finally {
      setBusy(false)
    }
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button size={size} variant="outline" disabled={busy} />}>
        {busy ? <Loader2 className="animate-spin" /> : <Download />}
        {label}
        <ChevronDown />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onClick={() => go("docx")}>
          <FileText /> Word (.docx)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => go("pdf")}>
          <FileText /> PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function ChecklistItem({ ok, warnOnly, children }: { ok: boolean; warnOnly?: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      {ok ? (
        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" />
      ) : warnOnly ? (
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-500" />
      ) : (
        <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
      )}
      <span className={cn(!ok && "text-muted-foreground")}>{children}</span>
    </li>
  )
}

function ErrorBox({ text, tone = "error" }: { text: string; tone?: "error" | "warning" }) {
  return (
    <p
      role="alert"
      className={cn(
        "rounded-lg border px-3 py-2 text-sm",
        tone === "error"
          ? "border-destructive/30 bg-destructive/10 text-destructive"
          : "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300"
      )}
    >
      {text}
    </p>
  )
}
